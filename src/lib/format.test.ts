import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { clampDay, daysInMonth, parseAmount, shiftMonth } from "./format";

describe("parseAmount", () => {
  it("acepta la coma decimal, que es como se escribe aquí", () => {
    equal(parseAmount("12,50"), 12.5);
    equal(parseAmount("12.50"), 12.5);
  });

  it("aguanta el símbolo del euro y los espacios", () => {
    equal(parseAmount("12,50 €"), 12.5);
    equal(parseAmount(" 40 "), 40);
  });

  it("redondea a céntimos", () => {
    equal(parseAmount("10,999"), 11);
    equal(parseAmount("0,005"), 0.01);
  });

  it("un importe que no sirve devuelve null, no un cero disfrazado", () => {
    equal(parseAmount(""), null);
    equal(parseAmount("0"), null);
    equal(parseAmount("-5"), null);
    equal(parseAmount("hola"), null);
  });
});

describe("shiftMonth", () => {
  it("se mueve dentro del año", () => {
    equal(shiftMonth("2026-08", 1), "2026-09");
    equal(shiftMonth("2026-08", -1), "2026-07");
  });

  it("cruza el fin de año en los dos sentidos", () => {
    equal(shiftMonth("2026-12", 1), "2027-01");
    equal(shiftMonth("2026-01", -1), "2025-12");
  });

  it("mantiene el mes a dos cifras", () => {
    equal(shiftMonth("2026-09", 1), "2026-10");
    equal(shiftMonth("2026-10", -1), "2026-09");
  });
});

describe("daysInMonth y clampDay", () => {
  it("sabe cuántos días tiene cada mes, febrero incluido", () => {
    equal(daysInMonth("2026-02"), 28);
    equal(daysInMonth("2024-02"), 29); // bisiesto
    equal(daysInMonth("2026-04"), 30);
    equal(daysInMonth("2026-12"), 31);
  });

  // Un fijo del día 31 tiene que caer en algún sitio en febrero.
  it("recorta el día al último del mes", () => {
    equal(clampDay("2026-02", 31), 28);
    equal(clampDay("2026-08", 31), 31);
  });

  it("no deja días por debajo del uno", () => {
    equal(clampDay("2026-08", 0), 1);
    equal(clampDay("2026-08", -3), 1);
  });
});
