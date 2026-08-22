import { formatEUR } from "./lib/format";
import type { MonthBreakdown } from "./lib/summary";

/**
 * La portada: el número grande sobre el degradado. Se reencuadra (`key`) al
 * cambiar de mes y al apuntar, para que la cifra se vea asentarse justo cuando
 * cambia — es el momento que el usuario quiere ver moverse.
 */
export default function Balance({ month, mes }: { month: string; mes: MonthBreakdown }) {
  return (
    <section className="balance" aria-label="Lo que te queda este mes">
      <p className="balance-label">Te queda este mes</p>
      <p key={`${month}-${mes.txs.length}`} className="ledger-hero enter">
        {formatEUR(mes.afterFixed)}
      </p>
      <p className="ledger-sub">
        {mes.income > 0
          ? `De ${formatEUR(mes.income)} cobrados, ya sin fijos ni suscripciones`
          : "Apunta lo que cobras y aquí verás lo que te queda"}
      </p>
    </section>
  );
}
