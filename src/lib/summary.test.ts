import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  budgetRows,
  budgetsForMonth,
  monthBreakdown,
  monthlySummaries,
  potTotals,
  spentByCategory,
} from "./summary";
import type { Budget, Tx } from "./types";

let n = 0;
/** Un movimiento con lo mínimo escrito; el resto se rellena solo. */
function tx(parcial: Partial<Tx> & Pick<Tx, "kind" | "amount" | "date">): Tx {
  return {
    id: `t${++n}`,
    section: parcial.kind === "saving" ? "ahorro" : "variable",
    category: "Otros",
    note: "",
    ...parcial,
  };
}

const nomina = tx({ kind: "income", amount: 2000, date: "2026-08-01" });
const alquiler = tx({ kind: "expense", section: "fijo", amount: 700, date: "2026-08-03" });
const netflix = tx({ kind: "expense", section: "suscripcion", amount: 13, date: "2026-08-05" });
const compra = tx({
  kind: "expense",
  section: "variable",
  category: "Comida",
  amount: 60,
  date: "2026-08-07",
});
const aparta = tx({ kind: "saving", amount: 200, date: "2026-08-10", potId: "p1" });

const agosto = [nomina, alquiler, netflix, compra, aparta];

describe("monthBreakdown", () => {
  it("separa cada movimiento en su sección", () => {
    const mes = monthBreakdown(agosto, "2026-08");
    deepEqual(mes.incomes, [nomina]);
    deepEqual(mes.fijos, [alquiler]);
    deepEqual(mes.subs, [netflix]);
    deepEqual(mes.variables, [compra]);
    deepEqual(mes.savings, [aparta]);
  });

  it("el sobre tras fijos no descuenta variables ni ahorro", () => {
    const mes = monthBreakdown(agosto, "2026-08");
    equal(mes.afterFixed, 2000 - 700 - 13);
  });

  it("el número de portada descuenta también variables y ahorro", () => {
    const mes = monthBreakdown(agosto, "2026-08");
    equal(mes.leftover, 2000 - 700 - 13 - 60 - 200);
  });

  it("lo gastado no cuenta el ahorro: apartar no es gastar", () => {
    equal(monthBreakdown(agosto, "2026-08").spent, 700 + 13 + 60);
  });

  it("sacar de un bote resta del ahorro del mes y suma a lo que queda", () => {
    const saca = tx({ kind: "saving", amount: 50, date: "2026-08-20", potId: "p1", out: true });
    const mes = monthBreakdown([...agosto, saca], "2026-08");
    equal(mes.savingTotal, 150);
    equal(mes.leftover, 2000 - 700 - 13 - 60 - 150);
  });

  it("deja fuera los meses que no se están mirando", () => {
    const julio = tx({ kind: "expense", section: "fijo", amount: 999, date: "2026-07-03" });
    const mes = monthBreakdown([...agosto, julio], "2026-08");
    equal(mes.txs.length, 5);
    equal(mes.fijoTotal, 700);
  });

  it("ordena del más reciente al más antiguo", () => {
    const fechas = monthBreakdown(agosto, "2026-08").txs.map((t) => t.date);
    deepEqual(fechas, [...fechas].sort().reverse());
  });

  it("un mes vacío son ceros, no un error", () => {
    const mes = monthBreakdown(agosto, "2026-01");
    equal(mes.income, 0);
    equal(mes.leftover, 0);
    equal(mes.spent, 0);
    deepEqual(mes.txs, []);
  });

  it("cuadra con el resumen del histórico", () => {
    const mes = monthBreakdown(agosto, "2026-08");
    const historico = monthlySummaries(agosto).find((m) => m.month === "2026-08")!;
    equal(mes.leftover, historico.leftover);
    equal(mes.income, historico.income);
    equal(mes.savingTotal, historico.saved);
  });
});

