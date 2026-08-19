/**
 * Genera todos los iconos de Neto a partir de un único SVG.
 *
 *   node infra/icons.mjs
 *
 * Existe porque los PNG anteriores se hicieron rasterizando el SVG con un
 * ImageMagick sin librsvg, que se come los trazos: salieron cuadrados vacíos y
 * así estuvieron en la pantalla de inicio hasta que alguien preguntó "¿logo?".
 * Con resvg el PNG sale de la misma fuente que el SVG, sin sorpresas.
 */
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";

const TINTA = "#0B0C0F";
const PAPEL = "#FFFFFF";
const MORADO = "#7B61FF";
const AZUL = "#3E7BFA";

/**
 * La marca: lo que entra, lo que sale y lo que queda. Tres barras que menguan;
 * la última, la que importa, en azul.
 */
function marca({ fondo, barras, escala = 1, margen = 0 }) {
  const anchos = [60, 40, 24];
  const y = [24, 44, 64];
  const barra = (i) => {
    const w = anchos[i] * escala;
    const x = 50 - (60 * escala) / 2;
    const alto = 11 * escala;
    const cy = 50 + (y[i] + 5.5 - 50) * escala - alto / 2;
    const color = i === 2 ? "url(#g)" : barras;
    return `<rect x="${x.toFixed(2)}" y="${cy.toFixed(2)}" width="${w.toFixed(2)}" height="${alto.toFixed(2)}" rx="${(alto / 2).toFixed(2)}" fill="${color}"${i === 1 ? ' opacity="0.55"' : ""}/>`;
  };
  const fondoSvg = fondo
    ? `<rect width="100" height="100"${margen ? ` rx="${margen}"` : ""} fill="${fondo}"/>`
    : "";
  // La barra que queda lleva el degradado de la app.
  const grad = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${MORADO}"/><stop offset="1" stop-color="${AZUL}"/></linearGradient></defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${grad}${fondoSvg}${barra(0)}${barra(1)}${barra(2)}</svg>`;
}

// La imagen para compartir tiene que salir con las tipografías de la marca,
// no con lo que haya instalado en la máquina que la genere.
const TIPOS = new URL("./fonts/", import.meta.url).pathname;
const fuentes = {
  fontFiles: [`${TIPOS}/archivo.ttf`, `${TIPOS}/plexmono.ttf`],
  loadSystemFonts: false,
  defaultFontFamily: "Archivo",
};

function png(svg, size, salida) {
  const datos = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    font: fuentes,
  }).render().asPng();
  writeFileSync(salida, datos);
  console.log(`${salida} (${size}px)`);
}

// Favicon: sin fondo redondeado, que el navegador ya lo encuadra.
const favicon = marca({ fondo: TINTA, barras: PAPEL, margen: 20 });
writeFileSync("public/favicon.svg", favicon);
console.log("public/favicon.svg");

// iOS recorta el suyo, así que va a sangre y con la marca al 100%.
png(marca({ fondo: TINTA, barras: PAPEL }), 180, "public/apple-touch-icon.png");

// Android enmascara: la marca se encoge para caber en la zona segura.
const maskable = marca({ fondo: TINTA, barras: PAPEL, escala: 0.68 });
png(maskable, 192, "public/icon-192.png");
png(maskable, 512, "public/icon-512.png");

/* ---------- imagen para compartir enlaces ---------- */

const og = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="tarjeta" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${MORADO}"/>
      <stop offset="1" stop-color="${AZUL}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="${TINTA}"/>

  <g transform="translate(80 62) scale(0.72)">
    ${marca({ fondo: "#16181D", barras: PAPEL, margen: 20 }).replace(/<\/?svg[^>]*>/g, "")}
  </g>
  <text x="176" y="112" font-family="Archivo" font-size="34" font-weight="700" fill="${PAPEL}">Neto</text>

  <rect x="80" y="180" width="1040" height="290" rx="34" fill="url(#tarjeta)"/>
  <text x="128" y="252" font-family="Archivo" font-size="26" font-weight="600" fill="rgba(255,255,255,0.8)">Te queda este mes</text>
  <text x="128" y="368" font-family="Archivo" font-size="112" font-weight="800" letter-spacing="-4" fill="#FFFFFF">1.787,01 €</text>
  <text x="128" y="418" font-family="Archivo" font-size="26" fill="rgba(255,255,255,0.8)">De 1.800,00 € cobrados, ya sin fijos ni suscripciones</text>

  ${[
    ["Ingresos", "1.800,00 €"],
    ["Fijos", "−780,00 €"],
    ["Suscripciones", "−12,99 €"],
  ]
    .map(
      ([k, v], i) => `
  <text x="${128 + i * 330}" y="530" font-family="Archivo" font-size="24" fill="#9AA1AE">${k}</text>
  <text x="${128 + i * 330}" y="572" font-family="Archivo" font-size="34" font-weight="700" fill="${PAPEL}">${v}</text>`,
    )
    .join("")}
</svg>`;

png(og, 1200, "public/og.png");
