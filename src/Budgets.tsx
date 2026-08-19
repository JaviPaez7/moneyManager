import { useMemo, useState, type FormEvent } from "react";
import { formatEUR, parseAmount } from "./lib/format";
import { budgetRows } from "./lib/summary";
import type { Budget, Tx } from "./lib/types";
import { VARIABLE_CATS } from "./lib/types";

/**
 * Topes por categoría: pones 250 € de ocio y ves lo que queda. A propósito no
 * avisa de nada ni predice nada — solo enseña el dinero que sobra del tope.
 */
export default function Budgets({
  budgets,
  txs,
  month,
  busy,
  onSet,
  onRemove,
}: {
  budgets: Budget[];
  txs: Tx[];
  month: string;
  busy: boolean;
  onSet: (category: string, amount: number) => void;
  onRemove: (budgetId: string) => void;
}) {
  const filas = useMemo(() => budgetRows(budgets, txs, month), [budgets, txs, month]);
  const [abierto, setAbierto] = useState(false);
  const [categoria, setCategoria] = useState<string>(
    VARIABLE_CATS.find((c) => !filas.some((f) => f.category === c)) || VARIABLE_CATS[0],
  );
  const [importe, setImporte] = useState("");

  const libres = VARIABLE_CATS.filter((c) => !filas.some((f) => f.category === c));

  function submit(e: FormEvent) {
    e.preventDefault();
    const cantidad = parseAmount(importe);
    if (cantidad == null) return;
    onSet(categoria, cantidad);
    setImporte("");
    setAbierto(false);
  }

  return (
    <section className="budgets">
      <div className="pots-head">
        <h2>Topes por categoría</h2>
        <p>
          {filas.length === 0
            ? "Pon un tope a una categoría y verás lo que te va quedando."
            : "Lo que te queda de cada tope este mes."}
        </p>
      </div>

      {filas.length > 0 && (
        <ul className="budget-list">
          {filas.map((fila) => {
            const pasado = fila.left < 0;
            return (
              <li key={fila.category}>
                <div className="bar-meta">
                  <strong>{fila.category}</strong>
                  <span className={pasado ? "neg" : undefined}>
                    {pasado
                      ? `${formatEUR(Math.abs(fila.left))} de más`
                      : `Quedan ${formatEUR(fila.left)}`}
                  </span>
                </div>
                <div className="bar-track" aria-hidden>
                  <div
                    className={`bar-fill ${pasado ? "over" : ""}`}
                    style={{ width: `${fila.ratio * 100}%` }}
                  />
                </div>
                <div className="budget-foot">
                  <span>
                    {formatEUR(fila.spent)} de {formatEUR(fila.amount)}
                  </span>
                  <span className="budget-acciones">
                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => {
                        setCategoria(fila.category);
                        setImporte(String(fila.amount).replace(".", ","));
                        setAbierto(true);
                      }}
                    >
                      Cambiar
                    </button>
                    <button
                      type="button"
                      className="text-btn"
                      disabled={busy}
                      onClick={() => onRemove(fila.budgetId)}
                    >
                      Quitar
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {abierto ? (
        <form className="budget-form" onSubmit={submit}>
          <div className="pair">
            <label>
              Categoría
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                {VARIABLE_CATS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tope al mes
              <input
                inputMode="decimal"
                value={importe}
                onChange={(e) => setImporte(e.target.value)}
                placeholder="250"
                autoFocus
                required
              />
            </label>
          </div>
          <div className="edit-actions">
            <button type="submit" className="ghost small" disabled={busy}>
              Guardar
            </button>
            <button type="button" className="text-btn" onClick={() => setAbierto(false)}>
              Dejarlo
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="ghost small"
          onClick={() => {
            if (libres.length > 0) setCategoria(libres[0]);
            setImporte("");
            setAbierto(true);
          }}
        >
          Poner un tope
        </button>
      )}
    </section>
  );
}
