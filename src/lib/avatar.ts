/**
 * El círculo de color de cada movimiento. Las apps de banco enseñan ahí el
 * logo del comercio; nosotros no lo tenemos, así que va la inicial sobre un
 * color derivado del propio texto: el mismo concepto sale siempre del mismo
 * color, sin guardar nada.
 */

const TONOS = [
  "#7B61FF",
  "#3E7BFA",
  "#2ED47A",
  "#F5A524",
  "#FF6B6B",
  "#00B8D9",
  "#C86DD7",
  "#4CAF50",
  "#FF8A3D",
  "#5B8DEF",
];

function huella(texto: string) {
  let h = 0;
  for (let i = 0; i < texto.length; i += 1) {
    h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function inicial(texto: string) {
  const limpio = texto.trim();
  if (!limpio) return "·";
  // Las mayúsculas con tilde ocupan de más en un círculo pequeño.
  return limpio[0].toUpperCase().normalize("NFD").replace(/\p{M}/gu, "");
}

export function colorDe(texto: string) {
  return TONOS[huella(texto.trim().toLowerCase()) % TONOS.length];
}
