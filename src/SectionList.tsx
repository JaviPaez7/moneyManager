import { IconClose, IconRepeat, IconTrash } from "./icons";
import { colorDe, inicial } from "./lib/avatar";
import { formatOut } from "./lib/format";
import type { Tx } from "./lib/types";

export type SectionSpec = {
  title: string;
  hint: string;
  rows: Tx[];
  empty: string;
};

export default function SectionList({
  title,
  hint,
  rows,
  empty,
  activeRecurring,
  shared,
  onRemove,
  onStop,
}: SectionSpec & {
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
              <span className="av" style={{ background: colorDe(tx.note || tx.category) }} aria-hidden>
                {inicial(tx.note || tx.category)}
              </span>
              <div className="tx-body">
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
