import { useState, type FormEvent } from "react";
import { pb } from "./lib/pb";

type Modo = "entrar" | "crear";

export default function Login({ onIn }: { onIn: () => void }) {
  const [modo, setModo] = useState<Modo>("entrar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const correo = email.trim();
    try {
      if (modo === "crear") {
        await pb.collection("users").create({
          email: correo,
          password,
          passwordConfirm: password,
          name: name.trim() || correo.split("@")[0],
        });
      }
      await pb.collection("users").authWithPassword(correo, password);
      onIn();
    } catch (err) {
      setError(mensaje(err, modo));
      setBusy(false);
    }
  }

  function cambiarModo(siguiente: Modo) {
    setModo(siguiente);
    setError(null);
  }

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={submit}>
        <h1>Neto</h1>
        <p className="lede">
          {modo === "entrar"
            ? "Lo que te queda cada mes, sin adornos. Entra para verlo."
            : "Crea tu cuenta y empieza a apuntar."}
        </p>

        {modo === "crear" && (
          <label>
            Nombre
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como quieres que te vean"
              autoComplete="name"
              maxLength={40}
            />
          </label>
        )}

        <label>
          Correo
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={modo === "crear" ? "new-password" : "current-password"}
            minLength={modo === "crear" ? 8 : undefined}
            required
          />
        </label>

        {error && <p className="gate-error">{error}</p>}

        <button type="submit" className="primary" disabled={busy}>
          {busy
            ? modo === "crear"
              ? "Creando…"
              : "Entrando…"
            : modo === "crear"
              ? "Crear cuenta"
              : "Entrar"}
        </button>

        <p className="gate-foot">
          {modo === "entrar" ? (
            <>
              ¿No tienes cuenta?{" "}
              <button type="button" className="text-btn" onClick={() => cambiarModo("crear")}>
                Créate una
              </button>
            </>
          ) : (
            <>
              La contraseña necesita 8 caracteres.{" "}
              <button type="button" className="text-btn" onClick={() => cambiarModo("entrar")}>
                Ya tengo cuenta
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  );
}

function mensaje(err: unknown, modo: Modo) {
  const e = err as { status?: number; response?: { data?: Record<string, { message?: string }> } };
  if (e?.status === 0) return "No hay conexión con el servidor.";
  if (modo === "crear") {
    const campos = e?.response?.data || {};
    if (campos.email) return "Ese correo ya tiene cuenta, o no es un correo válido.";
    if (campos.password) return "La contraseña necesita 8 caracteres como mínimo.";
    return "No he podido crear la cuenta.";
  }
  return "Ese correo o esa contraseña no valen.";
}