describe("monthlySummaries", () => {
  it("va del mes más reciente al más antiguo", () => {
    const julio = tx({ kind: "income", amount: 100, date: "2026-07-01" });
    deepEqual(
      monthlySummaries([...agosto, julio]).map((m) => m.month),
      ["2026-08", "2026-07"],
    );
  });

  it("el ahorro acumulado arrastra el de los meses anteriores", () => {
    const julio = tx({ kind: "saving", amount: 300, date: "2026-07-15", potId: "p1" });
    const [ago, jul] = monthlySummaries([...agosto, julio]);
    equal(jul.savedSoFar, 300);
    equal(ago.savedSoFar, 500);
  });
});

describe("potTotals", () => {
  it("suma lo metido y resta lo sacado, bote a bote", () => {
    const total = potTotals([
      aparta,
      tx({ kind: "saving", amount: 40, date: "2026-08-11", potId: "p1", out: true }),
      tx({ kind: "saving", amount: 25, date: "2026-08-12", potId: "p2" }),
    ]);
    equal(total.get("p1"), 160);
    equal(total.get("p2"), 25);
  });

  it("un movimiento de ahorro sin bote no cuenta en ninguno", () => {
    equal(potTotals([tx({ kind: "saving", amount: 10, date: "2026-08-01" })]).size, 0);
  });
});

describe("budgetsForMonth", () => {
  const topes: Budget[] = [
    { id: "b1", category: "Ocio", amount: 100, from: "2026-06" },
    { id: "b2", category: "Ocio", amount: 250, from: "2026-08" },
    { id: "b3", category: "Comida", amount: 400, from: "2026-09" },
  ];

  it("coge el último tope puesto en ese mes o antes", () => {
    equal(budgetsForMonth(topes, "2026-08").get("Ocio")?.amount, 250);
    equal(budgetsForMonth(topes, "2026-07").get("Ocio")?.amount, 100);
  });

  it("subir el tope en agosto no reescribe julio", () => {
    equal(budgetsForMonth(topes, "2026-07").get("Ocio")?.id, "b1");
  });

  it("un tope puesto para más adelante todavía no vale", () => {
    equal(budgetsForMonth(topes, "2026-08").has("Comida"), false);
    equal(budgetsForMonth(topes, "2026-09").get("Comida")?.amount, 400);
  });
});

describe("spentByCategory", () => {
  it("solo cuenta gastos variables del mes", () => {
    const gastado = spentByCategory([...agosto, alquiler], "2026-08");
    equal(gastado.get("Comida"), 60);
    equal(gastado.has("Otros"), false);
  });

  it("un variable sin categoría cae en Otros", () => {
    const suelto = tx({
      kind: "expense",
      section: "variable",
      category: "",
      amount: 12,
      date: "2026-08-09",
    });
    equal(spentByCategory([suelto], "2026-08").get("Otros"), 12);
  });
});

describe("budgetRows", () => {
  const topes: Budget[] = [{ id: "b1", category: "Comida", amount: 200, from: "2026-08" }];

  it("dice lo gastado y lo que queda", () => {
    const [fila] = budgetRows(topes, agosto, "2026-08");
    equal(fila.spent, 60);
    equal(fila.left, 140);
    equal(fila.ratio, 0.3);
  });

  it("pasarse del tope deja el ratio en 1 y lo que queda en negativo", () => {
    const caro = tx({
      kind: "expense",
      section: "variable",
      category: "Comida",
      amount: 500,
      date: "2026-08-08",
    });
    const [fila] = budgetRows(topes, [caro], "2026-08");
    equal(fila.ratio, 1);
    equal(fila.left, -300);
  });

  it("primero lo más apurado", () => {
    const dos: Budget[] = [...topes, { id: "b2", category: "Ocio", amount: 100, from: "2026-08" }];
    const ocio = tx({
      kind: "expense",
      section: "variable",
      category: "Ocio",
      amount: 90,
      date: "2026-08-08",
    });
    deepEqual(
      budgetRows(dos, [...agosto, ocio], "2026-08").map((f) => f.category),
      ["Ocio", "Comida"],
    );
  });
});
