import EditTx from "./EditTx";
import { IconPencil, IconRepeat, IconTrash } from "./icons";
import { colorDe, inicial } from "./lib/avatar";
import { formatEUR, moneyDate, monthLabel } from "./lib/format";
import type { Recurring, SavingPot, Tx } from "./lib/types";
import { SECTION_LABEL } from "./lib/types";

/** El histórico del mes abierto, con la edición en el sitio de cada línea. */
export default function Movements({
  month,
  rows,
  spent,
  recurrings,
  activeRecurring,
  pots,
  shared,
  busy,
  editando,
  onEdit,
  onSave,
  onRemove,
  onStop,
}: {
  month: string;
  rows: Tx[];
  spent: number;
  recurrings: Recurring[];
  activeRecurring: string[];
  pots: SavingPot[];
  shared: boolean;
  busy: boolean;
  editando: string | null;
  onEdit: (id: string | null) => void;
  onSave: (tx: Tx, cambios: Partial<Tx>, proximos: boolean) => Promise<unknown>;
  onRemove: (tx: Tx) => void;
  onStop: (id: string) => void;
}) {
  return (
    <section className="movements">
      <h2>Movimientos de {monthLabel(month)}</h2>
      {rows.length === 0 ? (
        <p className="empty">
          Este mes está vacío. Apunta un ingreso o un fijo y se quedará para el siguiente.
        </p>
      ) : (
        <ul className="tx-list">
          {rows.map((tx) =>
            editando === tx.id ? (
              <li key={tx.id} className="editing">
                <EditTx
                  tx={tx}
                  rule={recurrings.find((r) => r.id === tx.recurringId)}
                  pots={pots}
                  busy={busy}
                  onSave={async (cambios, proximos) => {
                    if (await onSave(tx, cambios, proximos)) onEdit(null);
                  }}
                  onCancel={() => onEdit(null)}
                />
              </li>
            ) : (
              <li key={tx.id}>
                <span className="av" style={{ background: colorDe(tx.note || tx.category) }} aria-hidden>
                  {inicial(tx.note || tx.category)}
                </span>
                <div className="tx-body">
                  <strong>{tx.note || tx.category}</strong>
                  <span>
                    {moneyDate(tx.date)}
                    {tx.kind === "income"
                      ? " · Ingreso"
                      : tx.out
                        ? " · Sacado del ahorro"
                        : ` · ${SECTION_LABEL[tx.section]}`}
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
                  <em className={tx.kind === "income" || tx.out ? "pos" : "neg"}>
                    {tx.kind === "income" || tx.out ? "+" : "−"}
                    {formatEUR(tx.amount)}
                  </em>
                  {tx.recurringId && activeRecurring.includes(tx.recurringId) && (
                    <button type="button" className="text-btn" onClick={() => onStop(tx.recurringId!)}>
                      Dejar de repetir
                    </button>
                  )}
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Editar ${tx.note || tx.category}`}
                    onClick={() => onEdit(tx.id)}
                  >
                    <IconPencil size={15} />
                  </button>
                  <button type="button" aria-label="Eliminar" onClick={() => onRemove(tx)}>
                    <IconTrash size={15} />
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
      {spent > 0 && <p className="footnote">Gastado este mes: {formatEUR(spent)}.</p>}
    </section>
  );
}
