import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveDraft, runCoach, CoachSchema } from "../shared/coach";
import { makeClient } from "../shared/providers";
import { applyUpdate, emptyData } from "../src/lib/data";
import { computeTargets } from "../shared/nutrition";
import type { CoachContext, CoachUpdate, Profile } from "../shared/types";
const today = "2026-10-13";
const context = (): CoachContext => ({
  today,
  plan: null,
  entries: [],
  weighIns: [],
  memory: { events: [], reflections: [], practices: [] },
  history: [],
  pending: null,
  selectedEntryId: null,
});
const draft = (patch: Record<string, unknown> = {}) => ({
  title: "Review",
  summary: "A proposal",
  question: null,
  profile: null,
  coaching: null,
  requiresProfessionalSupport: false,
  meals: [],
  weighIns: [],
  events: [],
  reflection: null,
  focusCompleted: false,
  completedDays: [],
  removedEventIds: [],
  options: [],
  ...patch,
});
const food = {
  name: "Toast",
  detail: "one slice, estimated",
  kcal: 100,
  proteinG: 4,
  carbsG: 18,
  fatG: 2,
};
const profile: Profile = {
  age: 34,
  sex: "unspecified",
  heightCm: 178,
  weightKg: 82.6,
  unit: "kg",
  activity: "moderate",
  goal: "lose",
  goalWeightKg: 77.1,
  targetDate: null,
  carbPreference: "default",
  priorities: [],
};
const ai = makeClient("deepseek", undefined);
async function sample() {
  const c = context();
  const u = await runCoach(
    ai,
    { text: "Explore the sample plan", images: [] },
    c,
  );
  return { ...c, plan: u.plan };
}
test("sample plan is explicitly marked and target math stays coherent", async () => {
  const c = await sample();
  assert.equal(c.plan?.demo, true);
  assert.ok(c.plan!.targets.calories > 0);
  const t = c.plan!.targets;
  assert.ok(
    Math.abs(t.calories - (4 * t.proteinG + 4 * t.carbsG + 9 * t.fatG)) <= 3,
  );
  assert.equal(t.projectedDate, null);
});
test("mixed input proposes meal, weight and future event separately", async () => {
  const c = await sample();
  const u = await runCoach(
    ai,
    {
      text: "I had eggs on toast, weighed 82.1 kg, dinner out tomorrow",
      images: [],
    },
    c,
  );
  assert.equal(u.meals.length, 1);
  assert.equal(u.weighIns[0].weightKg, 82.1);
  assert.equal(u.events[0].date, "2026-10-14");
  assert.equal(c.entries.length, 0);
  const next = applyUpdate({ ...emptyData(), plan: c.plan }, u, today);
  assert.equal(next.entries.length, 1);
  assert.equal(next.weighIns.length, 1);
  assert.equal(next.memory.events.length, 1);
});
test("pending portion correction preserves other intents", async () => {
  const c = await sample();
  c.pending = await runCoach(
    ai,
    { text: "I had eggs, weighed 82.1 kg, dinner out tomorrow", images: [] },
    c,
  );
  const u = await runCoach(
    ai,
    { text: "Actually half the portion", images: [] },
    c,
  );
  assert.equal(u.meals[0].items[0].kcal, 180);
  assert.equal(u.weighIns.length, 1);
  assert.equal(u.events.length, 1);
});
test("questions cannot mutate data even if model supplies actions", () => {
  const u = resolveDraft(
    draft({ question: "How much?", weighIns: [{ date: today, weightKg: 80 }] }),
    context(),
    false,
  );
  assert.equal(u.weighIns.length, 0);
  assert.throws(() => applyUpdate(emptyData(), u, today));
});
test("future meals need clarification", () => {
  const u = resolveDraft(
    draft({
      meals: [
        {
          operation: "add",
          entryId: null,
          date: "2026-10-14",
          label: "dinner",
          items: [food],
        },
      ],
    }),
    context(),
    false,
  );
  assert.ok(u.question);
  assert.equal(u.meals.length, 0);
});
test("unknown meal IDs cannot be replaced or removed", () => {
  for (const operation of ["replace", "remove"]) {
    const u = resolveDraft(
      draft({
        meals: [
          {
            operation,
            entryId: "missing",
            date: today,
            label: "Meal",
            items: [food],
          },
        ],
      }),
      context(),
      false,
    );
    assert.ok(u.question);
  }
});
test("an invalid operation fails the whole transaction", () => {
  const d = emptyData();
  const u = {
    ...resolveDraft(draft(), context(), false),
    weighIns: [{ date: today, weightKg: 80 }],
    meals: [
      {
        operation: "replace",
        entryId: "missing",
        date: today,
        label: "meal",
        items: [food],
      },
    ],
  } as CoachUpdate;
  assert.throws(() => applyUpdate(d, u, today));
  assert.deepEqual(d, emptyData());
});
test("clarification for missing profile fields and unsuitable targets", () => {
  for (const p of [
    { ...profile, age: null },
    { ...profile, age: 16 },
    { ...profile, goalWeightKg: 40 },
    { ...profile, goalWeightKg: 90 },
    { ...profile, targetDate: "2020-01-01" },
  ]) {
    const u = resolveDraft(draft({ profile: p }), context(), false);
    assert.ok(u.question);
    assert.equal(u.plan, null);
  }
});
test("medical flag prevents automatic calorie prescription", () => {
  const u = resolveDraft(
    draft({ profile, requiresProfessionalSupport: true }),
    context(),
    false,
  );
  assert.ok(u.question);
  assert.equal(u.plan, null);
});
test("invalid calendar dates and nonfinite food values fail schema", () => {
  assert.equal(
    CoachSchema.safeParse(
      draft({ weighIns: [{ date: "2026-02-30", weightKg: 80 }] }),
    ).success,
    false,
  );
  assert.equal(
    CoachSchema.safeParse(
      draft({
        meals: [
          {
            operation: "add",
            entryId: null,
            date: today,
            label: "Meal",
            items: [{ ...food, kcal: NaN }],
          },
        ],
      }),
    ).success,
    false,
  );
});
test("meal suggestions do not log consumption", async () => {
  const u = await runCoach(
    ai,
    { text: "I'm tired, help with dinner", images: [] },
    await sample(),
  );
  assert.equal(u.meals.length, 0);
  assert.equal(u.options.length, 2);
});
test("photo in sample mode is never analyzed or logged", async () => {
  const u = await runCoach(
    ai,
    { text: "I ate this", images: [{ mediaType: "image/jpeg", data: "YQ==" }] },
    await sample(),
  );
  assert.ok(u.question);
  assert.equal(u.meals.length, 0);
});
test("sample responses cannot contaminate an existing personal plan", async () => {
  const c = await sample();
  c.plan!.demo = false;
  const u = await runCoach(ai, { text: "I had pizza", images: [] }, c);
  assert.equal(u.meals.length, 0);
  assert.match(u.title, /Connect DeepSeek/);
});
test("moving a meal reopens both affected completed days", () => {
  const d = {
    ...emptyData(),
    entries: [
      {
        id: "a",
        date: today,
        time: "2026-10-13T12:00:00Z",
        text: "Toast",
        items: [food],
      },
    ],
    completedDays: [today, "2026-10-12"],
  };
  const c = { ...context(), entries: d.entries };
  const u = resolveDraft(
    draft({
      meals: [
        {
          operation: "replace",
          entryId: "a",
          date: "2026-10-12",
          label: "Toast",
          items: [food],
        },
      ],
    }),
    c,
    false,
  );
  const next = applyUpdate(d, u, today);
  assert.equal(next.entries.length, 1);
  assert.equal(next.entries[0].id, "a");
  assert.deepEqual(next.completedDays, []);
});
test("practice is counted once per day and focus", async () => {
  const c = await sample();
  const u = resolveDraft(draft({ focusCompleted: true }), c, false);
  const once = applyUpdate({ ...emptyData(), plan: c.plan }, u, today);
  assert.equal(applyUpdate(once, u, today).memory.practices.length, 1);
});
test("duplicate weigh-ins replace the day, leaving other days intact", () => {
  const u = resolveDraft(
    draft({ weighIns: [{ date: today, weightKg: 80 }] }),
    context(),
    false,
  );
  const next = applyUpdate(
    {
      ...emptyData(),
      weighIns: [
        { date: today, weightKg: 81 },
        { date: "2026-10-12", weightKg: 82 },
      ],
    },
    u,
    today,
  );
  assert.deepEqual(next.weighIns, [
    { date: "2026-10-12", weightKg: 82 },
    { date: today, weightKg: 80 },
  ]);
});
test("personal plan replaces sample records", async () => {
  const c = await sample();
  const u = resolveDraft(draft({ profile }), context(), false);
  const next = applyUpdate(
    {
      ...emptyData(),
      plan: c.plan,
      entries: [
        {
          id: "sample",
          date: today,
          time: "",
          text: "",
          items: [food],
          demo: true,
        },
      ],
    },
    u,
    today,
  );
  assert.equal(next.entries.length, 0);
  assert.equal(next.plan?.demo, false);
});
test("macros reconcile to calories across supported profiles", () => {
  for (const weightKg of [40, 60, 100, 200, 400])
    for (const sex of ["male", "female", "unspecified"] as const)
      for (const carbPreference of ["higher", "lower", "default"] as const) {
        const t = computeTargets(
          { ...profile, weightKg, sex, carbPreference },
          new Date(today),
        );
        assert.ok(t.carbsG >= 0);
        assert.ok(t.fatG >= 0);
        assert.ok(
          Math.abs(t.calories - (4 * t.proteinG + 4 * t.carbsG + 9 * t.fatG)) <=
            3,
        );
      }
});

