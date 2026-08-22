import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { classifySection, classifyVariableCategory, shouldRepeat } from "./classify";

describe("classifySection", () => {
  it("reconoce las suscripciones de siempre", () => {
    equal(classifySection("Netflix"), "suscripcion");
    equal(classifySection("Spotify familiar"), "suscripcion");
    equal(classifySection("Gimnasio"), "suscripcion");
  });

  it("reconoce los fijos de casa y de las facturas", () => {
    equal(classifySection("Alquiler"), "fijo");
    equal(classifySection("Iberdrola"), "fijo");
    equal(classifySection("Seguro del coche"), "fijo");
  });

  it("lo que no suena a nada es variable", () => {
    equal(classifySection("Mercadona"), "variable");
    equal(classifySection("Regalo de Marta"), "variable");
    equal(classifySection(""), "variable");
  });

  it("da igual cómo se escriba: mayúsculas y tildes", () => {
    equal(classifySection("NETFLIX"), "suscripcion");
    equal(classifySection("Préstamo"), "fijo");
    equal(classifySection("prestamo"), "fijo");
  });

  // El motivo por el que las palabras se buscan enteras y no como trozo suelto.
  it("no confunde una palabra con un trozo de otra", () => {
    equal(classifySection("Marketing digital"), "variable"); // "digi" es la operadora
    equal(classifySection("Maxi Dia"), "variable"); // "max" es el canal
    equal(classifySection("Premiado en el sorteo"), "variable"); // "premium"
  });

  it("una suscripción gana a un fijo cuando aparecen las dos", () => {
    equal(classifySection("Seguro con Netflix incluido"), "suscripcion");
  });

  it("«cuota del coche» es fijo aunque ninguna palabra sola lo sea", () => {
    equal(classifySection("Cuota del coche"), "fijo");
    equal(classifySection("Tarifa del movil"), "fijo");
    // El coche a secas no: puede ser gasolina o un lavado.
    equal(classifySection("Coche"), "variable");
  });

  it("la categoría también cuenta, no solo lo escrito", () => {
    equal(classifySection("Pago mensual", "Netflix"), "suscripcion");
  });
});

describe("classifyVariableCategory", () => {
  it("coloca lo típico en su sitio", () => {
    equal(classifyVariableCategory("Mercadona"), "Comida");
    equal(classifyVariableCategory("Gasolina"), "Transporte");
    equal(classifyVariableCategory("Ikea"), "Hogar");
    equal(classifyVariableCategory("Cine"), "Ocio");
    equal(classifyVariableCategory("Farmacia"), "Salud");
  });

  it("lo que no encaja cae en Otros", () => {
    equal(classifyVariableCategory("Regalo de Marta"), "Otros");
    equal(classifyVariableCategory(""), "Otros");
  });

  it("reconoce el supermercado Dia sin tropezar con «día»", () => {
    equal(classifyVariableCategory("Dia"), "Comida");
    equal(classifyVariableCategory("Diadema"), "Otros");
  });
});

describe("shouldRepeat", () => {
  it("los ingresos se repiten: la nómina vuelve cada mes", () => {
    equal(shouldRepeat("variable", "income"), true);
  });

  it("los fijos y las suscripciones se repiten; lo variable no", () => {
    equal(shouldRepeat("fijo", "expense"), true);
    equal(shouldRepeat("suscripcion", "expense"), true);
    equal(shouldRepeat("variable", "expense"), false);
  });

  it("el ahorro nunca se repite solo: se aparta a mano", () => {
    equal(shouldRepeat("ahorro", "saving"), false);
    equal(shouldRepeat("fijo", "saving"), false);
  });
});
