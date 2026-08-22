import { formatEUR, formatOut } from "./lib/format";
import type { MonthBreakdown } from "./lib/summary";

/**
 * El recibo del mes: de dónde sale «lo que queda». Enseña la resta, no solo el
 * resultado, para poder auditar el número en vez de fiarse. Va debajo del
 * formulario: primero apuntas, luego, si quieres, miras la cuenta entera.
 */
export default function Breakdown({ mes }: { mes: MonthBreakdown }) {
  return (
    <section className="breakdown" aria-label="Desglose del mes">
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
