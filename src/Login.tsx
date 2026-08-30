import { useState, type FormEvent } from "react";
import { pb } from "./lib/pb";

type Modo = "entrar" | "crear" | "olvidada";

export default function Login({ onIn }: { onIn: () => void }) {
  const [modo, setModo] = useState<Modo>("entrar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const correo = email.trim();
    try {
      if (modo === "olvidada") {
        await pb.collection("users").requestPasswordReset(correo);
        setEnviado(true);
        setBusy(false);
        return;
      }
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
    setEnviado(false);
  }

  // Mandado el enlace, no hay nada más que hacer aquí: el resto pasa en el
  // correo. Se dice sin confirmar si esa cuenta existe, que es de quien sea.
  if (modo === "olvidada" && enviado) {
    return (
      <div className="gate">
        <div className="gate-card">
          <h1>Neto</h1>
          <p className="lede">
            Si ese correo tiene cuenta, ya va camino un enlace para poner una
            contraseña nueva. Vale durante media hora.
          </p>
          <p className="gate-foot">
            <button type="button" className="text-btn" onClick={() => cambiarModo("entrar")}>
              Volver a la entrada
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={submit}>
        <h1>Neto</h1>
        <p className="lede">
          {modo === "entrar"
            ? "Lo que te queda cada mes, sin adornos. Entra para verlo."
            : modo === "crear"
              ? "Crea tu cuenta y empieza a apuntar."
              : "Dinos tu correo y te mandamos un enlace para cambiarla."}
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
        {modo !== "olvidada" && (
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
        )}

        {error && <p className="gate-error">{error}</p>}

        <button type="submit" className="primary" disabled={busy}>
          {busy ? OCUPADO[modo] : LISTO[modo]}
        </button>

        <p className="gate-foot">
          {modo === "entrar" ? (
            <>
              ¿No tienes cuenta?{" "}
              <button type="button" className="text-btn" onClick={() => cambiarModo("crear")}>
                Créate una
              </button>
              {" · "}
              <button type="button" className="text-btn" onClick={() => cambiarModo("olvidada")}>
                No me acuerdo de la contraseña
              </button>
            </>
          ) : modo === "crear" ? (
            <>
              La contraseña necesita 8 caracteres.{" "}
              <button type="button" className="text-btn" onClick={() => cambiarModo("entrar")}>
                Ya tengo cuenta
              </button>
            </>
          ) : (
            <button type="button" className="text-btn" onClick={() => cambiarModo("entrar")}>
              Ya me acuerdo
            </button>
          )}
        </p>
      </form>
    </div>
  );
}

const OCUPADO: Record<Modo, string> = {
  entrar: "Entrando…",
  crear: "Creando…",
  olvidada: "Mandando…",
};

const LISTO: Record<Modo, string> = {
  entrar: "Entrar",
  crear: "Crear cuenta",
  olvidada: "Mandar el enlace",
};

function mensaje(err: unknown, modo: Modo) {
  const e = err as { status?: number; response?: { data?: Record<string, { message?: string }> } };
  if (e?.status === 0) return "No hay conexión con el servidor.";
  if (modo === "crear") {
    const campos = e?.response?.data || {};
    if (campos.email) return "Ese correo ya tiene cuenta, o no es un correo válido.";
    if (campos.password) return "La contraseña necesita 8 caracteres como mínimo.";
    return "No he podido crear la cuenta.";
  }
  if (modo === "olvidada") return "No he podido mandar el correo. Inténtalo en un rato.";
  return "Ese correo o esa contraseña no valen.";
}
