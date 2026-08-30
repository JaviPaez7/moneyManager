import PocketBase from "pocketbase";

// El backend vive en su propio subdominio; en local se puede apuntar a otra
// instancia con VITE_PB_URL.
export const pb = new PocketBase(
  import.meta.env.VITE_PB_URL || "https://api-neto.javistudio.dev",
);

// Cancelar peticiones al vuelo rompe las recargas que se disparan a la vez
// (mes + libro cambian juntos al entrar).
pb.autoCancellation(false);

// Si el servidor dice que la sesión ya no vale (token caducado, cuenta
// borrada), se cierra sesión y se ve la pantalla de entrada. Sin esto la app
// se queda enseñando un error del que no se sale.
pb.afterSend = (response, data) => {
  if (response.status === 401 && pb.authStore.isValid) pb.authStore.clear();
  return data;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export function currentUser(): AuthUser | null {
  // El navegador guarda la ficha y el token por separado, y la ficha no caduca:
  // `record` sigue ahí cinco días después, con el token ya muerto. Sin mirar
  // `isValid` la app dejaba pasar dentro con una sesión caducada, y entonces
  // todo lo que pedía salía sin autenticar: los listados volvían vacíos (que
  // para PocketBase no es un error) y el primer apunte moría con un 400.
  if (!pb.authStore.isValid) return null;
  const record = pb.authStore.record;
  if (!record) return null;
  return {
    id: record.id,
    name: (record.name as string) || (record.email as string).split("@")[0],
    email: record.email as string,
  };
}
