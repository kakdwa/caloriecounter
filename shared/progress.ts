import type { CoachContext, Plan } from "./types";
import { recoverySummary } from "./recovery";

const day = (s: string) => Date.parse(s + "T12:00:00Z") / 86400000;
const iso = (n: number) => new Date(n * 86400000).toISOString().slice(0, 10);
const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

export function completeFoodDays(data: Pick<CoachContext, "entries" | "completedDays">, from: string, to: string, demo = false) {
  const recorded = new Set(data.entries.filter(e => e.items.length && (demo || !e.demo)).map(e => e.date));
  return [...new Set(data.completedDays ?? [])].filter(d => d >= from && d <= to && recorded.has(d));
}

export function progressSummary(data: Pick<CoachContext, "entries" | "weighIns" | "completedDays" | "bodyMetrics" | "recovery">, plan: Plan, today: string) {
  const recovery = recoverySummary(data, today);
  const now = day(today), created = day(plan.createdAt.slice(0, 10));
  const start = Math.max(now - 13, Number.isFinite(created) ? Math.min(created, now) : now - 13);
  const weights = [...new Map(data.weighIns.filter(w => day(w.date) >= start && w.date <= today).map(w => [w.date, w])).values()].sort((a, b) => a.date.localeCompare(b.date));
  const recent = weights.filter(w => day(w.date) > now - 7), previous = weights.filter(w => day(w.date) <= now - 7);
  const recentAverage = mean(recent.map(w => w.weightKg)), previousAverage = mean(previous.map(w => w.weightKg));
  const fresh = !!recent.length && day(recent.at(-1)!.date) >= now - 3;
  const enough = recent.length >= 3 && previous.length >= 3 && fresh;
  const rateKg = enough ? (recentAverage! - previousAverage!) * 7 / (mean(recent.map(w => day(w.date)))! - mean(previous.map(w => day(w.date)))!) : null;
  const changed = plan.targetsChangedAt ? day(plan.targetsChangedAt) : start;
  const intakeFrom = iso(Math.max(start, Number.isFinite(changed) ? changed : start));
  const complete = completeFoodDays(data, intakeFrom, today, !!plan.demo);
  const foods = data.entries.filter(e => complete.includes(e.date) && (!e.demo || plan.demo)).flatMap(e => e.items);
  const averageKcal = complete.length ? foods.reduce((n, i) => n + i.kcal, 0) / complete.length : null;
  const averageProtein = complete.length ? foods.reduce((n, i) => n + i.proteinG, 0) / complete.length : null;
  const target = plan.profile.goalWeightKg;
  const startingWeight = plan.startingWeightKg ?? plan.profile.weightKg;
  const current = recent.length >= 3 && fresh ? recentAverage : null;
  const goalProgress = plan.profile.goal !== "maintain" && target != null && target !== startingWeight && current != null
    ? Math.max(0, Math.min(1, (current - startingWeight) / (target - startingWeight))) : null;
  const intendedRate = plan.targets.weeklyRateKg;
  const faster = rateKg != null && intendedRate !== 0 && rateKg * intendedRate > 0 && Math.abs(rateKg) > Math.abs(intendedRate) * 1.5;
  const toward = rateKg != null && (plan.profile.goal === "lose" ? rateKg < -.1 : plan.profile.goal === "gain" ? rateKg > .1 : Math.abs(rateKg) <= .1);
  const status = rateKg == null ? "Building your baseline" : Math.abs(rateKg) <= .1 ? "Weight is broadly steady" : rateKg < 0 ? "Weight is trending down" : "Weight is trending up";
  let next = { title: "Keep what works", detail: "Keep your current routine and review hunger, energy and consistency before making a change.", prompt: "Review my progress, hunger and energy. What is working, what is uncertain, and what should I keep doing?" };
  if (recovery.reviewRecovery) next = { title: "Make the plan easier to sustain", detail: "Your recent sleep, hunger or energy records are worth a check-in. Look at meal satisfaction and recovery before considering a target change. These reports do not diagnose a cause.", prompt: "Review my recent sleep, hunger and energy alongside complete food logs and weight/waist trends. Suggest one practical meal or recovery adjustment; explain uncertainty and keep my targets unchanged." };
  else if (complete.length < 4) next = { title: "Build a clearer food picture", detail: `${complete.length} complete food day${complete.length === 1 ? "" : "s"} in this review. Log meals, drinks and extras, then mark a day complete when you're finished. No need to fill old gaps.`, prompt: "Help me make food logging easier and more complete. My biggest obstacle is " };
  else if (averageKcal! < plan.targets.calories * .8 || faster) next = { title: "Check your hunger and energy", detail: "Your recorded intake or pace calls for a check-in. Review missing portions, hunger and energy before changing your targets. Faster isn't automatically better.", prompt: "Review my intake, weight trend, hunger and energy. Help me check whether my current plan is sustainable, without automatically lowering my targets." };
  else if (averageProtein! < plan.targets.proteinG * .9) next = { title: "Make your protein target easier", detail: `Complete days average ${Math.round(averageProtein!)}g against your ${plan.targets.proteinG}g starting target. Find a simple meal adjustment that suits your preferences.`, prompt: "Help me reach my protein target with one easy change to foods I already enjoy." };
  else if (!enough) next = { title: "Give the trend more context", detail: "A few readings across each week help separate a trend from a single day's fluctuation. If weighing feels useful, use similar conditions each time.", prompt: "Help me understand my weight readings and choose a comfortable way to track progress." };
  else if (rateKg != null && Math.abs(rateKg) <= .1 && recovery.waistChange != null && recovery.waistChange < 0) next = { title: "Keep observing the bigger picture", detail: "Weight is broadly steady while your recorded waist is smaller. Measurement conditions can vary. Keep observing both rather than cutting calories in response to this short weight trend.", prompt: "Review my steady weight and waist measurements together, including measurement dates and uncertainty. Help me keep a sustainable routine without automatically changing targets." };
  else if (!toward && plan.profile.goal !== "maintain") next = { title: "Review what makes the plan difficult", detail: "This short trend isn't moving toward your weight goal. Review portions, routine, hunger and recent changes together before adjusting anything.", prompt: "My recent weight trend isn't moving toward my goal. Review my complete logs and routine, explain what we can and can't conclude, and suggest one practical change for my approval." };
  return { recovery, from: iso(start), intakeFrom, to: today, recentAverage: current, previousAverage: enough ? previousAverage : null, recentCount: recent.length, previousCount: previous.length, rateKg, intendedRate, status, goalProgress, completeDays: complete.length, averageKcal, averageProtein, faster, next };
}
