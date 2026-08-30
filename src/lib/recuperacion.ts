/**
 * El enlace del correo trae el token en el hash (`#/recuperar/TOKEN`) y no en
 * la ruta. Dos razones: el nginx que sirve el sitio no tiene que aprenderse
 * ninguna ruta de la app —es el mismo que sirve otros nueve sitios—, y lo que
 * va detrás de la almohadilla no se manda al servidor, así que el token no
 * acaba escrito en ningún registro de accesos.
 */
export function tokenDeRecuperacion(hash: string): string | null {
  const encontrado = /^#\/recuperar\/([^/?#]+)$/.exec(hash || "");
  if (!encontrado) return null;
  try {
    return decodeURIComponent(encontrado[1]).trim() || null;
  } catch {
    // Un hash a medio escribir o mal codificado no es un enlace de nadie.
    return null;
  }
}
