import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { esSesionMuerta } from "./session";

describe("esSesionMuerta", () => {
  it("sí cuando el servidor rechaza la sesión", () => {
    equal(esSesionMuerta({ status: 401 }), true);
    equal(esSesionMuerta({ status: 403 }), true);
    equal(esSesionMuerta({ status: 400 }), true);
  });

  it("no cuando lo que falla es la red: el token sigue valiendo", () => {
    equal(esSesionMuerta({ status: 0 }), false);
    equal(esSesionMuerta({ status: 500 }), false);
    equal(esSesionMuerta({ status: 502 }), false);
  });

  it("no se cae con lo que no es un error del cliente", () => {
    equal(esSesionMuerta(null), false);
    equal(esSesionMuerta(undefined), false);
    equal(esSesionMuerta(new Error("vaya")), false);
  });
});
