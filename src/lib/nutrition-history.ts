import type { Entry } from "../../shared/types";
import { addDays } from "./format";
import { totals } from "./totals";

/** Missing and unfinished days remain distinct from complete daily intake. */
export function nutritionHistory(entries: Entry[], completedDays: string[], from: string, count: number, demo = false) {
  const completed = new Set(completedDays);
  const byDate = new Map<string, Entry[]>();
  for (const entry of entries) {
    if ((!demo && entry.demo) || !entry.items.length) continue;
    byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry]);
  }
  return Array.from({ length: count }, (_, index) => {
    const date = addDays(from, index), meals = byDate.get(date) ?? [];
    return { date, ...totals(meals), status: !meals.length ? "missing" as const : completed.has(date) ? "complete" as const : "partial" as const };
  });
}

export function macroEnergy(proteinG: number, carbsG: number, fatG: number) {
  const values = [proteinG * 4, carbsG * 4, fatG * 9];
  const total = values.reduce((sum, value) => sum + value, 0);
  return values.map(value => total > 0 ? value / total : 0);
}
