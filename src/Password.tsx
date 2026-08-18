import { useState, type FormEvent } from "react";
import { pb } from "./lib/pb";

/**
 * Las cuentas se crean con una contraseña provisional, así que cada uno tiene
 * que poder cambiarla sin pedirle nada a nadie. La regla de PocketBase solo
 * deja tocar la ficha propia.
 */
export default function Password({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [oldPassword, setOld] = useState("");
  const [password, setNew] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("La nueva necesita 8 caracteres como mínimo.");
      return;
    }
    setState("busy");
    setError(null);
    try {
      await pb.collection("users").update(userId, {
        oldPassword,
        password,
        passwordConfirm: password,
      });
      // PocketBase invalida el token al cambiar la contraseña: hay que volver
      // a entrar con la nueva.
      await pb.collection("users").authWithPassword(pb.authStore.record!.email as string, password);
      setState("done");
      setTimeout(onClose, 1200);
    } catch {
      setError("La contraseña de ahora no es esa.");
      setState("idle");
    }
  }

  return (
    <form className="book-panel" onSubmit={submit}>
      <p className="hint">Cambiar tu contraseña</p>
      <label>
        La de ahora
        <input
          type="password"
          value={oldPassword}
          onChange={(e) => setOld(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      <label>
        La nueva
        <input
          type="password"
          value={password}
          onChange={(e) => setNew(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      <button type="submit" className="ghost" disabled={state !== "idle"}>
        {state === "busy" ? "Cambiando…" : state === "done" ? "Hecho" : "Cambiar"}
      </button>
      <button type="button" className="text-btn" onClick={onClose}>
        Dejarlo
      </button>
      {error && <p className="gate-error">{error}</p>}
    </form>
  );
}
