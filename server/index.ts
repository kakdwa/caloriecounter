import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { z } from "zod";
import { AiError, defaultProvider, providerStatuses, resolveClient } from "./ai.ts";
import { computeTargets } from "./nutrition.ts";
import type { FoodItem, LogResponse, Plan, PlanResponse, Profile, Provider } from "../shared/types.ts";

try {
  process.loadEnvFile(".env");
} catch {
  // no .env file; environment variables may still be set
}

const app = new Hono();

// ---------------------------------------------------------------- schemas

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

const ClientFields = {
  provider: z.enum(["deepseek", "anthropic"]).optional(),
  apiKey: z.string().optional(),
};

// ---------------------------------------------------------------- helpers

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function fmtWeight(kg: number, unit: Profile["unit"]) {
  return unit === "kg" ? `${Math.round(kg * 10) / 10} kg` : `${Math.round(kg / 0.45359237)} lb`;
}

function fail(c: any, error: unknown) {
  if (error instanceof AiError) return c.json({ error: error.message }, error.status as 400);
  console.error(error);
  return c.json({ error: "Something went wrong talking to the model." }, 502);
}

// ---------------------------------------------------------------- routes

app.get("/api/providers", (c) =>
  c.json({ default: defaultProvider(), providers: providerStatuses() }),
);

const PlanBody = z.object({
  text: z.string().min(1),
  current: z.any().optional(),
  ...ClientFields,
});

app.post("/api/plan", async (c) => {
  const body = PlanBody.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Tell me a little about yourself first." }, 400);
  const { text, current, provider, apiKey } = body.data;
  const ai = resolveClient(provider as Provider | undefined, apiKey);
  const existing = current as Plan | undefined;

  try {
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
      const q =
        missing.length === 1
          ? `Got it. What is your ${missing[0]}?`
          : `Got it. I still need your ${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}.`;
      return c.json({ status: "need_more", question: q, demo: ai.demo } satisfies PlanResponse & { demo: boolean });
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

    const plan: Plan = { profile, targets, copy, createdAt: new Date().toISOString() };
    return c.json({ status: "ok", plan, demo: ai.demo } satisfies PlanResponse & { demo: boolean });
  } catch (error) {
    return fail(c, error);
  }
});

const LogBody = z.object({
  text: z.string().min(1),
  previous: z.array(z.any()).optional(),
  context: z.object({
    remainingKcal: z.number(),
    remainingProteinG: z.number(),
    localTime: z.string(),
    unit: z.enum(["lb", "kg"]).default("lb"),
  }),
  ...ClientFields,
});

app.post("/api/log", async (c) => {
  const body = LogBody.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Tell me what you ate." }, 400);
  const { text, previous, context, provider, apiKey } = body.data;
  const ai = resolveClient(provider as Provider | undefined, apiKey);
  const prev = previous as FoodItem[] | undefined;

  try {
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

    let response: LogResponse;
    if (out.kind === "weight" && out.weightKg != null) response = { kind: "weight", weightKg: out.weightKg, note: out.note };
    else if (out.kind === "meal" && out.items.length) response = { kind: "meal", items: out.items, note: out.note };
    else response = { kind: "unclear", note: out.note || "I did not catch that. What did you eat?" };
    return c.json({ ...response, demo: ai.demo });
  } catch (error) {
    return fail(c, error);
  }
});

// ---------------------------------------------------------------- static (production)

if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: "./dist" }));
  app.get("*", serveStatic({ root: "./dist", path: "index.html" }));
}

const port = Number(process.env.API_PORT ?? 8787);
serve({ fetch: app.fetch, port }, () => {
  const statuses = providerStatuses();
  const configured = statuses.filter((s) => s.configured).map((s) => s.label);
  console.log(`API on http://localhost:${port}`);
  console.log(
    configured.length
      ? `AI providers configured: ${configured.join(", ")} (default ${defaultProvider()})`
      : "No AI key found: running in demo mode with canned answers. Add DEEPSEEK_API_KEY or ANTHROPIC_API_KEY to .env, or enter one in the app.",
  );
});
