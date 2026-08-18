import { clampDay, uid } from "./format";
import type { Recurring, Store, Tx } from "./types";

export function ensureMonth(store: Store, month: string): Store {
  const extra: Tx[] = [];
  const recurrings = store.recurrings.map((rule) => ({ ...rule }));

  for (const rule of recurrings) {
    if (!rule.active) continue;
    if (rule.startMonth > month) continue;
    if (rule.skippedMonths.includes(month)) continue;
    const exists = store.txs.some(
      (tx) => tx.recurringId === rule.id && tx.date.startsWith(month),
    );
    if (exists) continue;
    extra.push(materialize(rule, month));
  }

  if (extra.length === 0) return store;
  return { ...store, txs: [...extra, ...store.txs], recurrings };
}

export function materialize(rule: Recurring, month: string): Tx {
  const day = String(clampDay(month, rule.day)).padStart(2, "0");
  return {
    id: uid(),
    kind: rule.kind,
    amount: rule.amount,
    section: rule.section,
    category: rule.name,
    note: rule.name,
    date: `${month}-${day}`,
    recurringId: rule.id,
    potId: rule.potId,
  };
}

export function skipMonth(store: Store, ruleId: string, month: string): Store {
  return {
    ...store,
    recurrings: store.recurrings.map((rule) =>
      rule.id === ruleId
        ? { ...rule, skippedMonths: [...new Set([...rule.skippedMonths, month])] }
        : rule,
    ),
  };
}

export function stopRecurring(store: Store, ruleId: string): Store {
  return {
    ...store,
    recurrings: store.recurrings.map((rule) =>
      rule.id === ruleId ? { ...rule, active: false } : rule,
    ),
  };
}
