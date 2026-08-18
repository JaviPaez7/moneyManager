import { useMemo, useState } from "react";
import { formatEUR, monthLabel } from "./lib/format";
import { monthlySummaries } from "./lib/summary";
import type { Tx } from "./lib/types";

/**
 * "Que lo que ahorre mes a mes se pueda ver en algún apartado, o lo que me
 * sobre": una fila por mes con lo ahorrado y lo que quedó libre.
 */
export default function History({
  txs,
  onPickMonth,
}: {
  txs: Tx[];
  onPickMonth: (month: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rows = useMemo(() => monthlySummaries(txs), [txs]);

  if (rows.length === 0) return null;

  const shown = open ? rows : rows.slice(0, 6);
  const totalSaved = rows.length > 0 ? rows[0].savedSoFar : 0;
  const closed = rows.filter((row) => row.leftover !== 0 || row.income > 0);
  const avgLeftover =
    closed.length > 0 ? closed.reduce((s, row) => s + row.leftover, 0) / closed.length : 0;
  const peak = Math.max(1, ...rows.map((row) => Math.max(row.saved, Math.abs(row.leftover))));

  return (
    <section className="history">
      <div className="history-head">
        <div>
          <h2>Mes a mes</h2>
          <p>Lo que apartaste y lo que te sobró en cada uno.</p>
        </div>
        <div className="history-totals">
          <div>
            <span>Ahorrado en total</span>
            <strong className="pos">{formatEUR(totalSaved)}</strong>
          </div>
          <div>
            <span>Te sobra de media</span>
            <strong className={avgLeftover >= 0 ? "pos" : "neg"}>{formatEUR(avgLeftover)}</strong>
          </div>
        </div>
      </div>

      <ul className="history-rows">
        {shown.map((row) => (
          <li key={row.month}>
            <button type="button" className="history-month" onClick={() => onPickMonth(row.month)}>
              {monthLabel(row.month)}
            </button>
            <div className="history-bars" aria-hidden>
              <div
                className="bar saved"
                style={{ width: `${(row.saved / peak) * 100}%` }}
                title={`Ahorrado ${formatEUR(row.saved)}`}
              />
              <div
                className={`bar left ${row.leftover >= 0 ? "pos" : "neg"}`}
                style={{ width: `${(Math.abs(row.leftover) / peak) * 100}%` }}
                title={`Sobró ${formatEUR(row.leftover)}`}
              />
            </div>
            <div className="history-nums">
              <em className="pos" title="Ahorrado">
                {formatEUR(row.saved)}
              </em>
              <em className={row.leftover >= 0 ? "pos" : "neg"} title="Sobrante">
                {formatEUR(row.leftover)}
              </em>
            </div>
          </li>
        ))}
      </ul>

      <p className="history-legend">
        <span className="key saved" aria-hidden /> ahorrado
        <span className="key left" aria-hidden /> sobrante
      </p>

      {rows.length > 6 && (
        <button type="button" className="text-btn" onClick={() => setOpen(!open)}>
          {open ? "Ver solo los últimos" : `Ver los ${rows.length} meses`}
        </button>
      )}
    </section>
  );
}
