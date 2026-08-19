import type { RecordModel } from "pocketbase";
import { pb } from "./pb";
import { clampDay } from "./format";
import type { Book, Kind, Recurring, SavingPot, Section, Store, Tx } from "./types";

/**
 * Todo cuelga de un libro de cuentas. Un libro con un miembro es una cuenta
 * personal; con varios, una compartida. Las reglas de PocketBase ya impiden
 * ver libros de los que no eres miembro, así que aquí solo filtramos por
 * comodidad y para no traernos de más.
 */

export const monthOf = (date: string) => date.slice(0, 7);

function toTx(record: RecordModel): Tx {
  const author = record.expand?.createdBy as RecordModel | undefined;
  return {
    id: record.id,
    kind: record.kind as Kind,
    amount: record.amount as number,
    section: record.section as Section,
    category: (record.category as string) || "",
    note: (record.note as string) || "",
    date: record.date as string,
    recurringId: (record.recurring as string) || undefined,
    potId: (record.pot as string) || undefined,
    createdById: (record.createdBy as string) || undefined,
    createdByName: author ? (author.name as string) || (author.email as string) : undefined,
  };
}

function toRecurring(record: RecordModel): Recurring {
  return {
    id: record.id,
    kind: record.kind as Kind,
    section: record.section as Section,
    name: record.name as string,
    amount: record.amount as number,
    day: record.day as number,
    startMonth: record.startMonth as string,
    active: Boolean(record.active),
    skippedMonths: Array.isArray(record.skippedMonths) ? (record.skippedMonths as string[]) : [],
    potId: (record.pot as string) || undefined,
  };
}

function toPot(record: RecordModel): SavingPot {
  return {
    id: record.id,
    name: record.name as string,
    target: (record.target as number) || 0,
  };
}

// Sin letras ni números que se confundan al dictarlos (O/0, I/1).
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function nuevoCodigo() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
}

function toBook(record: RecordModel): Book {
  const members = (record.members as string[]) || [];
  const expanded = (record.expand?.members as RecordModel[] | undefined) || [];
  const memberNames: Record<string, string> = {};
  for (const member of expanded) {
    memberNames[member.id] = (member.name as string) || (member.email as string);
  }
  return {
    id: record.id,
    name: record.name as string,
    code: (record.code as string) || "",
    ownerId: record.owner as string,
    memberIds: members,
    memberNames,
  };
}

export async function listBooks(): Promise<Book[]> {
  const records = await pb.collection("books").getFullList({
    sort: "created",
    expand: "members",
  });
  return records.map(toBook);
}

export async function createBook(name: string): Promise<Book> {
  const me = pb.authStore.record!.id;
  // El código es único: si dos libros lo sacan igual, se reintenta.
  for (let intento = 0; intento < 5; intento += 1) {
    try {
      const record = await pb.collection("books").create(
        { name, code: nuevoCodigo(), owner: me, members: [me] },
        { expand: "members" },
      );
      return toBook(record);
    } catch (error) {
      if (intento === 4 || !isCodigoRepetido(error)) throw error;
    }
  }
  throw new Error("No he podido crear el libro");
}

function isCodigoRepetido(error: unknown) {
  const data = (error as { response?: { data?: Record<string, unknown> } })?.response?.data;
  return Boolean(data && "code" in data);
}

/** Genera un código nuevo: el anterior deja de servir. */
export async function rotateCode(bookId: string): Promise<Book> {
  const record = await pb
    .collection("books")
    .update(bookId, { code: nuevoCodigo() }, { expand: "members" });
  return toBook(record);
}

/**
 * Entrar en un libro con su código. La regla del servidor solo deja leerlo y
 * meterse si se manda el código correcto en la petición, así que no hay forma
 * de ir probando ni de listar libros ajenos.
 */
export async function joinBook(rawCode: string): Promise<Book> {
  const code = rawCode.trim().toUpperCase();
  const me = pb.authStore.record!.id;

  const found = await pb.collection("books").getList(1, 1, {
    filter: pb.filter("code = {:code}", { code }),
    expand: "members",
    code,
  });
  const book = found.items[0];
  if (!book) throw new Error("codigo-no-existe");

  const members = (book.members as string[]) || [];
  if (members.includes(me)) return toBook(book);

  const updated = await pb
    .collection("books")
    .update(book.id, { members: [...members, me] }, { expand: "members", code });
  return toBook(updated);
}

export async function renameBook(bookId: string, name: string): Promise<Book> {
  const record = await pb.collection("books").update(bookId, { name }, { expand: "members" });
  return toBook(record);
}

/** Sacar a alguien de un libro. Solo el dueño, y a sí mismo no. */
export async function removeMember(book: Book, memberId: string): Promise<Book> {
  const record = await pb.collection("books").update(
    book.id,
    { members: book.memberIds.filter((id) => id !== memberId) },
    { expand: "members" },
  );
  return toBook(record);
}

