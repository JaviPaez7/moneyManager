import { register } from "node:module";

register(import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    const relativo = specifier.startsWith(".") || specifier.startsWith("/");
    if (relativo && !/\.[a-z]+$/i.test(specifier)) {
      return await nextResolve(`${specifier}.ts`, context);
    }
    throw err;
  }
}
