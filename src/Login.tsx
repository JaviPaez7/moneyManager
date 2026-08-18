import { useState, type FormEvent } from "react";
import { pb } from "./lib/pb";

export default function Login({ onIn }: { onIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await pb.collection("users").authWithPassword(email.trim(), password);
      onIn();
    } catch (err) {
      const status = (err as { status?: number }).status;
      setError(
        status === 0
          ? "No hay conexión con el servidor."
          : "Ese correo o esa contraseña no valen.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={submit}>
        <h1>Money</h1>
        <p className="lede">Entra para ver tus cuentas y las compartidas.</p>

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
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="gate-error">{error}</p>}

        <button type="submit" className="primary" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
        <p className="gate-foot">Las cuentas se dan de alta a mano. Si no tienes, pídesela a Javi.</p>
      </form>
    </div>
  );
}
