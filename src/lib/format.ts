export function uid() {
  return crypto.randomUUID();
}

export function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function currentMonth() {
  return today().slice(0, 7);
}

export function formatEUR(n: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

export function monthLabel(month: string) {
  const label = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-01T12:00:00`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function daysInMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function clampDay(month: string, day: number) {
  return Math.min(Math.max(1, day), daysInMonth(month));
}

export function parseAmount(raw: string) {
  const value = Number(raw.replace(",", ".").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}

export function moneyDate(date: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}
