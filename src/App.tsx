import { useEffect, useMemo, useState } from "react";
import "./App.css";
import BookBar from "./BookBar";
import Budgets from "./Budgets";
import Composer from "./Composer";
import History from "./History";
import Ledger from "./Ledger";
import Login from "./Login";
import Movements from "./Movements";
import Password from "./Password";
import Pots from "./Pots";
import SectionList, { type SectionSpec } from "./SectionList";
import TopBar from "./TopBar";
import { createBook, friendlyError, joinBook, listBooks } from "./lib/api";
import { currentMonth } from "./lib/format";
import { dismissLocalStore, pendingLocalStore, uploadLocalStore } from "./lib/migrate";
import { currentUser, pb, type AuthUser } from "./lib/pb";
import { monthBreakdown } from "./lib/summary";
import { useComposer } from "./lib/useComposer";
import type { Book } from "./lib/types";
import { useBookActions } from "./lib/useBookActions";
import { useBookStore } from "./lib/useBookStore";

const BOOK_KEY = "moneymanager.libro";

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(currentUser);
  const [comprobando, setComprobando] = useState(() => pb.authStore.isValid);

  useEffect(() => pb.authStore.onChange(() => setUser(currentUser())), []);

  // La sesión guardada en el navegador puede no valer ya (contraseña cambiada,
  // cuenta borrada). PocketBase no responde 401 en ese caso: atiende la
  // petición como si no hubiera nadie, así que la app se quedaba dentro,
  // enseñando ceros y un error del que no se sale. Se comprueba al arrancar.
  useEffect(() => {
    if (!pb.authStore.isValid) return;
    pb.collection("users")
      .authRefresh()
      .catch(() => pb.authStore.clear())
      .finally(() => setComprobando(false));
  }, []);

  if (comprobando) {
    return (
      <div className="gate">
        <p className="loading">Abriendo…</p>
      </div>
    );
  }

  if (!user) return <Login onIn={() => setUser(currentUser())} />;
  return <Money user={user} />;
}

/**
 * La pantalla de dentro. Aquí solo vive lo que comparten varias secciones —qué
 * libro y qué mes se están mirando— y el reparto entre ellas; el estado de cada
 * trozo (el formulario, los botes, la edición) se queda en su componente.
 */
