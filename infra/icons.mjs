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

const TINTA = "#101010";
const AZUL = "#0033FF";
const PAPEL = "#FAFAF8";

/**
 * La marca: lo que entra, lo que sale y lo que queda. Tres barras que menguan;
 * la última, la que importa, en azul.
 */
function marca({ fondo, barras, ultima, escala = 1, margen = 0 }) {
  const anchos = [60, 40, 24];
  const y = [24, 44, 64];
  const barra = (i) => {
    const w = anchos[i] * escala;
    const x = 50 - (60 * escala) / 2;
    const alto = 11 * escala;
    const cy = 50 + (y[i] + 5.5 - 50) * escala - alto / 2;
    const color = i === 2 ? ultima : barras;
    return `<rect x="${x.toFixed(2)}" y="${cy.toFixed(2)}" width="${w.toFixed(2)}" height="${alto.toFixed(2)}" rx="${(alto / 2).toFixed(2)}" fill="${color}"${i === 1 ? ' opacity="0.55"' : ""}/>`;
  };
  const fondoSvg = fondo
    ? `<rect width="100" height="100"${margen ? ` rx="${margen}"` : ""} fill="${fondo}"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${fondoSvg}${barra(0)}${barra(1)}${barra(2)}</svg>`;
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
const favicon = marca({ fondo: TINTA, barras: PAPEL, ultima: AZUL, margen: 20 });
writeFileSync("public/favicon.svg", favicon);
console.log("public/favicon.svg");

// iOS recorta el suyo, así que va a sangre y con la marca al 100%.
png(marca({ fondo: TINTA, barras: PAPEL, ultima: AZUL }), 180, "public/apple-touch-icon.png");

// Android enmascara: la marca se encoge para caber en la zona segura.
const maskable = marca({ fondo: TINTA, barras: PAPEL, ultima: AZUL, escala: 0.68 });
png(maskable, 192, "public/icon-192.png");
png(maskable, 512, "public/icon-512.png");

/* ---------- imagen para compartir enlaces ---------- */

const og = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="${PAPEL}"/>
  <g transform="translate(80 74) scale(1.1)">
    ${marca({ fondo: TINTA, barras: PAPEL, ultima: AZUL, margen: 20 }).replace(/<\/?svg[^>]*>/g, "")}
  </g>
  <text x="80" y="330" font-family="Archivo" font-size="150" font-weight="800" letter-spacing="-6" fill="${TINTA}">1.787,01 €</text>
  <text x="80" y="392" font-family="IBM Plex Mono" font-size="24" letter-spacing="3" fill="#6E6E68">LO QUE TE QUEDA ESTE MES</text>
  <rect x="80" y="440" width="1040" height="2" fill="#E2E2DC"/>
  ${[
    ["INGRESOS", "1.800,00"],
    ["FIJOS", "−780,00"],
    ["SUSCRIPCIONES", "−12,99"],
  ]
    .map(
      ([k, v], i) => `
  <text x="${80 + i * 350}" y="490" font-family="IBM Plex Mono" font-size="19" letter-spacing="2" fill="#6E6E68">${k}</text>
  <text x="${80 + i * 350}" y="530" font-family="IBM Plex Mono" font-size="30" fill="${TINTA}">${v}</text>`,
    )
    .join("")}
  <text x="80" y="596" font-family="IBM Plex Mono" font-size="20" letter-spacing="3" fill="#6E6E68">NETO · JAVISTUDIO</text>
</svg>`;

png(og, 1200, "public/og.png");
