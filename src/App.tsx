import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import "./App.css";
import BookBar from "./BookBar";
import History from "./History";
import Login from "./Login";
import Password from "./Password";
import { IconChevron, IconClose, IconPlus, IconRepeat, IconTrash } from "./icons";
import {
  createBook,
  createPot,
  createRecurring,
  createTx,
  deleteTx,
  friendlyError,
  joinBook,
  listBooks,
  updateRecurring,
} from "./lib/api";
import { classifySection, classifyVariableCategory, shouldRepeat } from "./lib/classify";
import {
  currentMonth,
  formatEUR,
  formatOut,
  moneyDate,
  monthLabel,
  parseAmount,
  shiftMonth,
  today,
} from "./lib/format";
import { dismissLocalStore, pendingLocalStore, uploadLocalStore } from "./lib/migrate";
import { currentUser, pb, type AuthUser } from "./lib/pb";
import { potTotals } from "./lib/summary";
import type { Book, Kind, Section, Tx } from "./lib/types";
import { KIND_SECTION, SECTION_LABEL, VARIABLE_CATS } from "./lib/types";
import { useBookStore } from "./lib/useBookStore";

type FormKind = Kind;

const BOOK_KEY = "moneymanager.libro";

const emptyForm = {
  kind: "expense" as FormKind,
  amount: "",
  note: "",
  date: today(),
  section: "variable" as Section,
  category: "Otros",
  repeat: false,
  potId: "",
  newPotName: "",
  newPotTarget: "",
};

function sum(rows: Tx[]) {
  return rows.reduce((s, t) => s + t.amount, 0);
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(currentUser);

  useEffect(() => pb.authStore.onChange(() => setUser(currentUser())), []);

  if (!user) return <Login onIn={() => setUser(currentUser())} />;
  return <Money user={user} />;
}

