import type { Section } from "./types";
import { VARIABLE_CATS } from "./types";

function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/**
 * Las palabras clave se buscan enteras, no como trozo suelto: "Netflix"
 * contiene "etf" y acababa clasificado como ahorro, y "digital" caía en la
 * operadora "digi".
 */
function has(hay: string, keyword: string) {
  const clean = fold(keyword).trim();
  if (!clean) return false;
  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(hay);
}

const SUSCRIPCION = [
  "netflix",
  "spotify",
  "hbo",
  "disney",
  "prime video",
  "amazon prime",
  "youtube premium",
  "youtube music",
  "icloud",
  "apple music",
  "apple one",
  "apple tv",
  "chatgpt",
  "openai",
  "cursor",
  "github",
  "copilot",
  "adobe",
  "dropbox",
  "canva",
  "twitch",
  "crunchyroll",
  "deezer",
  "xbox",
  "playstation",
  "game pass",
  "nintendo",
  "dazn",
  "movistar plus",
  "max",
  "google one",
  "microsoft 365",
  "office 365",
  "gym",
  "gimnasio",
  "suscripcion",
  "suscripciones",
  "premium",
];

const FIJO = [
  "mensualidad",
  "hipoteca",
  "alquiler",
  "comunidad",
  "ibi",
  "seguro",
  "prestamo",
  "préstamo",
  "letra del",
  "letra coche",
  "tarifa movil",
  "tarifa móvil",
  "iberdrola",
  "endesa",
  "naturgy",
  "vodafone",
  "orange",
  "yoigo",
  "masmovil",
  "másmóvil",
  "pepephone",
  "lowi",
  "finetwork",
  "digi",
  "movistar",
  "telefono",
  "teléfono",
  "factura luz",
  "factura del agua",
  "gas natural",
];

const VARIABLE_HINTS: Record<(typeof VARIABLE_CATS)[number], string[]> = {
  Comida: [
    "mercadona",
    "carrefour",
    "lidl",
    "aldi",
    "dia",
    "alcampo",
    "consum",
    "glovo",
    "uber eats",
    "just eat",
    "restaurante",
    "bar",
    "cafe",
    "cafeteria",
    "café",
    "comida",
    "supermercado",
    "kebab",
    "mcdonald",
    "burger",
  ],
  Transporte: [
    "gasolina",
    "diesel",
    "uber",
    "cabify",
    "bolt",
    "renfe",
    "metro",
    "bus",
    "emt",
    "parking",
    "peaje",
    "transporte",
  ],
  Hogar: ["ikea", "leroy", "bricor", "limpieza", "mueble", "hogar"],
  Ocio: ["cine", "copas", "concierto", "steam", "entrada", "ocio", "viajes"],
  Salud: ["farmacia", "medico", "médico", "dentista", "fisio", "salud"],
  Otros: [],
};

/**
 * En qué sección cae un gasto. Solo devuelve las tres del formulario: el
 * ahorro tiene su propia pestaña y no se adivina desde aquí.
 */
export function classifySection(note: string, category = ""): Section {
  const hay = ` ${fold(`${note} ${category}`)} `;
  if (SUSCRIPCION.some((k) => has(hay, k))) return "suscripcion";
  if (FIJO.some((k) => has(hay, k))) return "fijo";
  if (/\b(movil|telefono|coche)\b/.test(hay) && /mensual|tarifa|letra|cuota/.test(hay)) {
    return "fijo";
  }
  return "variable";
}

export function classifyVariableCategory(note: string): (typeof VARIABLE_CATS)[number] {
  const hay = ` ${fold(note)} `;
  for (const cat of VARIABLE_CATS) {
    if (cat === "Otros") continue;
    if (VARIABLE_HINTS[cat].some((k) => has(hay, k))) return cat;
  }
  return "Otros";
}

export function shouldRepeat(section: Section, kind: "income" | "expense" | "saving") {
  if (kind === "saving") return false;
  if (kind === "income") return true;
  return section === "fijo" || section === "suscripcion";
}
