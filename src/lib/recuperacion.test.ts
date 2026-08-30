import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { tokenDeRecuperacion } from "./recuperacion";

describe("tokenDeRecuperacion", () => {
  it("saca el token del enlace del correo", () => {
    equal(tokenDeRecuperacion("#/recuperar/abc123"), "abc123");
  });

  it("entiende el token codificado", () => {
    equal(tokenDeRecuperacion("#/recuperar/a%2Eb%2Dc"), "a.b-c");
  });

  it("no ve token donde no lo hay", () => {
    equal(tokenDeRecuperacion(""), null);
    equal(tokenDeRecuperacion("#/recuperar/"), null);
    equal(tokenDeRecuperacion("#/otra/cosa"), null);
    equal(tokenDeRecuperacion("#/recuperar/uno/dos"), null);
  });

  it("aguanta un hash mal codificado sin romperse", () => {
    equal(tokenDeRecuperacion("#/recuperar/%E0%A4%A"), null);
  });
});
