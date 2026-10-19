import type { BodyMetrics, RecoveryRecord } from "./types";

const day = (date: string) => Date.parse(`${date}T12:00:00Z`) / 86400000;
const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

/** Observations only. These display conventions never change a nutrition target. */
export function recoverySummary(data: { recovery?: RecoveryRecord[]; bodyMetrics?: BodyMetrics[] }, today: string) {
  const now = day(today);
  const records = [...new Map((data.recovery ?? []).filter(r => day(r.date) > now - 7 && r.date <= today).map(r => [r.date, r])).values()].sort((a, b) => a.date.localeCompare(b.date));
  const sleep = records.flatMap(r => r.sleepHours == null ? [] : [r.sleepHours]);
  const steps = records.flatMap(r => r.steps == null ? [] : [r.steps]);
  const highHunger = records.filter(r => r.hunger === "high").length;
  const lowEnergy = records.filter(r => r.energy === "low").length;
  const averageSleep = mean(sleep);
  const reviewRecovery = highHunger >= 2 || lowEnergy >= 2 || (sleep.length >= 3 && averageSleep! < 6);
  const waist = [...new Map((data.bodyMetrics ?? []).filter(r => r.waistCm != null && day(r.date) > now - 28 && r.date <= today).map(r => [r.date, { date: r.date, value: r.waistCm! }])).values()].sort((a, b) => a.date.localeCompare(b.date));
  const first = waist[0], last = waist.at(-1);
  const waistChange = first && last && day(last.date) - day(first.date) >= 7 && now - day(last.date) <= 7 ? last.value - first.value : null;
  return { records, sleepCount: sleep.length, averageSleep, stepsCount: steps.length, averageSteps: mean(steps), highHunger, lowEnergy, reviewRecovery, waist, waistChange };
}
