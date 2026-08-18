import { useEffect, useState, type FormEvent } from "react";
import { IconClose, IconPlus } from "./icons";
import { listPeople, setBookMembers } from "./lib/api";
import type { Book } from "./lib/types";

type Person = { id: string; name: string; email: string };

/**
 * Selector de libros. Un libro con un solo miembro es una cuenta personal;
 * al añadir a alguien pasa a ser compartida y los dos ven lo mismo.
 */
export default function BookBar({
  books,
  bookId,
  meId,
  onPick,
  onCreate,
  onMembersChange,
  onError,
}: {
  books: Book[];
  bookId: string;
  meId: string;
  onPick: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onMembersChange: (book: Book) => void;
  onError: (message: string) => void;
}) {
  const [panel, setPanel] = useState<"none" | "new" | "share">("none");
  const [name, setName] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [busy, setBusy] = useState(false);

  const book = books.find((b) => b.id === bookId);
  const isOwner = book?.ownerId === meId;

  useEffect(() => {
    if (panel !== "share" || people.length > 0) return;
    listPeople()
      .then(setPeople)
      .catch(() => onError("No he podido cargar la lista de personas."));
  }, [panel, people.length, onError]);

  async function submitNew(e: FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    setBusy(true);
    try {
      await onCreate(clean);
      setName("");
      setPanel("none");
    } finally {
      setBusy(false);
    }
  }

  async function toggleMember(person: Person) {
    if (!book || person.id === book.ownerId) return;
    const next = book.memberIds.includes(person.id)
      ? book.memberIds.filter((id) => id !== person.id)
      : [...book.memberIds, person.id];
    setBusy(true);
    try {
      onMembersChange(await setBookMembers(book.id, next));
    } catch {
      onError("No he podido cambiar quién entra en este libro.");
    } finally {
      setBusy(false);
    }
  }

  const others = book ? book.memberIds.filter((id) => id !== meId) : [];

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

        <button
          type="button"
          className="ghost small"
          onClick={() => setPanel(panel === "new" ? "none" : "new")}
        >
          <IconPlus size={14} /> Libro
        </button>

        {isOwner && (
          <button
            type="button"
            className="ghost small"
            onClick={() => setPanel(panel === "share" ? "none" : "share")}
          >
            Compartir
          </button>
        )}

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

      {panel === "share" && book && (
        <div className="book-panel">
          <p className="hint">Quién entra en «{book.name}»</p>
          <ul className="people">
            {people.map((person) => {
              const inside = book.memberIds.includes(person.id);
              const owner = person.id === book.ownerId;
              return (
                <li key={person.id}>
                  <label className={inside ? "on" : ""}>
                    <input
                      type="checkbox"
                      checked={inside}
                      disabled={owner || busy}
                      onChange={() => toggleMember(person)}
                    />
                    {person.name}
                    {owner && <span className="badge">dueño</span>}
                  </label>
                </li>
              );
            })}
          </ul>
          <button type="button" className="ghost small" onClick={() => setPanel("none")}>
            Listo
          </button>
        </div>
      )}
    </div>
  );
}
