// Lectura del almacén viejo (solo navegador). Ya no se escribe aquí: existe
// para poder subir a las cuentas lo que quedó guardado antes del login.
import { classifySection } from "./classify";
import { uid } from "./format";
import type { Store } from "./types";

export const STORAGE_KEY = "moneymanager.v2";
const LEGACY_KEY = "moneymanager.v1";

const empty = (): Store => ({
  v: 2,
  txs: [],
  recurrings: [],
  pots: [],
  budgets: [],
});

type LegacyTx = {
  id?: string;
  kind?: "income" | "expense";
  amount?: number;
  category?: string;
  note?: string;
  date?: string;
};

function migrateLegacy(raw: string): Store {
  let parsed: LegacyTx[] = [];
  try {
    parsed = JSON.parse(raw) as LegacyTx[];
  } catch {
    return empty();
  }
  if (!Array.isArray(parsed)) return empty();

  const store = empty();
  for (const row of parsed) {
    if (!row || typeof row.amount !== "number" || !row.date) continue;
    const kind = row.kind === "income" ? "income" : "expense";
    const category = row.category || "Otros";
    const note = row.note || "";
    const isSaving = kind === "income" && category === "Ahorros";
    let potId: string | undefined;
    if (isSaving) {
      let pot = store.pots.find((p) => p.name === "Ahorros");
      if (!pot) {
        pot = { id: uid(), name: "Ahorros", target: 0 };
        store.pots.push(pot);
      }
      potId = pot.id;
    }
    store.txs.push({
      id: row.id || uid(),
      kind: isSaving ? "saving" : kind,
      amount: row.amount,
      section: isSaving ? "ahorro" : kind === "income" ? "variable" : classifySection(note, category),
      category,
      note,
      date: row.date,
      potId,
    });
  }
  return store;
}

export function loadStore(): Store {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) {
      const parsed = JSON.parse(current) as Store;
      if (parsed && parsed.v === 2 && Array.isArray(parsed.txs)) {
        return {
          v: 2,
          txs: parsed.txs,
          recurrings: parsed.recurrings || [],
          pots: parsed.pots || [],
          budgets: parsed.budgets || [],
        };
      }
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = migrateLegacy(legacy);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    /* empty store */
  }
  return empty();
}
