/**
 * Los imports del proyecto van sin extensión, que es lo que espera Vite. Node,
 * al ejecutar los tests, exige la ruta exacta: aquí se le añade ".ts" cuando la
 * resolución normal no encuentra nada.
 *
 * Es todo lo que hace falta para correr los tests con el `node --test` que ya
 * viene puesto, sin meter un runner y su árbol de dependencias detrás.
 */
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (err) {
      const relativo = specifier.startsWith(".") || specifier.startsWith("/");
      if (relativo && !/\.[a-z]+$/i.test(specifier)) return next(`${specifier}.ts`, context);
      throw err;
    }
  },
});
