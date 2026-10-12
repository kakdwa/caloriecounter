// Types shared by the server and the client.

export type Provider = "deepseek" | "anthropic";

export type Sex = "male" | "female" | "unspecified";
export type Activity =
  "sedentary" | "light" | "moderate" | "active" | "very_active";
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
  coaching?: CoachingPlan;
  demo?: boolean;
}

export type PlanResponse =
  { status: "ok"; plan: Plan } | { status: "need_more"; question: string };

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
  demo?: boolean;
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

export interface CoachingPlan {
  intention: string;
  focus: string;
  focusReason: string;
  preferences: string[];
  meals: { title: string; description: string }[];
}
export interface CoachEvent {
  id: string;
  date: string;
  title: string;
  detail: string;
}
export interface Reflection {
  date: string;
  text: string;
}
export interface CoachMemory {
  events: CoachEvent[];
  reflections: Reflection[];
  practices: { date: string; focus: string }[];
}
export interface ImageInput {
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  data: string;
}
export interface MealChange {
  operation: "add" | "replace" | "remove";
  entryId: string | null;
  date: string;
  label: string;
  items: FoodItem[];
}
export interface BodyMetrics {
  date: string;
  bmi?: number;
  bodyFatPercent?: number;
  leanBodyMassKg?: number;
}
export interface CoachUpdate {
  bodyMetrics?: BodyMetrics[];
  title: string;
  summary: string;
  question: string | null;
  plan: Plan | null;
  meals: MealChange[];
  weighIns: WeighIn[];
  events: Omit<CoachEvent, "id">[];
  reflection: string | null;
  focusCompleted: boolean;
  completedDays?: { date: string; complete: boolean }[];
  removedEventIds?: string[];
  options: { title: string; description: string }[];
  demo: boolean;
}
export interface CoachContext {
  bodyMetrics?: BodyMetrics[];
  today: string;
  plan: Plan | null;
  entries: Entry[];
  weighIns: WeighIn[];
  memory: CoachMemory;
  history: { user: string; assistant: string }[];
  pending: CoachUpdate | null;
  selectedEntryId: string | null;
  completedDays?: string[];
}
