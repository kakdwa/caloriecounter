// Types shared by the server and the client.

export type Provider = "deepseek" | "anthropic";

export type Sex = "male" | "female" | "unspecified";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type GoalType = "lose" | "maintain" | "gain";
export type Unit = "lb" | "kg";

export interface Profile {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  unit: Unit;
  activity: Activity;
  goal: GoalType;
  goalWeightKg: number | null;
  targetDate: string | null; // YYYY-MM-DD
  carbPreference: "higher" | "default" | "lower";
  priorities: string[];
}

export interface Targets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  bmr: number;
  tdee: number;
  weeklyRateKg: number; // negative when losing
  projectedDate: string | null; // when goal weight is reached at this rate
}

export interface PlanCopy {
  summary: string;
  burnNote: string;
  proteinNote: string;
  carbsNote: string;
  fatNote: string;
}

export interface Plan {
  profile: Profile;
  targets: Targets;
  copy: PlanCopy;
  createdAt: string;
}

export type PlanResponse =
  | { status: "ok"; plan: Plan }
  | { status: "need_more"; question: string };

export interface FoodItem {
  name: string;
  detail: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export type LogResponse =
  | { kind: "meal"; items: FoodItem[]; note: string }
  | { kind: "weight"; weightKg: number; note: string }
  | { kind: "unclear"; note: string };

export interface Entry {
  id: string;
  date: string; // YYYY-MM-DD local
  time: string; // ISO
  text: string;
  items: FoodItem[];
}

export interface WeighIn {
  date: string;
  weightKg: number;
}

export interface ProviderStatus {
  provider: Provider;
  configured: boolean; // has a server-side key
  label: string;
  model: string;
}
