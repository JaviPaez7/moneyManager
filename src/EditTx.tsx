import { useState, type FormEvent } from "react";
import { parseAmount } from "./lib/format";
import type { Recurring, SavingPot, Section, Tx } from "./lib/types";
import { VARIABLE_CATS } from "./lib/types";

/**
 * Editar un movimiento ya apuntado. Antes solo se podía borrar y volver a
 * escribirlo, y con los recurrentes eso además saltaba el mes.
 */
export default function EditTx({
  tx,
  rule,
  pots,
  busy,
  onSave,
  onCancel,
}: {
  tx: Tx;
  rule?: Recurring;
  pots: SavingPot[];
  busy: boolean;
  onSave: (cambios: Partial<Tx>, tambienLosProximos: boolean) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState(tx.note);
  const [amount, setAmount] = useState(String(tx.amount).replace(".", ","));
  const [date, setDate] = useState(tx.date);
  const [section, setSection] = useState<Section>(tx.section);
  const [category, setCategory] = useState(tx.category || "Otros");
  const [potId, setPotId] = useState(tx.potId || "");
  const [proximos, setProximos] = useState(false);

  const esGasto = tx.kind === "expense";
  const esAhorro = tx.kind === "saving";

  function submit(e: FormEvent) {
    e.preventDefault();
    const importe = parseAmount(amount);
    if (importe == null) return;
    const limpio = note.trim();
    onSave(
      {
        note: limpio || tx.note,
        amount: importe,
        date,
        section: esAhorro ? "ahorro" : esGasto ? section : "variable",
        category: esGasto && section === "variable" ? category : limpio || tx.category,
        potId: esAhorro ? potId || undefined : undefined,
      },
      proximos,
    );
  }

  return (
    <form className="edit-tx" onSubmit={submit}>
      <div className="pair">
        <label>
          {esAhorro ? "Nota" : "Qué es"}
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} autoFocus />
        </label>
        <label>
          Importe
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
      </div>

      <div className="pair">
        <label>
          Fecha
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        {esGasto && (
          <label>
            Sección
            <select value={section} onChange={(e) => setSection(e.target.value as Section)}>
              <option value="fijo">Fijo</option>
              <option value="suscripcion">Suscripción</option>
              <option value="variable">Variable</option>
            </select>
          </label>
        )}
        {esAhorro && pots.length > 0 && (
          <label>
            Bote
            <select value={potId} onChange={(e) => setPotId(e.target.value)}>
              {pots.map((pot) => (
                <option key={pot.id} value={pot.id}>
                  {pot.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {esGasto && section === "variable" && (
        <label>
          Categoría
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {VARIABLE_CATS.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>
      )}

      {rule?.active && (
        <label className="check">
          <input
            type="checkbox"
            checked={proximos}
            onChange={(e) => setProximos(e.target.checked)}
          />
          Cambiar también los meses siguientes
        </label>
      )}

      <div className="edit-actions">
        <button type="submit" className="primary" disabled={busy}>
          {busy ? "Guardando…" : "Guardar"}
        </button>
        <button type="button" className="ghost small" onClick={onCancel}>
          Dejarlo
        </button>
      </div>
    </form>
  );
}
