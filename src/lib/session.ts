/**
 * Que una petición falle no significa que la sesión haya muerto: sin cobertura
 * ni llega a salir (status 0) y el token guardado sigue siendo bueno. Cerrar
 * sesión ahí dejaría fuera a quien abre la app en el metro, que es justo uno de
 * los sitios donde se usa. Solo cuenta lo que el servidor responde.
 */
export function esSesionMuerta(error: unknown): boolean {
  const status = (error as { status?: number } | null | undefined)?.status;
  return status === 400 || status === 401 || status === 403;
}
