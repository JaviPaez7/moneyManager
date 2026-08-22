import type { Budget, Tx } from "./types";

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

export type BudgetRow = {
  category: string;
  amount: number;
  spent: number;
  left: number;
  ratio: number;
  budgetId: string;
};

/**
 * El tope que vale para un mes es el último puesto en ese mes o antes. Así
 * subirlo en septiembre no cambia lo que se ve en agosto.
 */
export function budgetsForMonth(budgets: Budget[], month: string): Map<string, Budget> {
  const vigentes = new Map<string, Budget>();
  for (const b of budgets) {
    if (b.from > month) continue;
    const previo = vigentes.get(b.category);
    if (!previo || b.from > previo.from) vigentes.set(b.category, b);
  }
  return vigentes;
}

/** Lo gastado en cada categoría variable de un mes. */
export function spentByCategory(txs: Tx[], month: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const tx of txs) {
    if (tx.kind !== "expense" || tx.section !== "variable") continue;
    if (!tx.date.startsWith(month)) continue;
    const cat = tx.category || "Otros";
    map.set(cat, (map.get(cat) || 0) + tx.amount);
  }
  return map;
}

export function budgetRows(budgets: Budget[], txs: Tx[], month: string): BudgetRow[] {
  const vigentes = budgetsForMonth(budgets, month);
  const gastado = spentByCategory(txs, month);
  return [...vigentes.entries()]
    .map(([category, b]) => {
      const spent = gastado.get(category) || 0;
      return {
        category,
        amount: b.amount,
        spent,
        left: b.amount - spent,
        ratio: b.amount > 0 ? Math.min(1, spent / b.amount) : 0,
        budgetId: b.id,
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

export type MonthBreakdown = {
  /** Los movimientos del mes, del más reciente al más antiguo. */
  txs: Tx[];
  incomes: Tx[];
  fijos: Tx[];
  subs: Tx[];
  variables: Tx[];
  savings: Tx[];
  income: number;
  fijoTotal: number;
  subTotal: number;
  variableTotal: number;
  /** Lo apartado menos lo sacado de los botes. Puede ser negativo. */
  savingTotal: number;
  /** Lo que queda tras los fijos y las suscripciones: el número de portada. */
  afterFixed: number;
  /** Lo que queda de verdad, ya con las variables y el ahorro descontados. */
  leftover: number;
  /** Todo lo gastado, sin contar el ahorro. */
  spent: number;
};

/**
 * Un mes desmenuzado: las listas por sección y los totales que se enseñan en
 * la portada. Está aquí y no en la pantalla porque es aritmética pura y
 * conviene poder comprobarla sin montar React.
 */
export function monthBreakdown(txs: Tx[], month: string): MonthBreakdown {
  const delMes = txs
    .filter((t) => t.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date));

  const incomes = delMes.filter((t) => t.kind === "income");
  const fijos = delMes.filter((t) => t.kind === "expense" && t.section === "fijo");
  const subs = delMes.filter((t) => t.kind === "expense" && t.section === "suscripcion");
  const variables = delMes.filter((t) => t.kind === "expense" && t.section === "variable");
  const savings = delMes.filter((t) => t.kind === "saving");

  const suma = (rows: Tx[]) => rows.reduce((s, t) => s + t.amount, 0);
  const income = suma(incomes);
  const fijoTotal = suma(fijos);
  const subTotal = suma(subs);
  const variableTotal = suma(variables);
  const savingTotal = savings.reduce((s, t) => s + (t.out ? -t.amount : t.amount), 0);
  const afterFixed = income - fijoTotal - subTotal;

  return {
    txs: delMes,
    incomes,
    fijos,
    subs,
    variables,
    savings,
    income,
    fijoTotal,
    subTotal,
    variableTotal,
    savingTotal,
    afterFixed,
    leftover: afterFixed - variableTotal - savingTotal,
    spent: fijoTotal + subTotal + variableTotal,
  };
}
