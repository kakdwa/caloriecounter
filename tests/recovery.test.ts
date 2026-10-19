import { test } from "node:test";
import assert from "node:assert/strict";
import { recoverySummary } from "../shared/recovery";
import { resolveDraft, runCoach, RecoverySchema, BodyMetricsSchema } from "../shared/coach";
import { DataSchema, BackupSchema, DraftSchema } from "../shared/state-schema";
import { applyUpdate, emptyData, hasChanges } from "../src/lib/data";
import { makeClient } from "../shared/providers";
import { progressSummary } from "../shared/progress";
import type { CoachContext } from "../shared/types";
const today = "2026-10-19";
const context: CoachContext = { ...emptyData(), today, pending: null, selectedEntryId: null };
const draft = (patch: Record<string, unknown> = {}) => ({ title: "Review", summary: "", question: null, profile: null, coaching: null, requiresProfessionalSupport: false, meals: [], weighIns: [], events: [], reflection: null, focusCompleted: false, options: [], ...patch });

test("old backups migrate; new recovery and waist survive backup and pending-draft round trips", () => {
  const { recovery: _old, ...old } = emptyData();
  assert.deepEqual(DataSchema.parse(old).recovery, []);
  const update = resolveDraft(draft({ recovery: [{ date: today, sleepHours: 0, hunger: "high", steps: 0 }], bodyMetrics: [{ date: today, waistCm: 84 }] }), context, false);
  assert.ok(hasChanges(update));
  const next = applyUpdate(emptyData(), update, today);
  assert.deepEqual(BackupSchema.parse({ version: 2, data: next }).data, next);
  assert.deepEqual(DraftSchema.parse({ text: "", images: [], selectedId: null, update }).update, update);
});

test("partial corrections preserve other recovery and scale measurements", () => {
  const before = { ...emptyData(), bodyMetrics: [{ date: today, bodyFatPercent: 23 }], recovery: [{ date: today, sleepHours: 7, hunger: "high" as const }] };
  const result = applyUpdate(before, resolveDraft(draft({ bodyMetrics: [{ date: today, waistCm: 84 }], recovery: [{ date: today, sleepHours: 6 }] }), context, false), today);
  assert.deepEqual(result.recovery, [{ date: today, sleepHours: 6, hunger: "high" }]);
  assert.deepEqual(result.bodyMetrics, [{ date: today, bodyFatPercent: 23, waistCm: 84 }]);
  assert.equal(before.recovery[0].sleepHours, 7);
});

test("future, empty and ambiguous check-ins cannot mutate unrelated data", () => {
  for (const recovery of [[{ date: "2026-10-20", sleepHours: 8 }], [{ date: today }]]) {
    const out = resolveDraft(draft({ recovery, weighIns: [{ date: today, weightKg: 80 }] }), context, false);
    assert.ok(out.question); assert.deepEqual(out.recovery, []); assert.deepEqual(out.weighIns, []);
  }
  const out = resolveDraft(draft({ question: "Which date?", recovery: [{ date: today, sleepHours: 6 }] }), context, false);
  assert.deepEqual(out.recovery, []);
  assert.equal(RecoverySchema.safeParse({ date: today, sleepHours: 25 }).success, false);
  assert.equal(BodyMetricsSchema.safeParse({ date: today, waistCm: -1 }).success, false);
});

test("recovery averages exclude missing, stale and future dates; zero remains an observation", () => {
  const summary = recoverySummary({ recovery: [{ date: "2026-10-01", sleepHours: 2 }, { date: "2026-10-18", sleepHours: 0 }, { date: today, sleepHours: 8, hunger: "high" }, { date: "2026-10-20", sleepHours: 24 }] }, today);
  assert.equal(summary.sleepCount, 2); assert.equal(summary.averageSleep, 4); assert.equal(summary.reviewRecovery, false);
  assert.equal(recoverySummary({}, today).averageSleep, null);
});

test("waist comparison requires elapsed time and a recent endpoint", () => {
  const bodyMetrics = [{ date: "2026-10-11", waistCm: 85 }, { date: today, waistCm: 84 }];
  assert.equal(recoverySummary({ bodyMetrics }, today).waistChange, -1);
  assert.equal(recoverySummary({ bodyMetrics: [{ date: "2026-10-18", waistCm: 85 }, bodyMetrics[1]] }, today).waistChange, null);
  assert.equal(recoverySummary({ bodyMetrics }, "2026-10-28").waistChange, null);
});

test("mixed walkthrough input produces reviewable waist and recovery records without changing targets", async () => {
  const ai = makeClient("deepseek", undefined);
  const plan = (await runCoach(ai, { text: "Explore the sample plan", images: [] }, context)).plan!;
  const out = await runCoach(ai, { text: "My waist is 84 cm, I slept 5 hours, very hungry, walked 6000 steps", images: [] }, { ...context, plan });
  assert.equal(out.bodyMetrics?.[0].waistCm, 84);
  assert.deepEqual(out.recovery, [{ date: today, sleepHours: 5, hunger: "high", steps: 6000 }]);
  assert.equal(out.plan, null); assert.equal(out.meals.length, 0);
  const data = { ...emptyData(), plan, recovery: [{ date: "2026-10-18", hunger: "high" as const }, ...out.recovery!] };
  const before = structuredClone(plan.targets);
  assert.match(progressSummary(data, plan, today).next.title, /sustain/);
  assert.deepEqual(plan.targets, before);
});

test("a steady weight with a smaller waist prompts observation, not a calorie cut", async () => {
  const ai = makeClient("deepseek", undefined);
  const plan = (await runCoach(ai, { text: "Explore the sample plan", images: [] }, context)).plan!;
  plan.createdAt = "2026-10-01T12:00:00Z";
  plan.targetsChangedAt = "2026-10-01";
  const data = { ...emptyData(), plan,
    weighIns: [7, 9, 11, 14, 16, 18].map(day => ({ date: `2026-10-${String(day).padStart(2, "0")}`, weightKg: 82 })),
    bodyMetrics: [{ date: "2026-10-11", waistCm: 85 }, { date: today, waistCm: 84 }],
    completedDays: [15, 16, 17, 18].map(day => `2026-10-${day}`),
  };
  data.entries = data.completedDays.map(date => ({ id: date, date, time: "", text: "Synthetic full day", demo: true, items: [{ name: "Test food", detail: "", kcal: plan.targets.calories, proteinG: plan.targets.proteinG, carbsG: plan.targets.carbsG, fatG: plan.targets.fatG }] }));
  const before = structuredClone(plan.targets);
  const summary = progressSummary(data, plan, today);
  assert.equal(summary.rateKg, 0);
  assert.equal(summary.recovery.waistChange, -1);
  assert.match(summary.next.title, /observing/);
  assert.deepEqual(plan.targets, before);
});
