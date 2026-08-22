import { formatEUR, formatOut } from "./lib/format";
import type { MonthBreakdown } from "./lib/summary";

/** La portada del mes: el número grande y de dónde sale. */
export default function Ledger({ month, mes }: { month: string; mes: MonthBreakdown }) {
  return (
    <section className="ledger" aria-label="Resumen del mes">
      <div className="balance">
        <p className="balance-label">Te queda este mes</p>
        <p key={month} className={`ledger-hero enter ${mes.afterFixed >= 0 ? "pos" : "neg"}`}>
          {formatEUR(mes.afterFixed)}
        </p>
        <p className="ledger-sub">
          {mes.income > 0
            ? `De ${formatEUR(mes.income)} cobrados, ya sin fijos ni suscripciones`
            : "Apunta lo que cobras y aquí verás lo que te queda"}
        </p>
      </div>

      <ul className="ledger-rows">
        <li>
          <span>Ingresos</span>
          <em className={mes.income > 0 ? "pos" : "zero"}>{formatEUR(mes.income)}</em>
        </li>
        <li>
          <span>Fijos</span>
          <em className={mes.fijoTotal > 0 ? "neg" : "zero"}>{formatOut(mes.fijoTotal)}</em>
        </li>
        <li>
          <span>Suscripciones</span>
          <em className={mes.subTotal > 0 ? "neg" : "zero"}>{formatOut(mes.subTotal)}</em>
        </li>
        <li className="rule">
          <span>Variables</span>
          <em className={mes.variableTotal > 0 ? "neg" : "zero"}>{formatOut(mes.variableTotal)}</em>
        </li>
        <li>
          <span>Ahorro</span>
          <em className={mes.savingTotal === 0 ? "zero" : undefined}>{formatOut(mes.savingTotal)}</em>
        </li>
        <li className="total">
          <span>Queda</span>
          <em className={mes.leftover === 0 ? "zero" : mes.leftover > 0 ? "pos" : "neg"}>
            {formatEUR(mes.leftover)}
          </em>
        </li>
      </ul>
    </section>
  );
}