function Money({ user }: { user: AuthUser }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState(() => localStorage.getItem(BOOK_KEY) || "");
  const [booting, setBooting] = useState(true);
  const [month, setMonth] = useState(currentMonth);
  const [legacy, setLegacy] = useState(pendingLocalStore);
  const [pwOpen, setPwOpen] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [sinRed, setSinRed] = useState(() => !navigator.onLine);

  const { store, setStore, loading, error, setError } = useBookStore(bookId || null, month);
  const acciones = useBookActions({ bookId, month, store, setStore, setError });
  const composer = useComposer(month);

  // Al entrar: los libros a los que tengo acceso. Si no hay ninguno, el
  // personal se crea solo para no recibir a nadie con una pantalla vacía.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let list = await listBooks();
        if (list.length === 0) list = [await createBook("Mis cuentas")];
        if (!alive) return;
        setBooks(list);
        setBookId((prev) => (list.some((b) => b.id === prev) ? prev : list[0].id));
      } catch (err) {
        if (alive) setError(friendlyError(err));
      } finally {
        if (alive) setBooting(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [setError]);

  useEffect(() => {
    if (bookId) localStorage.setItem(BOOK_KEY, bookId);
  }, [bookId]);

  // Sin cobertura la app abre igual y enseña lo último que vio, pero hay que
  // decirlo: si no, parece que los datos están mal.
  useEffect(() => {
    const cambio = () => setSinRed(!navigator.onLine);
    window.addEventListener("online", cambio);
    window.addEventListener("offline", cambio);
    return () => {
      window.removeEventListener("online", cambio);
      window.removeEventListener("offline", cambio);
    };
  }, []);

  const mes = useMemo(() => monthBreakdown(store.txs, month), [store.txs, month]);
  const book = books.find((b) => b.id === bookId);
  const shared = (book?.memberIds.length || 0) > 1;

  async function subirLoViejo() {
    if (!legacy || !bookId) return;
    const count = await acciones.run(() => uploadLocalStore(bookId, legacy));
    if (count != null) {
      setLegacy(null);
      window.location.reload();
    }
  }

  async function borrarLibro() {
    if (!book) return;
    const otros = await acciones.removeBook(book, books);
    if (!otros) return;
    setBooks(otros);
    setBookId(otros[0].id);
  }

  if (booting) {
    return (
      <div className="gate">
        <p className="loading">Abriendo tus cuentas…</p>
      </div>
    );
  }

  const activeRecurring = store.recurrings.filter((rule) => rule.active).map((rule) => rule.id);

  const secciones: SectionSpec[] = [
    {
      title: "Fijos",
      hint: "Coche, móvil, alquiler. Pasan al mes siguiente.",
      rows: mes.fijos,
      empty: "Aún no hay fijos este mes.",
    },
    {
      title: "Suscripciones",
      hint: "Netflix, Spotify y el resto de cuotas.",
      rows: mes.subs,
      empty: "Ninguna suscripción este mes.",
    },
    {
      title: "Variables",
      hint: "Lo que cambia: comida, ocio, imprevistos.",
      rows: mes.variables,
      empty: "Sin gastos variables.",
    },
  ];

  return (
    <div className="shell">
      <TopBar
        user={user}
        month={month}
        onMonth={setMonth}
        shared={shared}
        pwOpen={pwOpen}
        onTogglePassword={() => setPwOpen(!pwOpen)}
      />

      <BookBar
        books={books}
        bookId={bookId}
        meId={user.id}
        onPick={setBookId}
        onCreate={async (name) => {
          const created = await acciones.run(() => createBook(name));
          if (created) {
            setBooks((prev) => [...prev, created]);
            setBookId(created.id);
          }
        }}
        onJoin={async (code) => {
          const entrado = await acciones.run(() => joinBook(code));
          if (!entrado) return false;
          setBooks((prev) =>
            prev.some((b) => b.id === entrado.id)
              ? prev.map((b) => (b.id === entrado.id ? entrado : b))
              : [...prev, entrado],
          );
          setBookId(entrado.id);
          return true;
        }}
        onBookChange={(updated) =>
          setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
        }
        onDelete={borrarLibro}
        onError={setError}
      />

      {pwOpen && (
        <div className="bookbar">
          <Password userId={user.id} onClose={() => setPwOpen(false)} />
        </div>
      )}

      {sinRed && (
        <p className="banner offline" role="status">
          Sin conexión. Ves lo último que se descargó; para apuntar algo hace falta red.
        </p>
      )}

      {error && !sinRed && (
        <p className="banner error" role="status">
          {error}
        </p>
      )}

      {legacy && (
        <div className="banner">
          <span>
            Hay {legacy.txs.length} movimientos guardados solo en este navegador.
            {book ? ` ¿Los subo a «${book.name}»?` : ""}
          </span>
          <span className="banner-actions">
            <button type="button" className="ghost small" onClick={subirLoViejo} disabled={acciones.busy}>
              Subirlos
            </button>
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                dismissLocalStore();
                setLegacy(null);
              }}
            >
              No hace falta
            </button>
          </span>
        </div>
      )}

      {loading ? (
        <p className="loading">Cargando el libro…</p>
      ) : (
        <>
          <div className="stage">
            <Ledger month={month} mes={mes} />
            <Composer
              composer={composer}
              pots={store.pots}
              busy={acciones.busy}
              onSubmit={acciones.addEntry}
            />
          </div>

          <div className="sections">
            {secciones.map((seccion) => (
              <SectionList
                key={seccion.title}
                {...seccion}
                activeRecurring={activeRecurring}
                shared={shared}
                onRemove={acciones.removeTx}
                onStop={acciones.stopRecurring}
              />
            ))}
          </div>

          <Budgets
            budgets={store.budgets}
            txs={store.txs}
            month={month}
            busy={acciones.busy}
            onSet={acciones.setCap}
            onRemove={acciones.removeCap}
          />

          <History txs={store.txs} onPickMonth={setMonth} />

          <Pots
            pots={store.pots}
            txs={store.txs}
            savingTotal={mes.savingTotal}
            busy={acciones.busy}
            onCreate={async (name, target) => {
              const pot = await acciones.potCreate(name, target);
              // El bote recién creado queda elegido en el formulario: quien lo
              // crea es porque va a meterle algo ahora mismo.
              if (pot) composer.patch({ potId: pot.id, kind: "saving", section: "ahorro" });
            }}
            onWithdraw={acciones.potWithdraw}
            onRename={acciones.potRename}
            onDelete={acciones.potDelete}
            onError={setError}
          />

          <Movements
            month={month}
            rows={mes.txs}
            spent={mes.spent}
            recurrings={store.recurrings}
            activeRecurring={activeRecurring}
            pots={store.pots}
            shared={shared}
            busy={acciones.busy}
            editando={editando}
            onEdit={setEditando}
            onSave={acciones.saveEdit}
            onRemove={acciones.removeTx}
            onStop={acciones.stopRecurring}
          />
        </>
      )}

      <footer>
        <p>Neto · JaviStudio</p>
      </footer>
    </div>
  );
}
