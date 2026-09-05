import { createTx, deleteTx, updateTx } from "./api";
import { uid } from "./format";
import type { Tx } from "./types";

export const OUTBOX_KEY = "moneymanager.outbox";

type NewTxPayload = Omit<Tx, "id" | "createdById" | "createdByName">;

export type OutboxCreateTxItem = {
  id: string;
  type: "createTx";
  bookId: string;
  payload: NewTxPayload;
  tempId: string;
  createdAt: number;
};

export type OutboxUpdateTxItem = {
  id: string;
  type: "updateTx";
  txId: string;
  patch: Partial<NewTxPayload>;
  createdAt: number;
};

export type OutboxDeleteTxItem = {
  id: string;
  type: "deleteTx";
  txId: string;
  createdAt: number;
};

export type OutboxItem = OutboxCreateTxItem | OutboxUpdateTxItem | OutboxDeleteTxItem;

export type EnqueueItem =
  | {
      type: "createTx";
      bookId: string;
      payload: NewTxPayload;
      tempId: string;
    }
  | {
      type: "updateTx";
      txId: string;
      patch: Partial<NewTxPayload>;
    }
  | {
      type: "deleteTx";
      txId: string;
    };

export function loadOutbox(): OutboxItem[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOutbox(items: OutboxItem[]): void {
  try {
    if (items.length === 0) {
      localStorage.removeItem(OUTBOX_KEY);
    } else {
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
    }
  } catch {
    /* ignore storage quota errors */
  }
}

export function enqueueOutbox(item: {
  type: "createTx";
  bookId: string;
  payload: NewTxPayload;
  tempId: string;
}): OutboxCreateTxItem;
export function enqueueOutbox(item: {
  type: "updateTx";
  txId: string;
  patch: Partial<NewTxPayload>;
}): OutboxUpdateTxItem;
export function enqueueOutbox(item: {
  type: "deleteTx";
  txId: string;
}): OutboxDeleteTxItem;
export function enqueueOutbox(item: EnqueueItem): OutboxItem {
  const fullItem = {
    ...item,
    id: uid(),
    createdAt: Date.now(),
  } as OutboxItem;
  const current = loadOutbox();
  current.push(fullItem);
  saveOutbox(current);
  return fullItem;
}

export function getOutboxCount(): number {
  return loadOutbox().length;
}

let isDraining = false;

export type DrainCallbacks = {
  onTxCreated?: (tempId: string, serverTx: Tx) => void;
  onError?: (err: unknown) => void;
};

/**
 * Procesa la cola de mutaciones pendientes en segundo plano y en orden FIFO.
 * Si no hay conexión o falla la red, detiene el vaciado manteniendo los elementos
 * pendientes para el próximo reintento.
 */
export async function drainOutbox(callbacks?: DrainCallbacks): Promise<{
  processed: number;
  remaining: number;
}> {
  if (isDraining) return { processed: 0, remaining: getOutboxCount() };

  // Si estamos explícitamente sin conexión, no intentamos saturar la red
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { processed: 0, remaining: getOutboxCount() };
  }

  isDraining = true;
  let processed = 0;

  try {
    const queue = loadOutbox();

    while (queue.length > 0) {
      const item = queue[0];
      try {
        if (item.type === "createTx") {
          const serverTx = await createTx(item.bookId, item.payload);
          callbacks?.onTxCreated?.(item.tempId, serverTx);
        } else if (item.type === "updateTx") {
          await updateTx(item.txId, item.patch);
        } else if (item.type === "deleteTx") {
          await deleteTx(item.txId);
        }

        // Eliminamos el elemento completado con éxito de la cola
        queue.shift();
        saveOutbox(queue);
        processed += 1;
      } catch (err) {
        // En caso de error de red o de servidor, paramos para no desordenar mutaciones dependientes
        callbacks?.onError?.(err);
        break;
      }
    }
  } finally {
    isDraining = false;
  }

  return { processed, remaining: getOutboxCount() };
}
