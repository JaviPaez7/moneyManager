import { useState, type FormEvent } from "react";
import { pb } from "./lib/pb";

/**
 * La pantalla a la que lleva el enlace del correo. Vive fuera del login: quien
 * llega aquí no tiene sesión que valga —justamente por eso ha pedido el
 * enlace— y el token del correo es toda su credencial.
 */
export default function Recuperar({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("La contraseña necesita 8 caracteres como mínimo.");
      return;
    }
    setState("busy");
    setError(null);
    try {
      await pb.collection("users").confirmPasswordReset(token, password, password);
      // El token del correo se gasta al usarlo y las sesiones viejas dejan de
      // valer: se limpia el hash para no dejarlo en el historial y se entra
      // por la puerta normal, con la contraseña nueva.
      pb.authStore.clear();
      setState("done");
      setTimeout(() => {
        window.location.hash = "";
        window.location.reload();
      }, 1400);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      setError(
        status === 0
          ? "No hay conexión con el servidor."
          : "Ese enlace ya no vale: o se ha usado o ha caducado. Pide otro desde la pantalla de entrada.",
      );
      setState("idle");
    }
  }

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={submit}>
        <h1>Neto</h1>
        <p className="lede">
          {state === "done"
            ? "Hecho. Entra con la contraseña nueva."
            : "Pon una contraseña nueva y ya está."}
        </p>

        {state !== "done" && (
          <label>
            La nueva
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              autoFocus
            />
          </label>
        )}

        {error && <p className="gate-error">{error}</p>}

        {state !== "done" && (
          <button type="submit" className="primary" disabled={state === "busy"}>
            {state === "busy" ? "Guardando…" : "Guardar"}
          </button>
        )}

        <p className="gate-foot">
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              window.location.hash = "";
              window.location.reload();
            }}
          >
            Volver a la entrada
          </button>
        </p>
      </form>
    </div>
  );
}
