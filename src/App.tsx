import { useEffect, useMemo, useState, type FormEvent } from "react";
import "./App.css";
import { IconChevron, IconClose, IconPlus, IconRepeat, IconTrash } from "./icons";
import { classifySection, classifyVariableCategory, shouldRepeat } from "./lib/classify";
import {
  currentMonth,
  formatEUR,
  moneyDate,
  monthLabel,
  parseAmount,
  shiftMonth,
  today,
  uid,
} from "./lib/format";
import { ensureMonth, skipMonth, stopRecurring } from "./lib/recurring";
import { loadStore, saveStore } from "./lib/storage";
import type { Kind, Recurring, SavingPot, Section, Store, Tx } from "./lib/types";
import { KIND_SECTION, SECTION_LABEL, VARIABLE_CATS } from "./lib/types";

type FormKind = Kind;

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
  const [store, setStore] = useState<Store>(() => ensureMonth(loadStore(), currentMonth()));
  const [month, setMonth] = useState(currentMonth);
  const [form, setForm] = useState(emptyForm);
  const [potOpen, setPotOpen] = useState(false);

  useEffect(() => {
    setStore((prev) => ensureMonth(prev, month));
    setForm((prev) => {
      if (prev.date.startsWith(month)) return prev;
      const day = month === currentMonth() ? today().slice(8) : "01";
      return { ...prev, date: `${month}-${day}` };
    });
  }, [month]);

  useEffect(() => {
    saveStore(store);
  }, [store]);

  const monthTxs = useMemo(
    () => store.txs.filter((t) => t.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date)),
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

  const potTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of store.txs.filter((t) => t.kind === "saving" && t.potId)) {
      map.set(tx.potId!, (map.get(tx.potId!) || 0) + tx.amount);
    }
    return map;
  }, [store.txs]);

  function patchForm(partial: Partial<typeof emptyForm>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function onNote(note: string) {
    if (form.kind === "expense") {
      const section = classifySection(note, form.category);
      const category = section === "variable" ? classifyVariableCategory(note) : form.category;
      patchForm({
        note,
        section,
        category,
        repeat: shouldRepeat(section, "expense"),
      });
      return;
    }
    patchForm({ note });
  }

  function onKind(kind: FormKind) {
    const section = kind === "saving" ? "ahorro" : kind === "income" ? "variable" : "variable";
    patchForm({
      kind,
      section,
      repeat: kind === "income",
      category: kind === "expense" ? "Otros" : "Nómina",
    });
  }

  function addPotFromForm(): { pots: SavingPot[]; potId: string } | null {
    const name = form.newPotName.trim();
    if (!name) return null;
    const pot: SavingPot = {
      id: uid(),
      name,
      target: parseAmount(form.newPotTarget) || 0,
    };
    return { pots: [...store.pots, pot], potId: pot.id };
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const amount = parseAmount(form.amount);
    if (amount == null) return;

    let pots = store.pots;
    let potId = form.potId || undefined;
    if (form.kind === "saving") {
      if (form.newPotName.trim()) {
        const created = addPotFromForm();
        if (!created) return;
        pots = created.pots;
        potId = created.potId;
      }
      if (!potId) return;
    }

    const section: Section =
      form.kind === "saving" ? "ahorro" : form.kind === "income" ? KIND_SECTION.income : form.section;
    const note = form.note.trim() || (form.kind === "income" ? "Ingreso" : SECTION_LABEL[section]);
    const category =
      form.kind === "expense" && section === "variable" ? form.category : note;

    const tx: Tx = {
      id: uid(),
      kind: form.kind,
      amount,
      section,
      category,
      note,
      date: form.date,
      potId,
    };

    let recurrings = store.recurrings;
    if (form.repeat && form.kind !== "saving") {
      const rule: Recurring = {
        id: uid(),
        kind: form.kind,
        section,
        name: note,
        amount,
        day: Number(form.date.slice(8, 10)),
        startMonth: form.date.slice(0, 7),
        active: true,
        skippedMonths: [],
        potId,
      };
      tx.recurringId = rule.id;
      recurrings = [rule, ...recurrings];
    }

    setStore({
      ...store,
      txs: [tx, ...store.txs],
      recurrings,
      pots,
    });
    setForm({
      ...emptyForm,
      kind: form.kind,
      section: form.kind === "expense" ? "variable" : form.section,
      date: form.date.startsWith(month) ? form.date : `${month}-01`,
      potId: potId || "",
    });
    setPotOpen(false);
  }

  function removeTx(tx: Tx) {
    let next: Store = { ...store, txs: store.txs.filter((row) => row.id !== tx.id) };
    if (tx.recurringId) next = skipMonth(next, tx.recurringId, month);
    setStore(next);
  }

  function haltRecurring(ruleId: string) {
    setStore((prev) => stopRecurring(prev, ruleId));
  }

  function createPot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    const target = parseAmount(String(data.get("target") || "")) || 0;
    const pot = { id: uid(), name, target };
    setStore({ ...store, pots: [...store.pots, pot] });
    patchForm({ potId: pot.id, kind: "saving", section: "ahorro" });
    e.currentTarget.reset();
  }

  const leftoverClass = leftover >= 0 ? "pos" : "neg";
  const activeRecurring = store.recurrings.filter((rule) => rule.active).map((rule) => rule.id);

  return (
    <div className="shell">
      <header className="top">
        <div>
          <h1>Money</h1>
          <p className="lede">
            Lo que cobras, lo que se repite solo y lo que apartas. Se queda en este navegador.
          </p>
        </div>
        <div className="month-nav" role="group" aria-label="Mes">
          <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior">
            <IconChevron dir="left" />
          </button>
          <span>{monthLabel(month)}</span>
          <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mes siguiente">
            <IconChevron dir="right" />
          </button>
        </div>
      </header>

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
              <em className="neg">−{formatEUR(fijoTotal)}</em>
            </li>
            <li>
              <span>Suscripciones</span>
              <em className="neg">−{formatEUR(subTotal)}</em>
            </li>
            <li className="rule">
              <span>Variables</span>
              <em className="neg">−{formatEUR(variableTotal)}</em>
            </li>
            <li>
              <span>Ahorro</span>
              <em>−{formatEUR(savingTotal)}</em>
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
                        patchForm({
                          section: value,
                          repeat: shouldRepeat(value, "expense"),
                        })
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

          <button type="submit" className="primary">
            {form.kind === "saving" ? "Apartar" : "Guardar"}
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
          onRemove={removeTx}
          onStop={haltRecurring}
        />
        <SectionList
          title="Suscripciones"
          hint="Netflix, Spotify y el resto de cuotas."
          rows={subs}
          empty="Ninguna suscripción este mes."
          activeRecurring={activeRecurring}
          onRemove={removeTx}
          onStop={haltRecurring}
        />
        <SectionList
          title="Variables"
          hint="Lo que cambia: comida, ocio, imprevistos."
          rows={variables}
          empty="Sin gastos variables."
          activeRecurring={activeRecurring}
          onRemove={removeTx}
          onStop={haltRecurring}
        />
      </div>

      <section className="pots">
        <div className="pots-head">
          <div>
            <h2>Ahorro</h2>
            <p>Botes que van creciendo mes a mes. Este mes: {formatEUR(savingTotal)}.</p>
          </div>
        </div>
        {store.pots.length === 0 ? (
          <form className="new-pot" onSubmit={createPot}>
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
            <button type="submit" className="ghost">
              <IconPlus size={16} /> Crear bote
            </button>
          </form>
        ) : (
          <ul className="pot-grid">
            {store.pots.map((pot) => {
              const saved = potTotals.get(pot.id) || 0;
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
              <form onSubmit={createPot}>
                <label>
                  Otro bote
                  <input name="name" placeholder="Nombre" required />
                </label>
                <div className="pair">
                  <label>
                    Meta
                    <input name="target" inputMode="decimal" placeholder="Opcional" />
                  </label>
                  <button type="submit" className="ghost">
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
                    {tx.kind === "income"
                      ? " · Ingreso"
                      : ` · ${SECTION_LABEL[tx.section]}`}
                    {tx.kind === "expense" && tx.section === "variable" && tx.category
                      ? ` · ${tx.category}`
                      : ""}
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
                  {tx.recurringId &&
                    store.recurrings.find((rule) => rule.id === tx.recurringId)?.active && (
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
        {spent > 0 && (
          <p className="footnote">Gastado este mes: {formatEUR(spent)}.</p>
        )}
      </section>

      <footer>
        <p>JaviStudio · money.javistudio.dev · solo en este dispositivo</p>
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
  onRemove,
  onStop,
}: {
  title: string;
  hint: string;
  rows: Tx[];
  empty: string;
  activeRecurring: string[];
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
              </div>
              <div className="tx-right">
                <em className="neg">−{formatEUR(tx.amount)}</em>
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
