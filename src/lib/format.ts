import type { Unit } from "../../shared/types";

export const KG_PER_LB = 0.45359237;

export function localDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  const d = parseLocal(iso);
  d.setDate(d.getDate() + n);
  return localDate(d);
}

export function longDate(iso: string): string {
  return parseLocal(iso).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export function shortDate(iso: string): string {
  return parseLocal(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function monthDay(iso: string): string {
  return parseLocal(iso).toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

export function timeOf(isoTime: string): string {
  return new Date(isoTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Good morning.";
  if (h < 18) return "Good afternoon.";
  return "Good evening.";
}

export function n(v: number): string {
  return Math.round(v).toLocaleString();
}

export function weight(kg: number, unit: Unit, digits = 0): string {
  const v = unit === "kg" ? kg : kg / KG_PER_LB;
  return `${v.toFixed(digits)} ${unit}`;
}

export function weightNum(kg: number, unit: Unit): number {
  return unit === "kg" ? kg : kg / KG_PER_LB;
}

/** Monday of the week containing the date. */
export function weekStart(iso: string): string {
  const d = parseLocal(iso);
  const dow = (d.getDay() + 6) % 7;
  return addDays(iso, -dow);
}
