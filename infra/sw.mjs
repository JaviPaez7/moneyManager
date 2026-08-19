/**
 * Genera el service worker con la lista de ficheros del build.
 * Se ejecuta después de `vite build`, así que la lista siempre cuadra con lo
 * que se acaba de construir.
 *
 * Estrategia, a propósito distinta según qué se pide:
 *
 * - Navegación (el HTML): primero la red y la caché como respaldo. Al revés se
 *   corre el riesgo clásico de dejar a la gente clavada en una versión vieja
 *   para siempre.
 * - Ficheros con hash en el nombre (JS, CSS, tipografías): primero la caché.
 *   Son inmutables, así que no hay nada que revalidar.
 * - La API: no se toca. Los datos del mes ya se guardan aparte en el navegador
 *   y una caché de respuestas de la API solo serviría para enseñar saldos
 *   falsos.
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";

const DIST = "dist";

function listar(dir) {
  const salida = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...listar(ruta));
    else salida.push(ruta);
  }
  return salida;
}

const ficheros = listar(DIST)
  .map((f) => "/" + relative(DIST, f).split("\\").join("/"))
  // og.png solo lo pide quien previsualiza un enlace; ocupa más que el resto
  // del build junto y la app nunca lo enseña.
  .filter((f) => f !== "/sw.js" && f !== "/og.png" && !f.endsWith(".map"));

// La versión sale del contenido: si no cambia nada, el service worker tampoco,
// y los navegadores no reinstalan por gusto.
const version = createHash("sha256")
  .update(ficheros.map((f) => readFileSync(join(DIST, f.slice(1)))).join("|"))
  .digest("hex")
  .slice(0, 12);

const sw = `// Generado por infra/sw.mjs. No editar a mano.
const VERSION = ${JSON.stringify(version)};
const CACHE = "neto-" + VERSION;
const FICHEROS = ${JSON.stringify(ficheros, null, 2)};

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FICHEROS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const peticion = evento.request;
  if (peticion.method !== "GET") return;

  const url = new URL(peticion.url);
  // Solo lo nuestro: la API y cualquier otro dominio pasan de largo.
  if (url.origin !== self.location.origin) return;

  if (peticion.mode === "navigate") {
    evento.respondWith(
      fetch(peticion)
        .then((respuesta) => {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put("/index.html", copia));
          return respuesta;
        })
        .catch(() => caches.match("/index.html").then((r) => r || Response.error())),
    );
    return;
  }

  evento.respondWith(
    caches.match(peticion).then((enCache) => {
      if (enCache) return enCache;
      return fetch(peticion).then((respuesta) => {
        if (respuesta.ok && respuesta.type === "basic") {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put(peticion, copia));
        }
        return respuesta;
      });
    }),
  );
});
`;

writeFileSync(join(DIST, "sw.js"), sw);
console.log(`sw.js generado (${ficheros.length} ficheros, versión ${version})`);
