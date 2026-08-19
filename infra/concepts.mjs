/**
 * Tarjetas de identidad para elegir dirección de marca.
 * Genera un PNG por dirección: marca, logotipo, paleta y una muestra de
 * interfaz, para poder compararlas de un vistazo.
 *
 *   node infra/concepts.mjs
 */
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync, mkdirSync } from "node:fs";

const OUT = "/tmp/claude-0/-root/42265aab-29c3-433f-acaf-6bc3773515dc/scratchpad/marca";
mkdirSync(OUT, { recursive: true });

const W = 1000;
const H = 620;

/* ---------- marcas ---------- */

// CANTO: el canto de un fichero, pestañas escalonadas; la activa a plena altura.
const marcaCanto = (x, y, s, tinta, acento) => `
  <g transform="translate(${x} ${y}) scale(${s / 100})">
    <rect x="0" y="0" width="100" height="100" rx="22" fill="${tinta}"/>
    <rect x="20" y="26" width="10" height="48" rx="5" fill="${acento}" opacity="0.45"/>
    <rect x="36" y="20" width="10" height="60" rx="5" fill="${acento}" opacity="0.7"/>
    <rect x="52" y="14" width="28" height="72" rx="6" fill="${acento}"/>
  </g>`;

// QUEDA: la línea del total. Una Q cuyo rabo es la raya que cierra la cuenta.
const marcaQueda = (x, y, s, tinta, acento) => `
  <g transform="translate(${x} ${y}) scale(${s / 100})">
    <rect x="0" y="0" width="100" height="100" rx="22" fill="${tinta}"/>
    <circle cx="50" cy="46" r="26" fill="none" stroke="${acento}" stroke-width="11"/>
    <rect x="44" y="60" width="42" height="11" rx="5.5" fill="${acento}"/>
  </g>`;

// NETO: lo que entra, lo que sale y lo que queda. Tres barras que menguan.
const marcaNeto = (x, y, s, tinta, acento) => `
  <g transform="translate(${x} ${y}) scale(${s / 100})">
    <rect x="0" y="0" width="100" height="100" rx="22" fill="${tinta}"/>
    <rect x="20" y="24" width="60" height="11" rx="5.5" fill="${acento}"/>
    <rect x="20" y="44" width="40" height="11" rx="5.5" fill="${acento}" opacity="0.55"/>
    <rect x="20" y="64" width="24" height="11" rx="5.5" fill="${acento}"/>
  </g>`;

// Neobanco: la salida estándar. Tarjeta con degradado.
const marcaCanon = (x, y, s, tinta, acento) => `
  <g transform="translate(${x} ${y}) scale(${s / 100})">
    <defs>
      <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${acento}"/>
        <stop offset="1" stop-color="#8b5cf6"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="100" height="100" rx="24" fill="${tinta}"/>
    <rect x="18" y="30" width="64" height="40" rx="8" fill="url(#g1)"/>
    <rect x="26" y="54" width="20" height="6" rx="3" fill="#fff" opacity="0.85"/>
  </g>`;

/* ---------- direcciones ---------- */

const direcciones = [
  {
    id: "canto",
    kicker: "DIRECCIÓN A",
    nombre: "Canto",
    tesis: "Cada libro es una división con su color a sangre y su pestaña en el canto.",
    marca: marcaCanto,
    fondo: "#1F4D3F",
    papel: "#F2EFE6",
    tinta: "#12241E",
    acento: "#E8C547",
    negativo: "#E2481F",
    tenue: "#5C7A6E",
    fuente: "Lato",
    muestra: "pestanas",
    notas: ["Color por libro a sangre", "Rail de pestañas escalonadas", "Bermellón solo para números rojos"],
  },
  {
    id: "queda",
    kicker: "DIRECCIÓN B",
    nombre: "Queda",
    tesis: "Una libreta de bolsillo: papel crema, canto teñido y la raya que cierra la cuenta.",
    marca: marcaQueda,
    fondo: "#F4EFE2",
    papel: "#FBF8F0",
    tinta: "#1C1A16",
    acento: "#B4472F",
    negativo: "#B4472F",
    tenue: "#8A8375",
    fuente: "Lato",
    muestra: "libreta",
    notas: ["Papel crema, tinta cálida", "El mes es una página", "Los fijos salen preimpresos"],
  },
  {
    id: "neto",
    kicker: "DIRECCIÓN C",
    nombre: "Neto",
    tesis: "Un solo número manda en la pantalla; todo lo demás es letra pequeña de máquina.",
    marca: marcaNeto,
    fondo: "#FAFAF8",
    papel: "#FFFFFF",
    tinta: "#101010",
    acento: "#0033FF",
    negativo: "#D50000",
    tenue: "#9A9A96",
    fuente: "Lato",
    muestra: "especimen",
    notas: ["Jerarquía solo por escala", "Cifras tabulares enormes", "Sin cajas ni sombras"],
  },
  {
    id: "canon",
    kicker: "LA DE SIEMPRE",
    nombre: "Money",
    tesis: "Neobanco: fondo oscuro, tarjetas redondeadas y un degradado de acento.",
    marca: marcaCanon,
    fondo: "#0E1116",
    papel: "#171B22",
    tinta: "#F2F5F7",
    acento: "#3B82F6",
    negativo: "#F87171",
    tenue: "#7A8494",
    fuente: "Lato",
    muestra: "neobanco",
    notas: ["Lo que hace todo el mundo", "Funciona y no sorprende", "Cero riesgo, cero carácter"],
  },
];

