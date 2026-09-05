import { useEffect, useState, type FormEvent } from "react";
import { NetoBrandIcon } from "./icons";
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
  // El botón de Google solo sale si el servidor tiene el proveedor puesto. No
  // se enseña una puerta que no abre: mientras falten las credenciales en
  // PocketBase aquí no hay nada que pulsar, y aparece solo en cuanto estén.
  const [conGoogle, setConGoogle] = useState(false);

  useEffect(() => {
    let vivo = true;
    pb.collection("users")
      .listAuthMethods()
      .then((metodos) => {
        const hay =
          metodos.oauth2?.enabled &&
          metodos.oauth2.providers.some((proveedor) => proveedor.name === "google");
        if (vivo) setConGoogle(Boolean(hay));
      })
      .catch(() => {
        // Sin red no se pregunta: se queda la entrada de siempre, que es la
        // que funciona con lo que ya está guardado en el móvil.
      });
    return () => {
      vivo = false;
    };
  }, []);

  async function entrarConGoogle() {
    setBusy(true);
    setError(null);
    try {
      await pb.collection("users").authWithOAuth2({ provider: "google" });
      onIn();
    } catch (err) {
      // Cerrar la ventana de Google a medias cae aquí también, y eso no es un
      // fallo que merezca dramatismo.
      const status = (err as { status?: number })?.status;
      setError(
        status === 0
          ? "No hay conexión con el servidor."
          : "No se ha completado la entrada con Google.",
      );
      setBusy(false);
    }
  }

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
          <div className="gate-brand">
            <NetoBrandIcon size={44} />
          </div>
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
        <div className="gate-brand">
          <NetoBrandIcon size={44} />
        </div>
        <div className="gate-header">
          <h1>Neto</h1>
          <p className="lede">
            {modo === "entrar"
              ? "Control financiero mensual, claro y directo."
              : modo === "crear"
                ? "Crea tu cuenta y empieza a apuntar."
                : "Recupera el acceso a tu cuenta."}
          </p>
        </div>

        {modo !== "olvidada" && (
          <div className="gate-tabs" role="tablist" aria-label="Modo de acceso">
            <button
              type="button"
              role="tab"
              aria-selected={modo === "entrar"}
              className={modo === "entrar" ? "on" : ""}
              onClick={() => cambiarModo("entrar")}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modo === "crear"}
              className={modo === "crear" ? "on" : ""}
              onClick={() => cambiarModo("crear")}
            >
              Registrarse
            </button>
          </div>
        )}

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

        {conGoogle && modo !== "olvidada" && (
          <>
            <p className="gate-o">
              <span>o continuar con</span>
            </p>
            <button type="button" className="ghost google-btn" onClick={entrarConGoogle} disabled={busy}>
              <MarcaGoogle />
              <span>Google</span>
            </button>
          </>
        )}

        <div className="gate-foot">
          {modo === "entrar" ? (
            <button type="button" className="text-btn" onClick={() => cambiarModo("olvidada")}>
              ¿Has olvidado la contraseña?
            </button>
          ) : modo === "crear" ? (
            <span className="pwd-hint">La contraseña debe tener al menos 8 caracteres.</span>
          ) : (
            <button type="button" className="text-btn" onClick={() => cambiarModo("entrar")}>
              Volver a iniciar sesión
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

/**
 * La «G» de Google, con sus colores. Es la única cosa dibujada aquí que no
 * sigue el estilo de la casa, y va así a propósito: es marca ajena, y quien
 * la ve tiene que reconocerla al instante para fiarse de dónde está entrando.
 */
function MarcaGoogle() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.8-2 5.1-4.4 6.7v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.4z"
      />
      <path
        fill="#34A853"
        d="M24 46c6 0 11-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.3v5.7C7.8 41.1 15.3 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.7 28.1c-.4-1.3-.7-2.7-.7-4.1s.2-2.8.7-4.1v-5.7H4.3C2.8 17.2 2 20.5 2 24s.8 6.8 2.3 9.8l7.4-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 30 2 24 2 15.3 2 7.8 6.9 4.3 14.2l7.4 5.7c1.7-5.2 6.6-9.1 12.3-9.1z"
      />
    </svg>
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
