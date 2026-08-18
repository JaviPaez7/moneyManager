import { createPot, createRecurring, createTx } from "./api";
import { STORAGE_KEY, loadStore } from "./storage";
import type { Store } from "./types";

/**
 * Antes de que hubiera cuentas, Money guardaba todo en el navegador. Esto sube
 * esos datos al libro elegido para no perderlos, y solo se ofrece si queda
 * algo en localStorage.
 */

export const LEGACY_DONE_KEY = "moneymanager.v2.subido";

export function pendingLocalStore(): Store | null {
  if (localStorage.getItem(LEGACY_DONE_KEY)) return null;
  if (!localStorage.getItem(STORAGE_KEY)) return null;
  const store = loadStore();
  if (store.txs.length === 0 && store.pots.length === 0) return null;
  return store;
}

export function dismissLocalStore() {
  localStorage.setItem(LEGACY_DONE_KEY, new Date().toISOString());
}

export async function uploadLocalStore(bookId: string, store: Store) {
  const potIds = new Map<string, string>();
  for (const pot of store.pots) {
    const created = await createPot(bookId, pot.name, pot.target);
    potIds.set(pot.id, created.id);
  }

  const ruleIds = new Map<string, string>();
  for (const rule of store.recurrings) {
    const created = await createRecurring(bookId, {
      kind: rule.kind,
      section: rule.section,
      name: rule.name,
      amount: rule.amount,
      day: rule.day,
      startMonth: rule.startMonth,
      active: rule.active,
      skippedMonths: rule.skippedMonths,
      potId: rule.potId ? potIds.get(rule.potId) : undefined,
    });
    ruleIds.set(rule.id, created.id);
  }

  // De más antiguo a más nuevo, para que el orden de creación cuadre con el
  // orden real de los movimientos.
  const ordered = [...store.txs].sort((a, b) => a.date.localeCompare(b.date));
  let uploaded = 0;
  for (const tx of ordered) {
    await createTx(bookId, {
      kind: tx.kind,
      amount: tx.amount,
      section: tx.section,
      category: tx.category,
      note: tx.note,
      date: tx.date,
      recurringId: tx.recurringId ? ruleIds.get(tx.recurringId) : undefined,
      potId: tx.potId ? potIds.get(tx.potId) : undefined,
    });
    uploaded += 1;
  }

  dismissLocalStore();
  return uploaded;
}
