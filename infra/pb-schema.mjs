/**
 * Esquema de PocketBase para Money.
 *
 * Idempotente: crea las colecciones si no existen y actualiza campos y reglas
 * si ya estaban. Se ejecuta a mano contra la instancia, nunca desde CI:
 *
 *   PB_URL=https://api-money.javistudio.dev \
 *   PB_ADMIN_EMAIL=... PB_ADMIN_PASSWORD=... \
 *   node infra/pb-schema.mjs
 *
 * Modelo: todo cuelga de un "libro" (books). Un libro puede tener un miembro
 * (cuenta individual) o varios (cuentas compartidas). Las reglas de acceso
 * siempre comprueban que quien pide es miembro del libro.
 */

const PB_URL = (process.env.PB_URL || "https://api-money.javistudio.dev").replace(/\/$/, "");
const EMAIL = process.env.PB_ADMIN_EMAIL;
const PASSWORD = process.env.PB_ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Faltan PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD");
  process.exit(1);
}

let token = "";

async function api(path, init = {}) {
  const res = await fetch(`${PB_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: token } : {}),
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${init.method || "GET"} ${path} → ${res.status}\n${JSON.stringify(body, null, 2)}`);
  }
  return body;
}

const idField = {
  name: "id",
  type: "text",
  system: true,
  required: true,
  primaryKey: true,
  min: 15,
  max: 15,
  pattern: "^[a-z0-9]+$",
  autogeneratePattern: "[a-z0-9]{15}",
};

