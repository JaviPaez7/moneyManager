import { deepEqual, equal } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  OUTBOX_KEY,
  drainOutbox,
  enqueueOutbox,
  getOutboxCount,
  loadOutbox,
  saveOutbox,
} from "./outbox";

// Mock minimal de localStorage para el entorno de test de Node
const memoryStorage = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => memoryStorage.get(key) ?? null,
  setItem: (key: string, val: string) => {
    memoryStorage.set(key, String(val));
  },
  removeItem: (key: string) => {
    memoryStorage.delete(key);
  },
  clear: () => {
    memoryStorage.clear();
  },
};

(globalThis as unknown as { localStorage: typeof localStorageMock }).localStorage = localStorageMock;

describe("outbox (cola de sincronización offline)", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("arranca vacía y devuelve cero", () => {
    equal(getOutboxCount(), 0);
    deepEqual(loadOutbox(), []);
  });

  it("encola una mutación y la persiste en localStorage", () => {
    const item = enqueueOutbox({
      type: "createTx",
      bookId: "book-123",
      payload: {
        kind: "expense",
        amount: 25.5,
        section: "variable",
        category: "Comida",
        note: "Cena",
        date: "2026-09-05",
      },
      tempId: "opt-1",
    });

    equal(getOutboxCount(), 1);
    equal(item.tempId, "opt-1");

    const saved = JSON.parse(memoryStorage.get(OUTBOX_KEY)!);
    equal(saved.length, 1);
    equal(saved[0].tempId, "opt-1");
  });

  it("saveOutbox borra la clave si la cola queda vacía", () => {
    saveOutbox([]);
    equal(memoryStorage.has(OUTBOX_KEY), false);
  });
});
