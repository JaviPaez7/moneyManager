import { useEffect, useState } from "react";
import { currentMonth, today } from "./format";
import type { EntryDraft } from "./types";

const emptyForm: EntryDraft = {
  kind: "expense",
  amount: "",
  note: "",
  date: today(),
  section: "variable",
  category: "Otros",
  repeat: false,
  potId: "",
  newPotName: "",
  newPotTarget: "",
};

/**
 * El estado del formulario de apuntar. Vive en un hook y no dentro del
 * componente porque la pantalla también lo toca: al crear un bote desde el
 * apartado de ahorro, el formulario se pone en "Ahorro" con ese bote elegido.
 */
export function useComposer(month: string) {
  const [form, setForm] = useState(emptyForm);
  const [potOpen, setPotOpen] = useState(false);

  // Al cambiar de mes la fecha del formulario se va con él: si no, un apunte
  // hecho mirando agosto acabaría cayendo en el mes de hoy.
  useEffect(() => {
    setForm((prev) => {
      if (prev.date.startsWith(month)) return prev;
      const day = month === currentMonth() ? today().slice(8) : "01";
      return { ...prev, date: `${month}-${day}` };
    });
  }, [month]);

  function patch(partial: Partial<EntryDraft>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  /** Tras guardar se conserva el tipo y la fecha: se suele apuntar en rachas. */
  function reset(potId: string) {
    setForm((prev) => ({
      ...emptyForm,
      kind: prev.kind,
      section: prev.kind === "expense" ? "variable" : prev.section,
      date: prev.date.startsWith(month) ? prev.date : `${month}-01`,
      potId: potId || "",
    }));
    setPotOpen(false);
  }

  return { form, patch, reset, potOpen, setPotOpen };
}

export type ComposerState = ReturnType<typeof useComposer>;
