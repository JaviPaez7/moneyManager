import { formatEUR, formatOut } from "./lib/format";
import type { MonthBreakdown } from "./lib/summary";

/**
 * La portada: lo que sobra ahora, sobre el degradado. Se reencuadra (`key`) al
 * cambiar de mes y al apuntar, para que la cifra se vea asentarse justo cuando
 * cambia — es el momento que el usuario quiere ver moverse.
 *
 * El sobre tras fijos queda en voz baja. La resta se abre aquí mismo, no en
 * otra tarjeta: primero se mira el número, y solo si se quiere se audita.
 */
function apoyo(mes: MonthBreakdown) {
  if (mes.income <= 0) return "Apunta lo que cobras y aquí verás lo que te queda";

  const partes = [`Tras fijos te quedaban ${formatEUR(mes.afterFixed)}`];
  if (mes.variableTotal > 0) partes.push(`ya gastaste ${formatEUR(mes.variableTotal)}`);
  if (mes.savingTotal > 0) partes.push(`apartaste ${formatEUR(mes.savingTotal)}`);
  else if (mes.savingTotal < 0) partes.push(`sacaste ${formatEUR(-mes.savingTotal)} del ahorro`);
  return partes.join(" · ");
}

export default function Balance({ month, mes }: { month: string; mes: MonthBreakdown }) {
  const hayCuenta = mes.income > 0 || mes.spent > 0 || mes.savingTotal !== 0;

  return (
    <section className="balance" aria-label="Lo que te queda este mes">
      <div className="balance-header">
        <span className="balance-pill">Saldo neto</span>
        <p className="balance-label">Lo que te queda</p>
      </div>
      <p key={`${month}-${mes.leftover}`} className="ledger-hero enter">
        {formatEUR(mes.leftover)}
      </p>
      <p className="ledger-sub">{apoyo(mes)}</p>

      {hayCuenta && (
        <details className="balance-cuenta">
          <summary>
            <span>Desglose mensual</span>
          </summary>
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
            <li>
              <span>Variables</span>
              <em className={mes.variableTotal > 0 ? "neg" : "zero"}>{formatOut(mes.variableTotal)}</em>
            </li>
            <li>
              <span>Ahorro</span>
              <em className={mes.savingTotal === 0 ? "zero" : undefined}>{formatOut(mes.savingTotal)}</em>
            </li>
            <li className="total">
              <span>Queda disponible</span>
              <em>{formatEUR(mes.leftover)}</em>
            </li>
          </ul>
        </details>
      )}
    </section>
  );
}
