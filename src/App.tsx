import { useEffect, useMemo, useState } from "react";
import "./App.css";

type Kind = "income" | "expense";

type Tx = {
  id: string;
  kind: Kind;
  amount: number;
  category: string;
  note: string;
  date: string; // YYYY-MM-DD
};

const STORAGE_KEY = "moneymanager.v1";

const EXPENSE_CATS = ["Comida", "Transporte", "Hogar", "Ocio", "Salud", "Otros"];
const INCOME_CATS = ["Nómina", "Freelance", "Ahorros", "Otros"];

function uid() {
  return crypto.randomUUID();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function load(): Tx[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Tx[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatEUR(n: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

export default function App() {
  const [txs, setTxs] = useState<Tx[]>(() => load());
  const [kind, setKind] = useState<Kind>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATS[0]);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [month, setMonth] = useState(today().slice(0, 7));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(txs));
  }, [txs]);

  useEffect(() => {
    setCategory(kind === "expense" ? EXPENSE_CATS[0] : INCOME_CATS[0]);
  }, [kind]);

  const monthTxs = useMemo(
    () => txs.filter((t) => t.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date)),
    [txs, month]
  );

  const income = monthTxs.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
  const expense = monthTxs.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of monthTxs.filter((x) => x.kind === "expense")) {
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [monthTxs]);

  const maxCat = byCategory[0]?.[1] || 1;

  function addTx(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) return;
    setTxs((prev) => [
      {
        id: uid(),
        kind,
        amount: Math.round(value * 100) / 100,
        category,
        note: note.trim(),
        date,
      },
      ...prev,
    ]);
    setAmount("");
    setNote("");
  }

  function removeTx(id: string) {
    setTxs((prev) => prev.filter((t) => t.id !== id));
  }

  const cats = kind === "expense" ? EXPENSE_CATS : INCOME_CATS;

  return (
    <div className="shell">
      <header className="hero">
        <p className="eyebrow">JaviStudio</p>
        <h1>Money</h1>
        <p className="lede">Controla ingresos y gastos. Todo queda en tu navegador.</p>
      </header>

      <section className="stats">
        <article>
          <span>Ingresos</span>
          <strong className="pos">{formatEUR(income)}</strong>
        </article>
        <article>
          <span>Gastos</span>
          <strong className="neg">{formatEUR(expense)}</strong>
        </article>
        <article>
          <span>Balance</span>
          <strong className={balance >= 0 ? "pos" : "neg"}>{formatEUR(balance)}</strong>
        </article>
      </section>

      <div className="toolbar">
        <label>
          Mes
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
      </div>

      <div className="grid">
        <form className="panel form" onSubmit={addTx}>
          <h2>Nueva anotación</h2>
          <div className="seg">
            <button
              type="button"
              className={kind === "expense" ? "on" : ""}
              onClick={() => setKind("expense")}
            >
              Gasto
            </button>
            <button
              type="button"
              className={kind === "income" ? "on" : ""}
              onClick={() => setKind("income")}
            >
              Ingreso
            </button>
          </div>
          <label>
            Importe (€)
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
          <label>
            Categoría
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {cats.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fecha
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Nota
            <input
              placeholder="Opcional"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={80}
            />
          </label>
          <button type="submit" className="primary">
            Guardar
          </button>
        </form>

        <section className="panel">
          <h2>Gastos por categoría</h2>
          {byCategory.length === 0 ? (
            <p className="empty">Sin gastos este mes.</p>
          ) : (
            <ul className="bars">
              {byCategory.map(([cat, val]) => (
                <li key={cat}>
                  <div className="bar-meta">
                    <span>{cat}</span>
                    <span>{formatEUR(val)}</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(val / maxCat) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel list-panel">
        <h2>Movimientos del mes</h2>
        {monthTxs.length === 0 ? (
          <p className="empty">Aún no hay movimientos en {month}.</p>
        ) : (
          <ul className="tx-list">
            {monthTxs.map((t) => (
              <li key={t.id}>
                <div>
                  <strong>{t.category}</strong>
                  <span>
                    {t.date}
                    {t.note ? ` · ${t.note}` : ""}
                  </span>
                </div>
                <div className="tx-right">
                  <em className={t.kind === "income" ? "pos" : "neg"}>
                    {t.kind === "income" ? "+" : "−"}
                    {formatEUR(t.amount)}
                  </em>
                  <button type="button" aria-label="Eliminar" onClick={() => removeTx(t.id)}>
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer>
        <p>Datos solo en este dispositivo · money.javistudio.dev</p>
      </footer>
    </div>
  );
}