export async function loadBook(bookId: string): Promise<Store> {
  const filter = pb.filter("book = {:book}", { book: bookId });
  const [txs, recurrings, pots] = await Promise.all([
    pb.collection("txs").getFullList({ filter, sort: "-date", expand: "createdBy" }),
    pb.collection("recurrings").getFullList({ filter, sort: "-created" }),
    pb.collection("pots").getFullList({ filter, sort: "created" }),
  ]);
  return {
    v: 2,
    txs: txs.map(toTx),
    recurrings: recurrings.map(toRecurring),
    pots: pots.map(toPot),
  };
}

type NewTx = Omit<Tx, "id" | "createdById" | "createdByName">;

export async function createTx(bookId: string, tx: NewTx): Promise<Tx> {
  const record = await pb.collection("txs").create(
    {
      book: bookId,
      kind: tx.kind,
      amount: tx.amount,
      section: tx.section,
      category: tx.category,
      note: tx.note,
      date: tx.date,
      monthKey: monthOf(tx.date),
      recurring: tx.recurringId || "",
      pot: tx.potId || "",
      createdBy: pb.authStore.record!.id,
    },
    { expand: "createdBy" },
  );
  return toTx(record);
}

export async function updateTx(txId: string, patch: Partial<NewTx>): Promise<Tx> {
  const body: Record<string, unknown> = {};
  if (patch.kind !== undefined) body.kind = patch.kind;
  if (patch.amount !== undefined) body.amount = patch.amount;
  if (patch.section !== undefined) body.section = patch.section;
  if (patch.category !== undefined) body.category = patch.category;
  if (patch.note !== undefined) body.note = patch.note;
  if (patch.date !== undefined) {
    body.date = patch.date;
    body.monthKey = monthOf(patch.date);
  }
  if (patch.potId !== undefined) body.pot = patch.potId || "";
  const record = await pb.collection("txs").update(txId, body, { expand: "createdBy" });
  return toTx(record);
}

export async function deleteTx(txId: string): Promise<void> {
  await pb.collection("txs").delete(txId);
}

type NewRecurring = Omit<Recurring, "id">;

export async function createRecurring(bookId: string, rule: NewRecurring): Promise<Recurring> {
  const record = await pb.collection("recurrings").create({
    book: bookId,
    kind: rule.kind,
    section: rule.section,
    name: rule.name,
    amount: rule.amount,
    day: rule.day,
    startMonth: rule.startMonth,
    active: rule.active,
    skippedMonths: rule.skippedMonths,
    pot: rule.potId || "",
    createdBy: pb.authStore.record!.id,
  });
  return toRecurring(record);
}

export async function updateRecurring(
  ruleId: string,
  patch: Partial<NewRecurring>,
): Promise<Recurring> {
  const body: Record<string, unknown> = { ...patch };
  if (patch.potId !== undefined) {
    delete body.potId;
    body.pot = patch.potId || "";
  }
  const record = await pb.collection("recurrings").update(ruleId, body);
  return toRecurring(record);
}

export async function createPot(bookId: string, name: string, target: number): Promise<SavingPot> {
  const record = await pb.collection("pots").create({ book: bookId, name, target });
  return toPot(record);
}

export async function updatePot(potId: string, patch: { name?: string; target?: number }) {
  const record = await pb.collection("pots").update(potId, patch);
  return toPot(record);
}

export async function deletePot(potId: string): Promise<void> {
  await pb.collection("pots").delete(potId);
}

/**
 * Materializa en el servidor los recurrentes que le faltan al mes. Hay un
 * índice único (recurring, monthKey) detrás: si Pablo y yo abrimos el mismo
 * mes a la vez, el segundo choca y se ignora en vez de duplicar el recibo.
 */
export async function materializeMonth(
  bookId: string,
  store: Store,
  month: string,
): Promise<Tx[]> {
  const pending = store.recurrings.filter((rule) => {
    if (!rule.active) return false;
    if (rule.startMonth > month) return false;
    if (rule.skippedMonths.includes(month)) return false;
    return !store.txs.some((tx) => tx.recurringId === rule.id && tx.date.startsWith(month));
  });

  const created: Tx[] = [];
  for (const rule of pending) {
    const day = String(clampDay(month, rule.day)).padStart(2, "0");
    try {
      created.push(
        await createTx(bookId, {
          kind: rule.kind,
          amount: rule.amount,
          section: rule.section,
          category: rule.name,
          note: rule.name,
          date: `${month}-${day}`,
          recurringId: rule.id,
          potId: rule.potId,
        }),
      );
    } catch (error) {
      // El índice único ya lo creó otro dispositivo: no es un fallo.
      if (!isDuplicate(error)) throw error;
    }
  }
  return created;
}

function isDuplicate(error: unknown) {
  const message = JSON.stringify((error as { response?: unknown })?.response ?? error);
  return message.includes("validation_not_unique") || message.includes("UNIQUE constraint");
}

export function friendlyError(error: unknown): string {
  const err = error as { status?: number; message?: string };
  if (err?.message === "codigo-no-existe") return "Ese código no vale.";
  if (err?.status === 0) return "Sin conexión con el servidor.";
  if (err?.status === 400) return "Los datos no son válidos.";
  if (err?.status === 403 || err?.status === 404) return "No tienes acceso a eso.";
  return err?.message || "Algo ha fallado.";
}