function Money({ user }: { user: AuthUser }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState(() => localStorage.getItem(BOOK_KEY) || "");
  const [booting, setBooting] = useState(true);
  const [month, setMonth] = useState(currentMonth);
  const [form, setForm] = useState(emptyForm);
  const [potOpen, setPotOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [legacy, setLegacy] = useState(pendingLocalStore);
  const [pwOpen, setPwOpen] = useState(false);

  const { store, setStore, loading, error, setError } = useBookStore(bookId || null, month);

  // Al entrar: los libros a los que tengo acceso. Si no hay ninguno, el
  // personal se crea solo para no recibir a nadie con una pantalla vacía.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let list = await listBooks();
        if (list.length === 0) list = [await createBook("Mis cuentas")];
        if (!alive) return;
        setBooks(list);
        setBookId((prev) => (list.some((b) => b.id === prev) ? prev : list[0].id));
      } catch (err) {
        if (alive) setError(friendlyError(err));
      } finally {
        if (alive) setBooting(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [setError]);

  useEffect(() => {
    if (bookId) localStorage.setItem(BOOK_KEY, bookId);
  }, [bookId]);

  useEffect(() => {
    setForm((prev) => {
      if (prev.date.startsWith(month)) return prev;
      const day = month === currentMonth() ? today().slice(8) : "01";
      return { ...prev, date: `${month}-${day}` };
    });
  }, [month]);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | null> => {
      setBusy(true);
      setError(null);
      try {
        return await fn();
      } catch (err) {
        setError(friendlyError(err));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [setError],
  );

  const monthTxs = useMemo(
    () =>
      store.txs
        .filter((t) => t.date.startsWith(month))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [store.txs, month],
  );

  const incomes = monthTxs.filter((t) => t.kind === "income");
  const fijos = monthTxs.filter((t) => t.kind === "expense" && t.section === "fijo");
  const subs = monthTxs.filter((t) => t.kind === "expense" && t.section === "suscripcion");
  const variables = monthTxs.filter((t) => t.kind === "expense" && t.section === "variable");
  const savings = monthTxs.filter((t) => t.kind === "saving");

  const income = sum(incomes);
  const fijoTotal = sum(fijos);
  const subTotal = sum(subs);
  const variableTotal = sum(variables);
  const savingTotal = sum(savings);
  const afterFixed = income - fijoTotal - subTotal;
  const leftover = afterFixed - variableTotal - savingTotal;
  const spent = fijoTotal + subTotal + variableTotal;

  const pots = useMemo(() => potTotals(store.txs), [store.txs]);
  const book = books.find((b) => b.id === bookId);
  const shared = (book?.memberIds.length || 0) > 1;

  function patchForm(partial: Partial<typeof emptyForm>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function onNote(note: string) {
    if (form.kind === "expense") {
      const section = classifySection(note, form.category);
      const category = section === "variable" ? classifyVariableCategory(note) : form.category;
      patchForm({ note, section, category, repeat: shouldRepeat(section, "expense") });
      return;
    }
    patchForm({ note });
  }

  function onKind(kind: FormKind) {
    patchForm({
      kind,
      section: kind === "saving" ? "ahorro" : "variable",
      repeat: kind === "income",
      category: kind === "expense" ? "Otros" : "Nómina",
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!bookId) return;
    const amount = parseAmount(form.amount);
    if (amount == null) return;

    await run(async () => {
      let potId = form.potId || undefined;
      if (form.kind === "saving") {
        const newName = form.newPotName.trim();
        if (newName) {
          const pot = await createPot(bookId, newName, parseAmount(form.newPotTarget) || 0);
          potId = pot.id;
          setStore((prev) => ({ ...prev, pots: [...prev.pots, pot] }));
        }
        if (!potId) return null;
      }

      const section: Section =
        form.kind === "saving"
          ? "ahorro"
          : form.kind === "income"
            ? KIND_SECTION.income
            : form.section;
      const note = form.note.trim() || (form.kind === "income" ? "Ingreso" : SECTION_LABEL[section]);
      const category = form.kind === "expense" && section === "variable" ? form.category : note;

      let recurringId: string | undefined;
      if (form.repeat && form.kind !== "saving") {
        const rule = await createRecurring(bookId, {
          kind: form.kind,
          section,
          name: note,
          amount,
          day: Number(form.date.slice(8, 10)),
          startMonth: form.date.slice(0, 7),
          active: true,
          skippedMonths: [],
          potId,
        });
        recurringId = rule.id;
        setStore((prev) => ({ ...prev, recurrings: [rule, ...prev.recurrings] }));
      }

      const tx = await createTx(bookId, {
        kind: form.kind,
        amount,
        section,
        category,
        note,
        date: form.date,
        recurringId,
        potId,
      });
      setStore((prev) => ({ ...prev, txs: [tx, ...prev.txs] }));

      setForm({
        ...emptyForm,
        kind: form.kind,
        section: form.kind === "expense" ? "variable" : form.section,
        date: form.date.startsWith(month) ? form.date : `${month}-01`,
        potId: potId || "",
      });
      setPotOpen(false);
      return tx;
    });
  }

  async function removeTx(tx: Tx) {
    await run(async () => {
      await deleteTx(tx.id);
      setStore((prev) => ({ ...prev, txs: prev.txs.filter((row) => row.id !== tx.id) }));
      // Si venía de un recurrente, marcamos el mes como saltado: si no, al
      // volver a abrir el mes se volvería a crear solo.
      const rule = store.recurrings.find((r) => r.id === tx.recurringId);
      if (rule) {
        const updated = await updateRecurring(rule.id, {
          skippedMonths: [...new Set([...rule.skippedMonths, month])],
        });
        setStore((prev) => ({
          ...prev,
          recurrings: prev.recurrings.map((r) => (r.id === updated.id ? updated : r)),
        }));
      }
      return true;
    });
  }

  async function haltRecurring(ruleId: string) {
    await run(async () => {
      const updated = await updateRecurring(ruleId, { active: false });
      setStore((prev) => ({
        ...prev,
        recurrings: prev.recurrings.map((r) => (r.id === updated.id ? updated : r)),
      }));
      return true;
    });
  }

  async function newPot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!bookId) return;
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    const target = parseAmount(String(data.get("target") || "")) || 0;
    e.currentTarget.reset();
    await run(async () => {
      const pot = await createPot(bookId, name, target);
      setStore((prev) => ({ ...prev, pots: [...prev.pots, pot] }));
      patchForm({ potId: pot.id, kind: "saving", section: "ahorro" });
      return pot;
    });
  }

  async function uploadLegacy() {
    if (!legacy || !bookId) return;
    const count = await run(() => uploadLocalStore(bookId, legacy));
    if (count != null) {
      setLegacy(null);
      window.location.reload();
    }
  }

  if (booting) {
    return (
      <div className="gate">
        <p className="loading">Abriendo tus cuentas…</p>
      </div>
    );
  }

  const leftoverClass = leftover >= 0 ? "pos" : "neg";
  const activeRecurring = store.recurrings.filter((rule) => rule.active).map((rule) => rule.id);

  return (
    <div className="shell">
      <header className="top">
        <div>
          <h1>Money</h1>
          <p className="lede">
            Lo que cobras, lo que se repite solo y lo que apartas.
            {shared ? " Este libro lo lleváis entre varios." : ""}
          </p>
        </div>
        <div className="top-right">
          <div className="month-nav" role="group" aria-label="Mes">
            <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior">
              <IconChevron dir="left" />
            </button>
            <span>{monthLabel(month)}</span>
            <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mes siguiente">
              <IconChevron dir="right" />
            </button>
          </div>
          <div className="who">
            <span>{user.name}</span>
            <button type="button" className="text-btn" onClick={() => setPwOpen(!pwOpen)}>
              Contraseña
            </button>
            <button type="button" className="text-btn" onClick={() => pb.authStore.clear()}>
              Salir
            </button>
          </div>
        </div>
      </header>

      <BookBar
        books={books}
        bookId={bookId}
        meId={user.id}
        onPick={setBookId}
        onCreate={async (name) => {
          const created = await run(() => createBook(name));
          if (created) {
            setBooks((prev) => [...prev, created]);
            setBookId(created.id);
          }
        }}
        onJoin={async (code) => {
          const entrado = await run(() => joinBook(code));
          if (!entrado) return false;
          setBooks((prev) =>
            prev.some((b) => b.id === entrado.id)
              ? prev.map((b) => (b.id === entrado.id ? entrado : b))
              : [...prev, entrado],
          );
          setBookId(entrado.id);
          return true;
        }}
        onBookChange={(updated) =>
          setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
        }
        onError={setError}
      />

      {pwOpen && (
        <div className="bookbar">
          <Password userId={user.id} onClose={() => setPwOpen(false)} />
        </div>
      )}

      {error && (
        <p className="banner error" role="status">
          {error}
        </p>
      )}

      {legacy && (
        <div className="banner">
          <span>
            Hay {legacy.txs.length} movimientos guardados solo en este navegador.
            {book ? ` ¿Los subo a «${book.name}»?` : ""}
          </span>
          <span className="banner-actions">
            <button type="button" className="ghost small" onClick={uploadLegacy} disabled={busy}>
              Subirlos
            </button>
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                dismissLocalStore();
                setLegacy(null);
              }}
            >
              No hace falta
            </button>
          </span>
        </div>
      )}

      {loading ? (
        <p className="loading">Cargando el libro…</p>
      ) : (
        <>
          <div className="stage">
            <section className="ledger" aria-label="Resumen del mes">
              <p className="ledger-kicker">Después de fijos y suscripciones</p>
              <p className={`ledger-hero ${afterFixed >= 0 ? "pos" : "neg"}`}>{formatEUR(afterFixed)}</p>
              <p className="ledger-sub">
                {income > 0
                  ? `de ${formatEUR(income)} cobrados este mes`
                  : "Añade lo que cobras para ver qué te queda"}
              </p>

              <ul className="ledger-rows">
                <li>
                  <span>Ingresos</span>
                  <em className="pos">{formatEUR(income)}</em>
                </li>
                <li>
                  <span>Fijos</span>
                  <em className="neg">{formatOut(fijoTotal)}</em>
                </li>
                <li>
                  <span>Suscripciones</span>
                  <em className="neg">{formatOut(subTotal)}</em>
                </li>
                <li className="rule">
                  <span>Variables</span>
                  <em className="neg">{formatOut(variableTotal)}</em>
                </li>
                <li>
                  <span>Ahorro</span>
                  <em>{formatOut(savingTotal)}</em>
                </li>
                <li className="total">
                  <span>Queda</span>
                  <em className={leftoverClass}>{formatEUR(leftover)}</em>
                </li>
              </ul>
            </section>

            <form className="composer" onSubmit={submit}>
              <div className="seg" role="tablist" aria-label="Tipo">
                {(
                  [
                    ["expense", "Gasto"],
                    ["income", "Ingreso"],
                    ["saving", "Ahorro"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={form.kind === value}
                    className={form.kind === value ? "on" : ""}
                    onClick={() => onKind(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label>
                {form.kind === "income" ? "Qué cobras" : form.kind === "saving" ? "Nota" : "Qué es"}
                <input
                  value={form.note}
                  onChange={(e) => onNote(e.target.value)}
                  placeholder={
                    form.kind === "income"
                      ? "Nómina, extra…"
                      : form.kind === "saving"
                        ? "Opcional"
                        : "Coche, Netflix, Mercadona…"
                  }
                  maxLength={80}
                />
              </label>

              <div className="pair">
                <label>
                  Importe
                  <input
                    inputMode="decimal"
                    placeholder="0,00"
                    value={form.amount}
                    onChange={(e) => patchForm({ amount: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Fecha
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => patchForm({ date: e.target.value })}
                    required
                  />
                </label>
              </div>

              {form.kind === "expense" && (
                <>
                  <fieldset className="chips">
                    <legend>Sección</legend>
                    {(
                      [
                        ["fijo", "Fijo"],
                        ["suscripcion", "Suscripción"],
                        ["variable", "Variable"],
                      ] as const
                    ).map(([value, label]) => (
                      <label key={value} className={form.section === value ? "on" : ""}>
                        <input
                          type="radio"
                          name="section"
                          value={value}
                          checked={form.section === value}
                          onChange={() =>
                            patchForm({ section: value, repeat: shouldRepeat(value, "expense") })
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </fieldset>

                  {form.section === "variable" && (
                    <label>
                      Categoría
                      <select
                        value={form.category}
                        onChange={(e) => patchForm({ category: e.target.value })}
                      >
                        {VARIABLE_CATS.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </>
              )}

              {form.kind === "saving" && (
                <div className="pot-pick">
                  <label>
                    Bote
                    <select
                      value={form.potId}
                      onChange={(e) => {
                        if (e.target.value === "__new") {
                          setPotOpen(true);
                          patchForm({ potId: "" });
                          return;
                        }
                        setPotOpen(false);
                        patchForm({ potId: e.target.value, newPotName: "" });
                      }}
                      required={!potOpen && !form.newPotName}
                    >
                      <option value="">Elige un bote</option>
                      {store.pots.map((pot) => (
                        <option key={pot.id} value={pot.id}>
                          {pot.name}
                        </option>
                      ))}
                      <option value="__new">Nuevo bote…</option>
                    </select>
                  </label>
                  {potOpen && (
                    <div className="pair">
                      <label>
                        Nombre
                        <input
                          value={form.newPotName}
                          onChange={(e) => patchForm({ newPotName: e.target.value })}
                          placeholder="Emergencia, viaje…"
                          required
                        />
                      </label>
                      <label>
                        Meta (opcional)
                        <input
                          inputMode="decimal"
                          value={form.newPotTarget}
                          onChange={(e) => patchForm({ newPotTarget: e.target.value })}
                          placeholder="1.000"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {form.kind !== "saving" && (
                <label className="check">
                  <input
                    type="checkbox"
                    checked={form.repeat}
                    onChange={(e) => patchForm({ repeat: e.target.checked })}
                  />
                  Repetir cada mes
                </label>
              )}

              <button type="submit" className="primary" disabled={busy}>
                {busy ? "Guardando…" : form.kind === "saving" ? "Apartar" : "Guardar"}
              </button>
            </form>
          </div>

          <div className="sections">
            <SectionList
              title="Fijos"
              hint="Coche, móvil, alquiler. Pasan al mes siguiente."
              rows={fijos}
              empty="Aún no hay fijos este mes."
              activeRecurring={activeRecurring}
              shared={shared}
              onRemove={removeTx}
              onStop={haltRecurring}
            />
            <SectionList
              title="Suscripciones"
              hint="Netflix, Spotify y el resto de cuotas."
              rows={subs}
              empty="Ninguna suscripción este mes."
              activeRecurring={activeRecurring}
              shared={shared}
              onRemove={removeTx}
              onStop={haltRecurring}
            />
            <SectionList
              title="Variables"
              hint="Lo que cambia: comida, ocio, imprevistos."
              rows={variables}
              empty="Sin gastos variables."
              activeRecurring={activeRecurring}
              shared={shared}
              onRemove={removeTx}
              onStop={haltRecurring}
            />
          </div>

          <History txs={store.txs} onPickMonth={setMonth} />

          <section className="pots">
            <div className="pots-head">
              <div>
                <h2>Ahorro</h2>
                <p>Botes que van creciendo mes a mes. Este mes: {formatEUR(savingTotal)}.</p>
              </div>
            </div>
            {store.pots.length === 0 ? (
              <form className="new-pot" onSubmit={newPot}>
                <p>Crea el primero: emergencia, viaje, entrada del piso…</p>
                <div className="pair">
                  <label>
                    Nombre
                    <input name="name" placeholder="Fondo de emergencia" required />
                  </label>
                  <label>
                    Meta
                    <input name="target" inputMode="decimal" placeholder="1.000" />
                  </label>
                </div>
                <button type="submit" className="ghost" disabled={busy}>
                  <IconPlus size={16} /> Crear bote
                </button>
              </form>
            ) : (
              <ul className="pot-grid">
                {store.pots.map((pot) => {
                  const saved = pots.get(pot.id) || 0;
                  const ratio = pot.target > 0 ? Math.min(1, saved / pot.target) : 0;
                  return (
                    <li key={pot.id}>
                      <div className="bar-meta">
                        <strong>{pot.name}</strong>
                        <span>
                          {formatEUR(saved)}
                          {pot.target > 0 ? ` / ${formatEUR(pot.target)}` : ""}
                        </span>
                      </div>
                      {pot.target > 0 && (
                        <div className="bar-track" aria-hidden>
                          <div className="bar-fill" style={{ width: `${ratio * 100}%` }} />
                        </div>
                      )}
                    </li>
                  );
                })}
                <li className="pot-add">
                  <form onSubmit={newPot}>
                    <label>
                      Otro bote
                      <input name="name" placeholder="Nombre" required />
                    </label>
                    <div className="pair">
                      <label>
                        Meta
                        <input name="target" inputMode="decimal" placeholder="Opcional" />
                      </label>
                      <button type="submit" className="ghost" disabled={busy}>
                        Añadir
                      </button>
                    </div>
                  </form>
                </li>
              </ul>
            )}
          </section>

          <section className="movements">
            <h2>Movimientos de {monthLabel(month)}</h2>
            {monthTxs.length === 0 ? (
              <p className="empty">
                Este mes está vacío. Apunta un ingreso o un fijo y se quedará para el siguiente.
              </p>
            ) : (
              <ul className="tx-list">
                {monthTxs.map((tx) => (
                  <li key={tx.id}>
                    <div>
                      <strong>{tx.note || tx.category}</strong>
                      <span>
                        {moneyDate(tx.date)}
                        {tx.kind === "income" ? " · Ingreso" : ` · ${SECTION_LABEL[tx.section]}`}
                        {tx.kind === "expense" && tx.section === "variable" && tx.category
                          ? ` · ${tx.category}`
                          : ""}
                        {shared && tx.createdByName ? ` · ${tx.createdByName}` : ""}
                      </span>
                    </div>
                    <div className="tx-right">
                      {tx.recurringId && (
                        <span className="badge">
                          <IconRepeat size={13} /> cada mes
                        </span>
                      )}
                      <em className={tx.kind === "income" ? "pos" : "neg"}>
                        {tx.kind === "income" ? "+" : "−"}
                        {formatEUR(tx.amount)}
                      </em>
                      {tx.recurringId && activeRecurring.includes(tx.recurringId) && (
                        <button
                          type="button"
                          className="text-btn"
                          onClick={() => haltRecurring(tx.recurringId!)}
                        >
                          Dejar de repetir
                        </button>
                      )}
                      <button type="button" aria-label="Eliminar" onClick={() => removeTx(tx)}>
                        <IconTrash size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {spent > 0 && <p className="footnote">Gastado este mes: {formatEUR(spent)}.</p>}
          </section>
        </>
      )}

      <footer>
        <p>JaviStudio · money.javistudio.dev</p>
      </footer>
    </div>
  );
}

function SectionList({
  title,
  hint,
  rows,
  empty,
  activeRecurring,
  shared,
  onRemove,
  onStop,
}: {
  title: string;
  hint: string;
  rows: Tx[];
  empty: string;
  activeRecurring: string[];
  shared: boolean;
  onRemove: (tx: Tx) => void;
  onStop: (id: string) => void;
}) {
  return (
    <section>
      <h2>{title}</h2>
      <p className="hint">{hint}</p>
      {rows.length === 0 ? (
        <p className="empty">{empty}</p>
      ) : (
        <ul className="mini-list">
          {rows.map((tx) => (
            <li key={tx.id}>
              <div>
                <strong>{tx.note || tx.category}</strong>
                {tx.recurringId && (
                  <span className="badge">
                    <IconRepeat size={12} /> mes a mes
                  </span>
                )}
                {shared && tx.createdByName && <span className="by">{tx.createdByName}</span>}
              </div>
              <div className="tx-right">
                <em className="neg">{formatOut(tx.amount)}</em>
                {tx.recurringId && activeRecurring.includes(tx.recurringId) && (
                  <button
                    type="button"
                    className="icon-btn"
                    title="Dejar de repetir"
                    aria-label="Dejar de repetir"
                    onClick={() => {
                      if (tx.recurringId) onStop(tx.recurringId);
                    }}
                  >
                    <IconClose size={14} />
                  </button>
                )}
                <button type="button" className="icon-btn" aria-label="Eliminar" onClick={() => onRemove(tx)}>
                  <IconTrash size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

