import { useState, type FormEvent } from "react";
import { IconClose, IconPlus } from "./icons";
import { removeMember, rotateCode } from "./lib/api";
import type { Book } from "./lib/types";

type Panel = "none" | "new" | "share" | "join";

/**
 * Selector de libros. Un libro con un solo miembro es una cuenta personal; se
 * comparte pasando su código, que el otro pega en "Entrar con un código".
 */
export default function BookBar({
  books,
  bookId,
  meId,
  onPick,
  onCreate,
  onJoin,
  onBookChange,
  onError,
}: {
  books: Book[];
  bookId: string;
  meId: string;
  onPick: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onJoin: (code: string) => Promise<boolean>;
  onBookChange: (book: Book) => void;
  onError: (message: string) => void;
}) {
  const [panel, setPanel] = useState<Panel>("none");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const book = books.find((b) => b.id === bookId);
  const isOwner = book?.ownerId === meId;
  const others = book ? book.memberIds.filter((id) => id !== meId) : [];

  function abrir(siguiente: Panel) {
    setPanel(panel === siguiente ? "none" : siguiente);
    setCopiado(false);
  }

  async function submitNew(e: FormEvent) {
    e.preventDefault();
    const limpio = name.trim();
    if (!limpio) return;
    setBusy(true);
    try {
      await onCreate(limpio);
      setName("");
      setPanel("none");
    } finally {
      setBusy(false);
    }
  }

  async function submitJoin(e: FormEvent) {
    e.preventDefault();
    const limpio = code.trim();
    if (!limpio) return;
    setBusy(true);
    try {
      if (await onJoin(limpio)) {
        setCode("");
        setPanel("none");
      }
    } finally {
      setBusy(false);
    }
  }

  async function copiar() {
    if (!book) return;
    try {
      await navigator.clipboard.writeText(book.code);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      onError("Este navegador no me deja copiar; apúntalo a mano.");
    }
  }

  async function otroCodigo() {
    if (!book) return;
    setBusy(true);
    try {
      onBookChange(await rotateCode(book.id));
      setCopiado(false);
    } catch {
      onError("No he podido cambiar el código.");
    } finally {
      setBusy(false);
    }
  }

  async function sacar(memberId: string) {
    if (!book) return;
    setBusy(true);
    try {
      onBookChange(await removeMember(book, memberId));
    } catch {
      onError("No he podido sacar a esa persona del libro.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bookbar">
      <div className="bookbar-row">
        <label className="book-pick">
          <span className="sr-only">Libro de cuentas</span>
          <select value={bookId} onChange={(e) => onPick(e.target.value)}>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.memberIds.length > 1 ? " · compartido" : ""}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="ghost small" onClick={() => abrir("new")}>
          <IconPlus size={14} /> Libro
        </button>

        {isOwner && (
          <button type="button" className="ghost small" onClick={() => abrir("share")}>
            Compartir
          </button>
        )}

        <button type="button" className="ghost small" onClick={() => abrir("join")}>
          Entrar con un código
        </button>

        {others.length > 0 && book && (
          <span className="with-who">
            con {others.map((id) => book.memberNames[id] || "alguien").join(", ")}
          </span>
        )}
      </div>

      {panel === "new" && (
        <form className="book-panel" onSubmit={submitNew}>
          <label>
            Nombre del libro
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Casa, mis cuentas, viaje…"
              maxLength={60}
              autoFocus
              required
            />
          </label>
          <button type="submit" className="ghost" disabled={busy}>
            Crear
          </button>
          <button type="button" className="icon-btn" aria-label="Cerrar" onClick={() => setPanel("none")}>
            <IconClose size={14} />
          </button>
        </form>
      )}

      {panel === "join" && (
        <form className="book-panel" onSubmit={submitJoin}>
          <label>
            Código del libro
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC234"
              maxLength={10}
              autoCapitalize="characters"
              autoComplete="off"
              className="code-input"
              autoFocus
              required
            />
          </label>
          <button type="submit" className="ghost" disabled={busy}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
          <button type="button" className="icon-btn" aria-label="Cerrar" onClick={() => setPanel("none")}>
            <IconClose size={14} />
          </button>
        </form>
      )}

      {panel === "share" && book && (
        <div className="book-panel share">
          <p className="hint">
            Pásale este código a quien quieras meter en «{book.name}». Con él entra desde
            «Entrar con un código».
          </p>

          <div className="code-row">
            <strong className="code">{book.code}</strong>
            <button type="button" className="ghost small" onClick={copiar}>
              {copiado ? "Copiado" : "Copiar"}
            </button>
            <button type="button" className="text-btn" onClick={otroCodigo} disabled={busy}>
              Cambiar el código
            </button>
          </div>

          {others.length > 0 && (
            <ul className="people">
              {others.map((id) => (
                <li key={id}>
                  <span className="person">
                    {book.memberNames[id] || "alguien"}
                    <button
                      type="button"
                      className="icon-btn"
                      title="Sacar del libro"
                      aria-label={`Sacar a ${book.memberNames[id] || "esta persona"} del libro`}
                      onClick={() => sacar(id)}
                      disabled={busy}
                    >
                      <IconClose size={13} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <button type="button" className="ghost small" onClick={() => setPanel("none")}>
            Listo
          </button>
        </div>
      )}
    </div>
  );
}
