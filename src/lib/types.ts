export type Kind = "income" | "expense" | "saving";
export type Section = "fijo" | "suscripcion" | "variable" | "ahorro";

export type Tx = {
  id: string;
  kind: Kind;
  amount: number;
  section: Section;
  category: string;
  note: string;
  date: string;
  recurringId?: string;
  potId?: string;
  createdById?: string;
  createdByName?: string;
};

export type Recurring = {
  id: string;
  kind: Kind;
  section: Section;
  name: string;
  amount: number;
  day: number;
  startMonth: string;
  active: boolean;
  skippedMonths: string[];
  potId?: string;
};

export type SavingPot = {
  id: string;
  name: string;
  target: number;
};

export type Store = {
  v: 2;
  txs: Tx[];
  recurrings: Recurring[];
  pots: SavingPot[];
};

export const VARIABLE_CATS = [
  "Comida",
  "Transporte",
  "Hogar",
  "Ocio",
  "Salud",
  "Otros",
] as const;

export const SECTION_LABEL: Record<Section, string> = {
  fijo: "Fijos",
  suscripcion: "Suscripciones",
  variable: "Variables",
  ahorro: "Ahorro",
};

export const KIND_SECTION: Record<Kind, Section> = {
  income: "variable",
  expense: "variable",
  saving: "ahorro",
};

export type Book = {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  memberNames: Record<string, string>;
};
