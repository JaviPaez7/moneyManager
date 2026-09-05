import { useCallback, useState } from "react";
import {
  createBook,
  createPot,
  createRecurring,
  createTx,
  deleteBook,
  deleteBudget,
  deletePot,
  deleteTx,
  friendlyError,
  setBudget,
  updatePot,
  updateRecurring,
  updateTx,
} from "./api";
import { currentMonth, parseAmount, today, uid } from "./format";
import { drainOutbox, enqueueOutbox, loadOutbox, saveOutbox } from "./outbox";
import { pb } from "./pb";
import type { Book, EntryDraft, Recurring, Section, Store, Tx } from "./types";
import { KIND_SECTION, SECTION_LABEL } from "./types";

/**
 * Todo lo que escribe en el servidor, en un sitio. Cada acción manda el cambio
 * y deja el estado local igual que quedó arriba, sin recargar el libro entero:
 * la app se usa de pie y en la calle, y una recarga por cada apunte se nota.
 *
 * Los errores no suben: se convierten en el mensaje de la cinta y la acción
 * devuelve `null`, así que quien llama solo tiene que mirar si hubo resultado.
 */
export function useBookActions({
  bookId,
  month,
  store,
  setStore,
  setError,
}: {
  bookId: string;
  month: string;
  store: Store;
  setStore: React.Dispatch<React.SetStateAction<Store>>;
  setError: (message: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | null> => {
      setBusy(true);
      setError(null);
      try {
        return await fn();
      } catch (err) {
        setError(friendlyError(err));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [setError],
  );

  /** La fecha con la que nace un apunte del mes que se está mirando. */
  const defaultDate = useCallback(
    () => (month === currentMonth() ? today() : `${month}-01`),
    [month],
  );

  /**
   * Un apunte del formulario. Puede acabar creando tres cosas: el bote nuevo
   * si se pidió uno, la regla que lo repetirá cada mes y el movimiento.
   * Devuelve el bote usado para que el formulario lo deje seleccionado.
   */
  async function addEntry(form: EntryDraft) {
    if (!bookId) return null;
    const amount = parseAmount(form.amount);
    if (amount == null) return null;

    let potId = form.potId || undefined;
    if (form.kind === "saving") {
      const newName = form.newPotName.trim();
      if (newName) {
        try {
          const pot = await createPot(bookId, newName, parseAmount(form.newPotTarget) || 0);
          potId = pot.id;
          setStore((prev) => ({ ...prev, pots: [...prev.pots, pot] }));
        } catch {
          const localPot = { id: uid(), name: newName, target: parseAmount(form.newPotTarget) || 0 };
          potId = localPot.id;
          setStore((prev) => ({ ...prev, pots: [...prev.pots, localPot] }));
        }
      }
      if (!potId) return null;
    }

    const section: Section =
      form.kind === "saving"
        ? "ahorro"
        : form.kind === "income"
          ? KIND_SECTION.income
          : form.section;
    const note = form.note.trim() || (form.kind === "income" ? "Ingreso" : SECTION_LABEL[section]);
    const category = form.kind === "expense" && section === "variable" ? form.category : note;

    let recurringId: string | undefined;
    if (form.repeat && form.kind !== "saving") {
      try {
        const rule = await createRecurring(bookId, {
          kind: form.kind,
          section,
          name: note,
          amount,
          day: Number(form.date.slice(8, 10)),
          startMonth: form.date.slice(0, 7),
          active: true,
          skippedMonths: [],
          potId,
        });
        recurringId = rule.id;
        setStore((prev) => ({ ...prev, recurrings: [rule, ...prev.recurrings] }));
      } catch {
        /* se creará al reconectar */
      }
    }

    const tempId = "opt_" + uid();
    const optimisticTx: Tx = {
      id: tempId,
      kind: form.kind,
      amount,
      section,
      category,
      note,
      date: form.date,
      recurringId,
      potId,
      createdById: pb.authStore.record?.id,
      createdByName:
        (pb.authStore.record?.name as string) || (pb.authStore.record?.email as string),
      out: false,
    };

    // 1. Inmediato: actualización optimista en el estado de React (0 ms)
    setStore((prev) => ({ ...prev, txs: [optimisticTx, ...prev.txs] }));

    // 2. Persistencia en la cola local (outbox)
    enqueueOutbox({
      type: "createTx",
      bookId,
      payload: {
        kind: form.kind,
        amount,
        section,
        category,
        note,
        date: form.date,
        recurringId,
        potId,
      },
      tempId,
    });

    // 3. Sincronización en segundo plano con el servidor
    void drainOutbox({
      onTxCreated: (tId, serverTx) => {
        setStore((prev) => ({
          ...prev,
          txs: prev.txs.map((t) => (t.id === tId ? serverTx : t)),
        }));
      },
    });

    return { tx: optimisticTx, potId: potId || "" };
  }

  async function removeTx(tx: Tx) {
    if (tx.id.startsWith("opt_")) {
      setStore((prev) => ({ ...prev, txs: prev.txs.filter((row) => row.id !== tx.id) }));
      const queue = loadOutbox().filter(
        (item) => !(item.type === "createTx" && item.tempId === tx.id),
      );
      saveOutbox(queue);
      return true;
    }

    return run(async () => {
      try {
        await deleteTx(tx.id);
      } catch (err) {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          enqueueOutbox({ type: "deleteTx", txId: tx.id });
        } else {
          throw err;
        }
      }
      setStore((prev) => ({ ...prev, txs: prev.txs.filter((row) => row.id !== tx.id) }));
      const rule = store.recurrings.find((r) => r.id === tx.recurringId);
      if (rule) {
        try {
          const updated = await updateRecurring(rule.id, {
            skippedMonths: [...new Set([...rule.skippedMonths, month])],
          });
          setStore((prev) => ({
            ...prev,
            recurrings: prev.recurrings.map((r) => (r.id === updated.id ? updated : r)),
          }));
        } catch {
          /* regla se sincronizará luego */
        }
      }
      return true;
    });
  }

  async function saveEdit(tx: Tx, cambios: Partial<Tx>, tambienLosProximos: boolean) {
    return run(async () => {
      const actualizado = await updateTx(tx.id, {
        note: cambios.note,
        amount: cambios.amount,
        date: cambios.date,
        section: cambios.section,
        category: cambios.category,
        potId: cambios.potId,
      });
      setStore((prev) => ({
        ...prev,
        txs: prev.txs.map((row) => (row.id === actualizado.id ? actualizado : row)),
      }));

      // Al subir el alquiler no se cambia solo este mes: la regla que lo repite
      // tiene que enterarse, o el mes que viene vuelve el importe viejo.
      const rule = store.recurrings.find((r) => r.id === tx.recurringId);
      if (rule && tambienLosProximos) {
        const nueva = await updateRecurring(rule.id, {
          amount: actualizado.amount,
          name: actualizado.note,
          section: actualizado.section,
        });
        setStore((prev) => ({
          ...prev,
          recurrings: prev.recurrings.map((r) => (r.id === nueva.id ? nueva : r)),
        }));
      }
      return actualizado;
    });
  }

  /**
   * Confirma en el servidor un borrado que la pantalla ya quitó (borrado
   * diferido con deshacer). No toca el estado local salvo para reponer la fila
   * si el servidor falla. El mes que se salta es el del propio movimiento, no
   * el que se esté mirando, por si acaso no coinciden.
   */
  async function commitRemoveTx(tx: Tx, rule?: Recurring) {
    if (tx.id.startsWith("opt_")) {
      const queue = loadOutbox().filter(
        (item) => !(item.type === "createTx" && item.tempId === tx.id),
      );
      saveOutbox(queue);
      return;
    }

    try {
      await deleteTx(tx.id);
      if (rule) {
        const skipMonth = tx.date.slice(0, 7);
        const updated = await updateRecurring(rule.id, {
          skippedMonths: [...new Set([...rule.skippedMonths, skipMonth])],
        });
        setStore((prev) => ({
          ...prev,
          recurrings: prev.recurrings.map((r) => (r.id === updated.id ? updated : r)),
        }));
      }
    } catch (err) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueueOutbox({ type: "deleteTx", txId: tx.id });
      } else {
        setError(friendlyError(err));
        setStore((prev) =>
          prev.txs.some((r) => r.id === tx.id) ? prev : { ...prev, txs: [tx, ...prev.txs] },
        );
      }
    }
  }

  async function stopRecurring(ruleId: string) {
    return run(async () => {
      const updated = await updateRecurring(ruleId, { active: false });
      setStore((prev) => ({
        ...prev,
        recurrings: prev.recurrings.map((r) => (r.id === updated.id ? updated : r)),
      }));
      return true;
    });
  }

  async function potCreate(name: string, target: number) {
    if (!bookId) return null;
    return run(async () => {
      const pot = await createPot(bookId, name, target);
      setStore((prev) => ({ ...prev, pots: [...prev.pots, pot] }));
      return pot;
    });
  }

  async function potWithdraw(potId: string, importe: number, nota: string) {
    if (!bookId) return null;
    return run(async () => {
      const tx = await createTx(bookId, {
        kind: "saving",
        amount: importe,
        section: "ahorro",
        category: nota,
        note: nota,
        date: defaultDate(),
        potId,
        out: true,
      });
      setStore((prev) => ({ ...prev, txs: [tx, ...prev.txs] }));
      return tx;
    });
  }

  async function potRename(potId: string, name: string) {
    return run(async () => {
      const pot = await updatePot(potId, { name });
      setStore((prev) => ({ ...prev, pots: prev.pots.map((p) => (p.id === pot.id ? pot : p)) }));
      return pot;
    });
  }

  async function potDelete(potId: string) {
    return run(async () => {
      await deletePot(potId);
      setStore((prev) => ({
        ...prev,
        pots: prev.pots.filter((p) => p.id !== potId),
        // Los movimientos se quedan; solo pierden el bote al que apuntaban.
        txs: prev.txs.map((t) => (t.potId === potId ? { ...t, potId: undefined } : t)),
      }));
      return true;
    });
  }

  async function setCap(category: string, amount: number) {
    if (!bookId) return null;
    return run(async () => {
      const tope = await setBudget(bookId, category, amount, month, store.budgets);
      setStore((prev) => ({
        ...prev,
        budgets: prev.budgets.some((b) => b.id === tope.id)
          ? prev.budgets.map((b) => (b.id === tope.id ? tope : b))
          : [...prev.budgets, tope],
      }));
      return tope;
    });
  }

  async function removeCap(budgetId: string) {
    return run(async () => {
      await deleteBudget(budgetId);
      setStore((prev) => ({ ...prev, budgets: prev.budgets.filter((b) => b.id !== budgetId) }));
      return true;
    });
  }

  /**
   * Borrar el libro que se está mirando. Devuelve con qué libros queda la
   * cuenta: sin ninguno no habría dónde apuntar, así que se repone el personal.
   */
  async function removeBook(book: Book, books: Book[]) {
    return run(async () => {
      await deleteBook(book.id);
      let otros = books.filter((b) => b.id !== book.id);
      if (otros.length === 0) otros = [await createBook("Mis cuentas")];
      return otros;
    });
  }

  return {
    busy,
    run,
    defaultDate,
    addEntry,
    removeTx,
    commitRemoveTx,
    saveEdit,
    stopRecurring,
    potCreate,
    potWithdraw,
    potRename,
    potDelete,
    setCap,
    removeCap,
    removeBook,
  };
}
