import type { Tx } from "./types";

export type MonthSummary = {
  month: string;
  income: number;
  fixed: number;
  subs: number;
  variable: number;
  saved: number;
  /** Lo que sobra después de todo, ahorro incluido. */
  leftover: number;
  /** Ahorro acumulado hasta ese mes, incluido. */
  savedSoFar: number;
};

/**
 * Resumen mes a mes de todo el libro, del más reciente al más antiguo. Es lo
 * que alimenta el apartado de "cuánto ahorré y cuánto me sobró".
 */
export function monthlySummaries(txs: Tx[]): MonthSummary[] {
  const byMonth = new Map<string, Tx[]>();
  for (const tx of txs) {
    const month = tx.date.slice(0, 7);
    const rows = byMonth.get(month);
    if (rows) rows.push(tx);
    else byMonth.set(month, [tx]);
  }

  const months = [...byMonth.keys()].sort();
  const out: MonthSummary[] = [];
  let savedSoFar = 0;

  for (const month of months) {
    const rows = byMonth.get(month)!;
    let income = 0;
    let fixed = 0;
    let subs = 0;
    let variable = 0;
    let saved = 0;

    for (const tx of rows) {
      if (tx.kind === "income") income += tx.amount;
      else if (tx.kind === "saving") saved += tx.out ? -tx.amount : tx.amount;
      else if (tx.section === "fijo") fixed += tx.amount;
      else if (tx.section === "suscripcion") subs += tx.amount;
      else variable += tx.amount;
    }

    savedSoFar += saved;
    out.push({
      month,
      income,
      fixed,
      subs,
      variable,
      saved,
      leftover: income - fixed - subs - variable - saved,
      savedSoFar,
    });
  }

  return out.reverse();
}

export function potTotals(txs: Tx[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const tx of txs) {
    if (tx.kind !== "saving" || !tx.potId) continue;
    map.set(tx.potId, (map.get(tx.potId) || 0) + (tx.out ? -tx.amount : tx.amount));
  }
  return map;
}
