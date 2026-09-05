// The two AI moments, as pure functions over an AiClient. Used by the API server and, on static hosting, by the browser.
import { z } from "zod";
import type { AiClient } from "./providers";
import { computeTargets } from "./nutrition";
import type { FoodItem, LogResponse, Plan, PlanResponse, Profile, Unit } from "./types";

const ProfileSchema = z
  .object({
    age: z.number().nullable(),
    sex: z.enum(["male", "female", "unspecified"]),
    heightCm: z.number().nullable(),
    weightKg: z.number().nullable(),
    unit: z.enum(["lb", "kg"]),
    activity: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
    goal: z.enum(["lose", "maintain", "gain"]),
    goalWeightKg: z.number().nullable(),
    targetDate: z.string().nullable(),
    carbPreference: z.enum(["higher", "default", "lower"]),
    priorities: z.array(z.string()),
    missing: z.array(z.string()),
  })
  .describe("profile");

const PlanCopySchema = z
  .object({
    summary: z.string(),
    burnNote: z.string(),
    proteinNote: z.string(),
    carbsNote: z.string(),
    fatNote: z.string(),
  })
  .describe("plan_copy");

const LogSchema = z
  .object({
    kind: z.enum(["meal", "weight", "unclear"]),
    items: z.array(
      z.object({
        name: z.string(),
        detail: z.string(),
        kcal: z.number(),
        proteinG: z.number(),
        carbsG: z.number(),
        fatG: z.number(),
      }),
    ),
    weightKg: z.number().nullable(),
    note: z.string(),
  })
  .describe("log");

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function fmtWeight(kg: number, unit: Unit) {
  return unit === "kg" ? `${Math.round(kg * 10) / 10} kg` : `${Math.round(kg / 0.45359237)} lb`;
}

export async function runPlan(ai: AiClient, text: string, existing?: Plan | null): Promise<PlanResponse> {
  const extracted = await ai.json({
    schema: ProfileSchema,
    effort: "medium",
    system: [
      "You extract a nutrition profile from a person's freeform description of themselves and their goal.",
      `Today is ${todayIso()}. Resolve relative dates ("by Christmas", "in 10 weeks") to YYYY-MM-DD.`,
      "Convert height to centimetres and weight to kilograms. Set `unit` to whichever the person used.",
      "Activity: sedentary (desk, little exercise), light (1-3 sessions/week or walking most days), moderate (3-5 sessions/week), active (6-7 sessions/week or a physical job), very_active (hard daily training plus a physical job).",
      "goal: lose, maintain or gain. If they name a target weight, set goalWeightKg. carbPreference reflects an explicit wish for more or fewer carbs; otherwise 'default'.",
      "priorities: short phrases they care about (e.g. 'keep muscle', 'vegetarian', 'no tracking on weekends').",
      "If sex is not stated, use 'unspecified'. Never guess age, height or weight: if any of those is missing, put its name in `missing` and null the field.",
      existing
        ? `They already have this profile and are asking for a change; return the FULL updated profile:\n${JSON.stringify(existing.profile)}`
        : "",
    ].join("\n"),
    user: text,
  });

  if (extracted.missing.length || extracted.age == null || extracted.heightCm == null || extracted.weightKg == null) {
    const missing = extracted.missing.length ? extracted.missing : ["a few details"];
    const question =
      missing.length === 1
        ? `Got it. What is your ${missing[0]}?`
        : `Got it. I still need your ${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}.`;
    return { status: "need_more", question };
  }

  const profile: Profile = {
    age: extracted.age,
    sex: extracted.sex,
    heightCm: extracted.heightCm,
    weightKg: extracted.weightKg,
    unit: extracted.unit,
    activity: extracted.activity,
    goal: extracted.goal,
    goalWeightKg: extracted.goalWeightKg,
    targetDate: extracted.targetDate,
    carbPreference: extracted.carbPreference,
    priorities: extracted.priorities,
  };
  const targets = computeTargets(profile);

  const copy = await ai.json({
    schema: PlanCopySchema,
    effort: "low",
    maxTokens: 800,
    system: [
      "You write the short, warm, plain-English copy for a personal nutrition plan. The numbers are already computed; never change or contradict them.",
      "Second person, no exclamation marks, no emoji, no jargon. Sound like a calm, expert friend.",
      "summary: at most 40 words: what the plan does and why it fits their goal and priorities.",
      "burnNote: at most 14 words, starting 'Your body burns about N'. Use the TDEE given.",
      "proteinNote, carbsNote, fatNote: at most 9 words each, one reason for that number, tied to their situation.",
    ].join("\n"),
    user: JSON.stringify({
      profile,
      targets,
      weightNow: fmtWeight(profile.weightKg, profile.unit),
      goalWeight: profile.goalWeightKg != null ? fmtWeight(profile.goalWeightKg, profile.unit) : null,
      weeklyRate: fmtWeight(Math.abs(targets.weeklyRateKg), profile.unit) + " per week",
      theyWrote: text,
    }),
  });

  return { status: "ok", plan: { profile, targets, copy, createdAt: new Date().toISOString() } };
}

export interface LogContext {
  remainingKcal: number;
  remainingProteinG: number;
  localTime: string;
  unit: Unit;
}

export async function runLog(ai: AiClient, text: string, context: LogContext, prev?: FoodItem[]): Promise<LogResponse> {
  const out = await ai.json({
    schema: LogSchema,
    effort: "low",
    system: [
      "You turn a freeform description of food someone ate into structured items with realistic nutrition estimates, in kcal and grams.",
      "Use typical household or restaurant portions unless a size is given. When a chain or brand is named, use its typical menu values. Put every assumption you made (portion, preparation, 'no dressing') in `detail`, briefly.",
      "One item per distinct food or drink. Keep names short and natural ('Grilled chicken salad', not 'Salad, chicken, grilled').",
      `If the text is a weigh-in (e.g. 'weighed 181 this morning'), return kind 'weight' with weightKg (convert from ${context.unit} if no unit is given) and no items.`,
      "If the text is not about food or weight, return kind 'unclear' with a one-line note asking what they meant.",
      prev?.length
        ? `A previous parse exists and the new text is a correction to it. Apply the correction and return the FULL corrected list:\n${JSON.stringify(prev)}`
        : "",
      `Context: local time ${context.localTime}. Before this meal they have ${Math.round(context.remainingKcal)} kcal and ${Math.round(context.remainingProteinG)} g protein left today.`,
      "note: one calm sentence, at most 16 words, about what this leaves for the rest of the day or the key assumption. No exclamation marks.",
    ].join("\n"),
    user: text,
  });

  if (out.kind === "weight" && out.weightKg != null) return { kind: "weight", weightKg: out.weightKg, note: out.note };
  if (out.kind === "meal" && out.items.length) return { kind: "meal", items: out.items, note: out.note };
  return { kind: "unclear", note: out.note || "I did not catch that. What did you eat?" };
}