test("body metrics can be recorded without weight and partial updates preserve other metrics", async () => {
  const c = await sample();
  const u = await runCoach(
    ai,
    {
      text: "BMI is 26.1, body fat is 23.5%, lean body mass is 63.2 kg",
      images: [],
    },
    c,
  );
  assert.equal(u.weighIns.length, 0);
  assert.equal(u.bodyMetrics?.[0].bodyFatPercent, 23.5);
  const d = applyUpdate({ ...emptyData(), plan: c.plan }, u, today);
  const revised = resolveDraft(
    draft({ bodyMetrics: [{ date: today, bodyFatPercent: 23 }] }),
    c,
    false,
  );
  const next = applyUpdate(d, revised, today);
  assert.equal(next.bodyMetrics[0].bmi, 26.1);
  assert.equal(next.bodyMetrics[0].leanBodyMassKg, 63.2);
  assert.equal(next.bodyMetrics[0].bodyFatPercent, 23);
  assert.deepEqual(next.plan, d.plan);
});
test("sample to personal onboarding retains real clarifications, strips fictional context", async () => {
  const c = await sample();
  c.history = [
    { user: "sample", assistant: JSON.stringify({ demo: true }) },
    {
      user: "I'm 34 and weigh 80 kg",
      assistant: JSON.stringify({ demo: false, question: "Activity?" }),
    },
  ];
  let seen: any;
  const mock = {
    provider: "deepseek" as const,
    demo: false,
    json: async (req: any) => {
      seen = JSON.parse(req.user).context;
      return draft({ question: "What height?" }) as any;
    },
  };
  await runCoach(mock, { text: "Moderately active", images: [] }, c);
  assert.equal(seen.plan, null);
  assert.equal(seen.history.length, 1);
  assert.match(seen.history[0].user, /34/);
});
