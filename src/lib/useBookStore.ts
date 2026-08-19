import { useCallback, useEffect, useState } from "react";
import type { RecordSubscription, RecordModel } from "pocketbase";
import { pb } from "./pb";
import { friendlyError, loadBook, materializeMonth } from "./api";
import type { Store } from "./types";

const emptyStore = (): Store => ({ v: 2, txs: [], recurrings: [], pots: [], budgets: [] });

const cacheKey = (bookId: string) => `moneymanager.book.${bookId}`;

function readCache(bookId: string): Store | null {
  try {
    const raw = localStorage.getItem(cacheKey(bookId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Store;
    // La caché puede venir de una versión anterior, sin los campos nuevos.
    if (parsed && Array.isArray(parsed.txs)) {
      return {
        ...parsed,
        recurrings: parsed.recurrings || [],
        pots: parsed.pots || [],
        budgets: parsed.budgets || [],
      };
    }
  } catch {
    /* caché corrupta: se ignora y se tira del servidor */
  }
  return null;
}

/**
 * Estado de un libro: pinta al instante desde la caché local, se pone al día
 * con el servidor y se queda escuchando cambios para que lo que apunte el
 * otro aparezca sin recargar.
 */
export function useBookStore(bookId: string | null, month: string) {
  const [store, setStore] = useState<Store>(emptyStore);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!bookId) return;
    try {
      const fresh = await loadBook(bookId);
      setStore(fresh);
      setError(null);
      return fresh;
    } catch (err) {
      setError(friendlyError(err));
      return null;
    }
  }, [bookId]);

  useEffect(() => {
    if (!bookId) {
      setStore(emptyStore());
      setLoading(false);
      return;
    }
    let alive = true;
    const cached = readCache(bookId);
    setStore(cached || emptyStore());
    setLoading(!cached);

    (async () => {
      const fresh = await refresh();
      if (!alive || !fresh) {
        if (alive) setLoading(false);
        return;
      }
      setLoading(false);
      // Los fijos y suscripciones del mes que se está mirando se crean en el
      // servidor, no solo en esta pantalla.
      try {
        const created = await materializeMonth(bookId, fresh, month);
        if (alive && created.length > 0) {
          setStore((prev) => ({ ...prev, txs: [...created, ...prev.txs] }));
        }
      } catch (err) {
        if (alive) setError(friendlyError(err));
      }
    })();

    return () => {
      alive = false;
    };
    // `month` a propósito fuera: al cambiar de mes se materializa en su efecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, refresh]);

  // Al moverse por los meses, rellenar los recurrentes del mes visitado.
  useEffect(() => {
    if (!bookId || loading) return;
    let alive = true;
    (async () => {
      try {
        const created = await materializeMonth(bookId, store, month);
        if (alive && created.length > 0) {
          setStore((prev) => ({ ...prev, txs: [...created, ...prev.txs] }));
        }
      } catch (err) {
        if (alive) setError(friendlyError(err));
      }
    })();
    return () => {
      alive = false;
    };
    // Solo cuando cambia el mes: `store` cambia en cada apunte y relanzaría esto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, bookId, loading]);

  useEffect(() => {
    localStorage.setItem(cacheKey(bookId || "none"), JSON.stringify(store));
  }, [store, bookId]);

  // Cambios del otro miembro del libro, en vivo.
  useEffect(() => {
    if (!bookId) return;
    const filter = pb.filter("book = {:book}", { book: bookId });
    const onChange = (event: RecordSubscription<RecordModel>) => {
      if (event.record?.book !== bookId) return;
      refresh();
    };
    const subs = ["txs", "recurrings", "pots", "budgets"].map((name) =>
      pb.collection(name).subscribe("*", onChange, { filter }),
    );
    return () => {
      Promise.all(subs).then((unsubs) => unsubs.forEach((off) => off()));
    };
  }, [bookId, refresh]);

  return { store, setStore, loading, error, setError, refresh };
}
