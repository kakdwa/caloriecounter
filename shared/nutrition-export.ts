import { z } from "zod";
import type { Entry } from "./types";

export const NutritionDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Use a real calendar date.");
export const TimeZone = z.string().min(1).max(100).refine(value => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return true; }
  catch { return false; }
}, "Use an IANA time zone, such as Asia/Shanghai.");
const quantity = z.number().finite().min(0).max(1000000);
export const NutritionDaySchema = z.object({
  date: NutritionDate,
  complete: z.boolean(),
  mealCount: z.number().int().min(1).max(50000),
  kcal: quantity, proteinG: quantity, carbsG: quantity, fatG: quantity,
}).strict();
export const NutritionSnapshotSchema = z.object({
  version: z.literal(1), timeZone: TimeZone,
  days: z.array(NutritionDaySchema).max(20000),
}).strict().refine(value => new Set(value.days.map(day => day.date)).size === value.days.length, "Dates must be unique.");
export type NutritionDay = z.infer<typeof NutritionDaySchema>;
export type NutritionSnapshot = z.infer<typeof NutritionSnapshotSchema>;

/** Only daily food totals leave the device: no keys, meal text, photos or body data. */
export function nutritionSnapshot(entries: Entry[], completedDays: string[], timeZone: string): NutritionSnapshot {
  const days = new Map<string, NutritionDay>();
  const seen = new Set<string>();
  for (const entry of entries) {
    if (entry.demo || !entry.items.length) continue;
    if (seen.has(entry.id)) throw new Error("Duplicate meal IDs found. Restore a valid backup before syncing.");
    seen.add(entry.id);
    const day = days.get(entry.date) ?? { date: entry.date, complete: completedDays.includes(entry.date), mealCount: 0, kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    day.mealCount++;
    for (const item of entry.items) {
      day.kcal += item.kcal;
      day.proteinG += item.proteinG;
      day.carbsG += item.carbsG;
      day.fatG += item.fatG;
    }
    days.set(entry.date, day);
  }
  for (const day of days.values()) {
    for (const key of ["kcal", "proteinG", "carbsG", "fatG"] as const) day[key] = Math.round(day[key] * 100) / 100;
  }
  return NutritionSnapshotSchema.parse({ version: 1, timeZone, days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)) });
}

export function dateInZone(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Daily totals use local noon, not the time at which an older meal was entered. */
export function dailyTimestamp(date: string, timeZone: string) {
  NutritionDate.parse(date);
  TimeZone.parse(timeZone);
  const wall = Date.parse(`${date}T12:00:00Z`);
  const format = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  let instant = wall;
  for (let i = 0; i < 4; i++) {
    const parts = format.formatToParts(instant);
    const p = (type: string) => parts.find(part => part.type === type)!.value;
    const represented = Date.parse(`${p("year")}-${p("month")}-${p("day")}T${p("hour")}:${p("minute")}:${p("second")}Z`);
    if (represented === wall) {
      const minutes = Math.round((wall - instant) / 60000);
      const offset = `${minutes < 0 ? "-" : "+"}${String(Math.floor(Math.abs(minutes) / 60)).padStart(2, "0")}${String(Math.abs(minutes) % 60).padStart(2, "0")}`;
      return { hae: `${date} 12:00:00 ${offset}`, iso: `${date}T12:00:00${offset.slice(0, 3)}:${offset.slice(3)}` };
    }
    instant += wall - represented;
  }
  throw new Error("This calendar day does not exist in the selected time zone.");
}

export const NUTRITION_METRICS = [
  { name: "dietary_energy", field: "kcal", units: "kcal", healthType: "Dietary Energy" },
  { name: "protein", field: "proteinG", units: "g", healthType: "Protein" },
  { name: "carbohydrates", field: "carbsG", units: "g", healthType: "Carbohydrates" },
  { name: "total_fat", field: "fatG", units: "g", healthType: "Total Fat" },
] as const;

export function healthAutoExport(day: NutritionDay, timeZone: string) {
  const timestamp = dailyTimestamp(day.date, timeZone).hae;
  return { data: { metrics: NUTRITION_METRICS.map(metric => ({ name: metric.name, units: metric.units, data: [{ date: timestamp, qty: day[metric.field] }] })) } };
}

export function shortcutNutrition(day: NutritionDay, timeZone: string, syncedAt: string | null) {
  return {
    version: 1, source: "Calorie", date: day.date, timeZone,
    sampleDate: dailyTimestamp(day.date, timeZone).iso,
    complete: day.complete, mealCount: day.mealCount, syncedAt,
    syncId: `calorie:nutrition:${day.date}`,
    // Stable content revision; a re-upload alone must not look like changed nutrition.
    revision: JSON.stringify([1, day.date, timeZone, day.kcal, day.proteinG, day.carbsG, day.fatG]),
    calories: day.kcal, proteinG: day.proteinG, carbsG: day.carbsG, fatG: day.fatG,
  };
}
