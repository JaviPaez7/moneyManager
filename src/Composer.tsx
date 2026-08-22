import { type FormEvent } from "react";
import { classifySection, classifyVariableCategory, shouldRepeat } from "./lib/classify";
import type { ComposerState } from "./lib/useComposer";
import type { EntryDraft, Kind, SavingPot } from "./lib/types";
import { VARIABLE_CATS } from "./lib/types";

export default function Composer({
  composer,
  pots,
  busy,
  onSubmit,
}: {
  composer: ComposerState;
  pots: SavingPot[];
  busy: boolean;
  onSubmit: (form: EntryDraft) => Promise<{ potId: string } | null>;
}) {
  const { form, patch, reset, potOpen, setPotOpen } = composer;

  // Lo que se escribe decide la sección y la categoría: "Netflix" es una
  // suscripción y se repetirá sola, "Mercadona" es comida y no.
  function onNote(note: string) {
    if (form.kind === "expense") {
      const section = classifySection(note, form.category);
      const category = section === "variable" ? classifyVariableCategory(note) : form.category;
      patch({ note, section, category, repeat: shouldRepeat(section, "expense") });
      return;
    }
    patch({ note });
  }

  function onKind(kind: Kind) {
    patch({
      kind,
      section: kind === "saving" ? "ahorro" : "variable",
      repeat: kind === "income",
      category: kind === "expense" ? "Otros" : "Nómina",
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const hecho = await onSubmit(form);
    if (hecho) reset(hecho.potId);
  }

  return (
    <form className="composer" onSubmit={submit}>
      <div className="seg" role="tablist" aria-label="Tipo">
        {(
          [
            ["expense", "Gasto"],
            ["income", "Ingreso"],
            ["saving", "Ahorro"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={form.kind === value}
            className={form.kind === value ? "on" : ""}
            onClick={() => onKind(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <label>
        {form.kind === "income" ? "Qué cobras" : form.kind === "saving" ? "Nota" : "Qué es"}
        <input
          value={form.note}
          onChange={(e) => onNote(e.target.value)}
          placeholder={
            form.kind === "income"
              ? "Nómina, extra…"
              : form.kind === "saving"
                ? "Opcional"
                : "Coche, Netflix, Mercadona…"
          }
          maxLength={80}
        />
      </label>

      <div className="pair">
        <label>
          Importe
          <input
            inputMode="decimal"
            placeholder="0,00"
            value={form.amount}
            onChange={(e) => patch({ amount: e.target.value })}
            required
          />
        </label>
        <label>
          Fecha
          <input
            type="date"
            value={form.date}
            onChange={(e) => patch({ date: e.target.value })}
            required
          />
        </label>
      </div>

      {form.kind === "expense" && (
        <>
          <fieldset className="chips">
            <legend>Sección</legend>
            {(
              [
                ["fijo", "Fijo"],
                ["suscripcion", "Suscripción"],
                ["variable", "Variable"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className={form.section === value ? "on" : ""}>
                <input
                  type="radio"
                  name="section"
                  value={value}
                  checked={form.section === value}
                  onChange={() => patch({ section: value, repeat: shouldRepeat(value, "expense") })}
                />
                {label}
              </label>
            ))}
          </fieldset>

          {form.section === "variable" && (
            <label>
              Categoría
              <select value={form.category} onChange={(e) => patch({ category: e.target.value })}>
                {VARIABLE_CATS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      )}

      {form.kind === "saving" && (
        <div className="pot-pick">
          <label>
            Bote
            <select
              value={form.potId}
              onChange={(e) => {
                if (e.target.value === "__new") {
                  setPotOpen(true);
                  patch({ potId: "" });
                  return;
                }
                setPotOpen(false);
                patch({ potId: e.target.value, newPotName: "" });
              }}
              required={!potOpen && !form.newPotName}
            >
              <option value="">Elige un bote</option>
              {pots.map((pot) => (
                <option key={pot.id} value={pot.id}>
                  {pot.name}
                </option>
              ))}
              <option value="__new">Nuevo bote…</option>
            </select>
          </label>
          {potOpen && (
            <div className="pair">
              <label>
                Nombre
                <input
                  value={form.newPotName}
                  onChange={(e) => patch({ newPotName: e.target.value })}
                  placeholder="Emergencia, viaje…"
                  required
                />
              </label>
              <label>
                Meta (opcional)
                <input
                  inputMode="decimal"
                  value={form.newPotTarget}
                  onChange={(e) => patch({ newPotTarget: e.target.value })}
                  placeholder="1.000"
                />
              </label>
            </div>
          )}
        </div>
      )}

      {form.kind !== "saving" && (
        <label className="check">
          <input
            type="checkbox"
            checked={form.repeat}
            onChange={(e) => patch({ repeat: e.target.checked })}
          />
          Repetir cada mes
        </label>
      )}

      <button type="submit" className="primary" disabled={busy}>
        {busy ? "Guardando…" : form.kind === "saving" ? "Apartar" : "Guardar"}
      </button>
    </form>
  );
}