/* ---------- muestras de interfaz ---------- */

function muestra(d) {
  const x = 560;
  const y = 96;
  const w = 380;
  const h = 440;
  if (d.muestra === "pestanas") {
    return `
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${d.fondo}"/>
      <rect x="${x}" y="${y + 40}" width="14" height="90" fill="${d.acento}" opacity="0.5"/>
      <rect x="${x}" y="${y + 140}" width="22" height="120" fill="${d.acento}"/>
      <rect x="${x}" y="${y + 270}" width="14" height="70" fill="${d.acento}" opacity="0.3"/>
      <rect x="${x + 40}" y="${y + 34}" width="${w - 76}" height="${h - 76}" rx="8" fill="${d.papel}" opacity="0.94"/>
      <text x="${x + 64}" y="${y + 78}" font-family="${d.fuente}" font-size="15" letter-spacing="3" fill="${d.tenue}">NOSOTROS · AGOSTO</text>
      <text x="${x + 64}" y="${y + 150}" font-family="${d.fuente}" font-size="62" font-weight="900" fill="${d.tinta}">1.787,01</text>
      <text x="${x + 64}" y="${y + 180}" font-family="${d.fuente}" font-size="16" fill="${d.tenue}">queda después de fijos</text>
      ${[["Ingresos", "1.800,00", d.tinta], ["Fijos", "−780,00", d.negativo], ["Suscripciones", "−12,99", d.negativo], ["Ahorro", "−180,00", d.tinta]]
        .map(
          ([k, v, c], i) => `
        <text x="${x + 64}" y="${y + 232 + i * 40}" font-family="${d.fuente}" font-size="17" fill="${d.tenue}">${k}</text>
        <text x="${x + w - 76}" y="${y + 232 + i * 40}" font-family="${d.fuente}" font-size="17" font-weight="700" fill="${c}" text-anchor="end">${v}</text>`,
        )
        .join("")}
      <rect x="${x + 64}" y="${y + 400}" width="${w - 140}" height="2" fill="${d.tinta}" opacity="0.25"/>
    `;
  }

  if (d.muestra === "libreta") {
    // Pauta solo donde no hay filas escritas, como una libreta a medio usar.
    const pauta = Array.from({ length: 3 }, (_, i) =>
      `<rect x="${x + 44}" y="${y + 360 + i * 30}" width="${w - 88}" height="1" fill="${d.tenue}" opacity="0.3"/>`,
    ).join("");
    return `
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${d.papel}"/>
      <rect x="${x}" y="${y}" width="16" height="${h}" rx="6" fill="${d.acento}"/>
      <rect x="${x + w - 58}" y="${y}" width="20" height="86" fill="${d.acento}" opacity="0.85"/>
      <text x="${x + 44}" y="${y + 56}" font-family="${d.fuente}" font-size="14" letter-spacing="4" fill="${d.tenue}">AGOSTO 2026</text>
      <text x="${x + 44}" y="${y + 132}" font-family="${d.fuente}" font-size="58" font-weight="900" fill="${d.tinta}">1.787,01 €</text>
      <text x="${x + 44}" y="${y + 162}" font-family="${d.fuente}" font-size="16" fill="${d.tenue}">te queda este mes</text>
      ${pauta}
      ${[["Alquiler", "−780,00", true], ["Netflix", "−12,99", true], ["Mercadona", "−41,20", false]]
        .map(
          ([k, v, fijo], i) => `
        <text x="${x + 44}" y="${y + 232 + i * 46}" font-family="${d.fuente}" font-size="17" fill="${fijo ? d.tenue : d.tinta}">${k}${fijo ? "  ·  cada mes" : ""}</text>
        <text x="${x + w - 44}" y="${y + 232 + i * 46}" font-family="${d.fuente}" font-size="17" font-weight="700" fill="${d.tinta}" text-anchor="end">${v}</text>`,
        )
        .join("")}
    `;
  }

  if (d.muestra === "especimen") {
    return `
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${d.papel}"/>
      <text x="${x + 30}" y="${y + 50}" font-family="DejaVu Sans Mono" font-size="12" letter-spacing="2" fill="${d.tenue}">AGO 2026 / NOSOTROS</text>
      <text x="${x + 26}" y="${y + 210}" font-family="${d.fuente}" font-size="104" font-weight="900" letter-spacing="-4" fill="${d.tinta}">1787</text>
      <text x="${x + 26}" y="${y + 250}" font-family="${d.fuente}" font-size="40" font-weight="300" fill="${d.tenue}">,01 €</text>
      <rect x="${x + 26}" y="${y + 274}" width="${w - 52}" height="3" fill="${d.acento}"/>
      ${[["INGRESOS", "1800,00"], ["FIJOS", "-780,00"], ["SUSCRIPCIONES", "-12,99"], ["AHORRO", "-180,00"]]
        .map(
          ([k, v], i) => `
        <text x="${x + 26}" y="${y + 312 + i * 34}" font-family="DejaVu Sans Mono" font-size="12" letter-spacing="1" fill="${d.tenue}">${k}</text>
        <text x="${x + w - 26}" y="${y + 312 + i * 34}" font-family="DejaVu Sans Mono" font-size="15" fill="${d.tinta}" text-anchor="end">${v}</text>`,
        )
        .join("")}
    `;
  }

  // neobanco
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${d.fondo}"/>
    <rect x="${x + 24}" y="${y + 30}" width="${w - 48}" height="130" rx="16" fill="${d.papel}"/>
    <text x="${x + 48}" y="${y + 68}" font-family="${d.fuente}" font-size="14" fill="${d.tenue}">Balance disponible</text>
    <text x="${x + 48}" y="${y + 122}" font-family="${d.fuente}" font-size="44" font-weight="900" fill="${d.tinta}">1.787,01 €</text>
    ${[["Ingresos", "1.800,00", d.acento], ["Fijos", "−780,00", d.negativo], ["Suscripciones", "−12,99", d.negativo]]
      .map(
        ([k, v, c], i) => `
      <rect x="${x + 24}" y="${y + 184 + i * 74}" width="${w - 48}" height="60" rx="14" fill="${d.papel}"/>
      <circle cx="${x + 56}" cy="${y + 214 + i * 74}" r="14" fill="${c}" opacity="0.25"/>
      <text x="${x + 82}" y="${y + 220 + i * 74}" font-family="${d.fuente}" font-size="16" fill="${d.tinta}">${k}</text>
      <text x="${x + w - 48}" y="${y + 220 + i * 74}" font-family="${d.fuente}" font-size="16" font-weight="700" fill="${c}" text-anchor="end">${v}</text>`,
      )
      .join("")}
  `;
}

/* ---------- tarjeta ---------- */

/** Partir en líneas a mano: resvg no envuelve texto. */
function partir(texto, ancho) {
  const lineas = [];
  let actual = "";
  for (const palabra of texto.split(" ")) {
    if ((actual + " " + palabra).trim().length > ancho) {
      lineas.push(actual.trim());
      actual = palabra;
    } else {
      actual += " " + palabra;
    }
  }
  if (actual.trim()) lineas.push(actual.trim());
  return lineas;
}

function tarjeta(d) {
  const chips = [d.tinta, d.acento, d.negativo, d.papel, d.tenue];
  const claroSobreFondo = d.id === "canon" || d.id === "canto";
  const texto = claroSobreFondo ? "#F6F4EE" : d.tinta;
  const suave = claroSobreFondo ? "rgba(246,244,238,0.62)" : d.tenue;
  const fondoTarjeta = d.id === "canon" ? "#0A0D11" : d.id === "canto" ? "#173C31" : d.fondo;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${fondoTarjeta}"/>
  <text x="60" y="70" font-family="${d.fuente}" font-size="13" letter-spacing="4" fill="${suave}">${d.kicker}</text>
  ${d.marca(60, 96, 96, d.id === "queda" || d.id === "neto" ? d.tinta : d.papel, d.acento)}
  <text x="60" y="270" font-family="${d.fuente}" font-size="66" font-weight="900" letter-spacing="-2" fill="${texto}">${d.nombre}</text>
  ${partir(d.tesis, 46)
    .map((linea, i) => `<text x="60" y="${312 + i * 27}" font-family="${d.fuente}" font-size="18" fill="${suave}">${linea}</text>`)
    .join("")}
  ${d.notas
    .map(
      (n, i) => `
  <circle cx="66" cy="${420 + i * 32}" r="3" fill="${d.acento}"/>
  <text x="82" y="${425 + i * 32}" font-family="${d.fuente}" font-size="16" fill="${suave}">${n}</text>`,
    )
    .join("")}
  ${chips
    .map(
      (c, i) => `<rect x="${60 + i * 44}" y="540" width="36" height="36" rx="8" fill="${c}" stroke="rgba(128,128,128,0.35)" stroke-width="1"/>`,
    )
    .join("")}
  ${muestra(d)}
</svg>`;
}

for (const d of direcciones) {
  const svg = tarjeta(d);
  writeFileSync(`${OUT}/${d.id}.svg`, svg);
  const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
  writeFileSync(`${OUT}/${d.id}.png`, png);
  console.log(`${d.id}.png`);
}
