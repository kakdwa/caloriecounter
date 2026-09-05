import type { Profile, Targets } from "./types";

const ACTIVITY: Record<Profile["activity"], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const KCAL_PER_KG = 7700;
const KG_PER_LB = 0.45359237;

function round(n: number, step: number) {
  return Math.round(n / step) * step;
}

function addDays(d: Date, days: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Mifflin-St Jeor with a midpoint constant when sex is not stated. */
export function bmr(p: Profile): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  const sexTerm = p.sex === "male" ? 5 : p.sex === "female" ? -161 : -78;
  return base + sexTerm;
}

export function computeTargets(p: Profile, today = new Date()): Targets {
  const b = bmr(p);
  const tdee = b * ACTIVITY[p.activity];
  const lb = p.weightKg / KG_PER_LB;

  // Weekly rate. Safe bounds: 0.25 lb .. min(2 lb, 1% of body weight) per week.
  const maxLoss = Math.min(2 * KG_PER_LB, p.weightKg * 0.01);
  const minRate = 0.25 * KG_PER_LB;
  let weeklyRateKg = 0;

  if (p.goal !== "maintain") {
    const defaultRate = p.goal === "lose" ? 0.75 * KG_PER_LB : 0.4 * KG_PER_LB;
    let rate = defaultRate;
    if (p.goalWeightKg != null && p.targetDate) {
      const weeks = Math.max(1, (new Date(p.targetDate).getTime() - today.getTime()) / (7 * 864e5));
      rate = Math.abs(p.goalWeightKg - p.weightKg) / weeks;
    }
    const cap = p.goal === "lose" ? maxLoss : 1 * KG_PER_LB;
    rate = Math.min(Math.max(rate, minRate), cap);
    weeklyRateKg = p.goal === "lose" ? -rate : rate;
  }

  let calories = tdee + (weeklyRateKg * KCAL_PER_KG) / 7;
  calories = Math.max(calories, b, p.sex === "male" ? 1500 : 1200);
  calories = round(calories, 10);

  // Protein by goal, per pound of body weight; fat as a share of weight, nudged by carb preference.
  const proteinPerLb = p.goal === "lose" ? 0.95 : p.goal === "gain" ? 0.9 : 0.8;
  const proteinG = round(Math.min(lb * proteinPerLb, 220), 5);
  const fatPerLb = p.carbPreference === "higher" ? 0.3 : p.carbPreference === "lower" ? 0.45 : 0.35;
  const fatG = round(Math.max(lb * fatPerLb, (calories * 0.2) / 9), 5);
  const carbsG = round(Math.max((calories - proteinG * 4 - fatG * 9) / 4, 50), 5);

  let projectedDate: string | null = null;
  if (p.goalWeightKg != null && weeklyRateKg !== 0) {
    const weeks = (p.goalWeightKg - p.weightKg) / weeklyRateKg;
    if (weeks > 0 && weeks < 260) projectedDate = isoDate(addDays(today, Math.round(weeks * 7)));
  }

  return {
    calories,
    proteinG,
    carbsG,
    fatG,
    bmr: Math.round(b),
    tdee: round(tdee, 10),
    weeklyRateKg: Math.round(weeklyRateKg * 100) / 100,
    projectedDate,
  };
}