const stamps = [
  { name: "created", type: "autodate", onCreate: true, onUpdate: false },
  { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
];

const rel = (name, collectionId, opts = {}) => ({
  name,
  type: "relation",
  collectionId,
  cascadeDelete: opts.cascadeDelete ?? false,
  maxSelect: opts.multiple ? (opts.maxSelect ?? 20) : 1,
  minSelect: opts.multiple && opts.required ? 1 : 0,
  required: opts.required ?? false,
});

const KINDS = ["income", "expense", "saving"];
const SECTIONS = ["fijo", "suscripcion", "variable", "ahorro"];

async function upsert(def) {
  const existing = await api(`/api/collections`).then((r) =>
    r.items.find((c) => c.name === def.name),
  );
  if (!existing) {
    const created = await api(`/api/collections`, {
      method: "POST",
      body: JSON.stringify(def),
    });
    console.log(`+ creada  ${def.name}`);
    return created;
  }
  // Conservamos los ids de los campos que ya existen: si se mandan sin id,
  // PocketBase los trata como campos nuevos y borra los datos de la columna.
  const fields = def.fields.map((field) => {
    const prev = existing.fields.find((f) => f.name === field.name);
    return prev ? { ...field, id: prev.id } : field;
  });
  const updated = await api(`/api/collections/${existing.id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...def, fields }),
  });
  console.log(`~ actualizada ${def.name}`);
  return updated;
}

const auth = await api(`/api/collections/_superusers/auth-with-password`, {
  method: "POST",
  body: JSON.stringify({ identity: EMAIL, password: PASSWORD }),
});
token = auth.token;

const collections = await api(`/api/collections`);
const usersId = collections.items.find((c) => c.name === "users")?.id;
if (!usersId) throw new Error("No existe la colección de usuarios");

// Registro cerrado: las cuentas las crea el superusuario desde el panel.
// Cada usuario puede ver y editar su propia ficha, y ver el nombre de los
// demás para saber quién apuntó cada gasto en un libro compartido.
await api(`/api/collections/${usersId}`, {
  method: "PATCH",
  body: JSON.stringify({
    createRule: null,
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    updateRule: "id = @request.auth.id",
    deleteRule: null,
  }),
});
console.log("~ actualizada users (registro cerrado)");

const isMember = "book.members.id ?= @request.auth.id";

const books = await upsert({
  name: "books",
  type: "base",
  fields: [
    idField,
    { name: "name", type: "text", required: true, max: 60 },
    rel("owner", usersId, { required: true }),
    rel("members", usersId, { required: true, multiple: true }),
    ...stamps,
  ],
  indexes: [],
  listRule: "members.id ?= @request.auth.id",
  viewRule: "members.id ?= @request.auth.id",
  createRule: '@request.auth.id != "" && @request.body.owner = @request.auth.id',
  // Solo el dueño renombra el libro o cambia quién entra.
  updateRule: "owner.id = @request.auth.id",
  deleteRule: "owner.id = @request.auth.id",
});

const pots = await upsert({
  name: "pots",
  type: "base",
  fields: [
    idField,
    rel("book", books.id, { required: true, cascadeDelete: true }),
    { name: "name", type: "text", required: true, max: 60 },
    { name: "target", type: "number", min: 0 },
    ...stamps,
  ],
  indexes: ["CREATE INDEX `idx_pots_book` ON `pots` (`book`)"],
  listRule: isMember,
  viewRule: isMember,
  createRule: isMember,
  updateRule: isMember,
  deleteRule: isMember,
});

const recurrings = await upsert({
  name: "recurrings",
  type: "base",
  fields: [
    idField,
    rel("book", books.id, { required: true, cascadeDelete: true }),
    { name: "kind", type: "select", required: true, maxSelect: 1, values: KINDS },
    { name: "section", type: "select", required: true, maxSelect: 1, values: SECTIONS },
    { name: "name", type: "text", required: true, max: 80 },
    { name: "amount", type: "number", required: true, min: 0 },
    { name: "day", type: "number", required: true, min: 1, max: 31, onlyInt: true },
    { name: "startMonth", type: "text", required: true, max: 7 },
    { name: "active", type: "bool" },
    { name: "skippedMonths", type: "json", maxSize: 20000 },
    rel("pot", pots.id, { cascadeDelete: false }),
    rel("createdBy", usersId),
    ...stamps,
  ],
  indexes: ["CREATE INDEX `idx_recurrings_book` ON `recurrings` (`book`)"],
  listRule: isMember,
  viewRule: isMember,
  createRule: isMember,
  updateRule: isMember,
  deleteRule: isMember,
});

await upsert({
  name: "txs",
  type: "base",
  fields: [
    idField,
    rel("book", books.id, { required: true, cascadeDelete: true }),
    { name: "kind", type: "select", required: true, maxSelect: 1, values: KINDS },
    { name: "amount", type: "number", required: true, min: 0 },
    { name: "section", type: "select", required: true, maxSelect: 1, values: SECTIONS },
    { name: "category", type: "text", max: 80 },
    { name: "note", type: "text", max: 120 },
    // "YYYY-MM-DD" como texto: el mes se filtra por prefijo y no hay líos de
    // zona horaria como con el tipo date de PocketBase.
    { name: "date", type: "text", required: true, min: 10, max: 10, pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    // Mes al que pertenece el movimiento ("YYYY-MM"): filtra el mes sin LIKE y
    // sostiene el índice único de abajo.
    { name: "monthKey", type: "text", required: true, min: 7, max: 7, pattern: "^\\d{4}-\\d{2}$" },
    rel("recurring", recurrings.id, { cascadeDelete: false }),
    rel("pot", pots.id, { cascadeDelete: false }),
    rel("createdBy", usersId),
    ...stamps,
  ],
  indexes: [
    "CREATE INDEX `idx_txs_book_month` ON `txs` (`book`, `monthKey`)",
    // Una regla recurrente solo puede materializarse una vez por mes. Sin esto,
    // si Pablo y yo abrimos el mismo mes a la vez, cada dispositivo crearía su
    // copia del recibo de la luz.
    "CREATE UNIQUE INDEX `idx_txs_recurring_month` ON `txs` (`recurring`, `monthKey`) WHERE `recurring` != ''",
  ],
  listRule: isMember,
  viewRule: isMember,
  createRule: isMember,
  updateRule: isMember,
  deleteRule: isMember,
});

console.log("\nEsquema al día.");
