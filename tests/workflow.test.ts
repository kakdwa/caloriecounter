import { test } from "node:test";
import assert from "node:assert/strict";
import { quickUpdate } from "../src/lib/actions";
import { applyUpdate, emptyData } from "../src/lib/data";
import { emptyDraft, readDraft, writeDraft } from "../src/lib/draft";
import { makeClient } from "../shared/providers";
import { runCoach } from "../shared/coach";

const today = "2026-10-15";
const context = { ...emptyData(), today, pending: null, selectedEntryId: null };
async function sample() {
  const response = await runCoach(makeClient("deepseek", undefined), { text: "Explore the sample plan", images: [] }, context);
  const data = applyUpdate(emptyData(), response, today);
  data.entries = [{ id: "breakfast", date: "2026-10-14", time: "2026-10-14T08:00:00Z", text: "Eggs and toast", demo: true,
    items: [{ name: "Eggs and toast", detail: "Synthetic test serving", kcal: 360, proteinG: 20, carbsG: 32, fatG: 17 }] }];
  return data;
}
test("repeating a meal adds a separate record, preserves portions, and reopens the destination day", async () => {
  const data = await sample();
  data.completedDays = [today, "2026-10-14"];
  const update = quickUpdate(data, { type: "repeat", entryId: "breakfast", date: today }, today);
  const next = applyUpdate(data, update, today);
  assert.equal(next.entries.length, 2);
  assert.notEqual(next.entries[1].id, "breakfast");
  assert.equal(next.entries[1].date, today);
  assert.deepEqual(next.entries[1].items, data.entries[0].items);
  assert.deepEqual(next.completedDays, ["2026-10-14"]);
  update.meals[0].items[0].kcal = 1;
  assert.equal(data.entries[0].items[0].kcal, 360);
});
test("direct completion and removal are explicit and a practice counts once", async () => {
  let data = await sample();
  data = applyUpdate(data, quickUpdate(data, { type: "complete", date: "2026-10-14", complete: true }, today), today);
  assert.deepEqual(data.completedDays, ["2026-10-14"]);
  data = applyUpdate(data, quickUpdate(data, { type: "practice" }, today), today);
  data = applyUpdate(data, quickUpdate(data, { type: "practice" }, today), today);
  assert.equal(data.memory.practices.length, 1);
  data = applyUpdate(data, quickUpdate(data, { type: "remove", entryId: "breakfast" }, today), today);
  assert.equal(data.entries.length, 0); assert.equal(data.completedDays.length, 0);
});
test("quick controls reject invalid, empty, future and fictional personal-record actions", async () => {
  const data = await sample();
  assert.throws(() => quickUpdate(data, { type: "complete", date: today, complete: true }, today), /Log your food/);
  for (const date of ["2026-02-30", "2026-11-01"]) {
    assert.throws(() => quickUpdate(data, { type: "repeat", entryId: "breakfast", date }, today), /earlier day/);
  }
  assert.throws(() => quickUpdate(data, { type: "remove", entryId: "missing" }, today), /changed/);
  data.plan!.demo = false;
  assert.throws(() => quickUpdate(data, { type: "repeat", entryId: "breakfast", date: today }, today), /Sample meals/);
});
test("tab drafts recover photos, edit selection and review without applying records", async () => {
  const values = new Map<string, string>();
  const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
  const data = await sample();
  const draft = { text: "Change the portion", images: [{ mediaType: "image/jpeg" as const, data: "YQ==" }], selectedId: "breakfast",
    update: quickUpdate(data, { type: "repeat", entryId: "breakfast", date: today }, today) };
  assert.ok(writeDraft(storage, draft));
  assert.deepEqual(readDraft(storage).update?.meals, draft.update.meals);
  assert.equal(readDraft(storage).images[0].data, "YQ==");
  assert.equal(readDraft(storage).selectedId, "breakfast");
  assert.equal(data.entries.length, 1);
  assert.ok(writeDraft(storage, emptyDraft())); assert.equal(values.size, 0);
  assert.deepEqual(readDraft({ getItem: () => '{"text":1}' }), emptyDraft());
  assert.equal(writeDraft({ ...storage, setItem: () => { throw new Error("quota"); } }, draft), false);
});

test("historical journal input uses its visible date without moving today's weigh-in", async () => {
  const data = await sample();
  const result = await runCoach(makeClient("deepseek", undefined), { text: "I had eggs and weighed 82 kg", images: [] },
    { ...context, ...data, logDate: "2026-10-12" });
  assert.equal(result.meals[0].date, "2026-10-12");
  assert.equal(result.weighIns[0].date, today);
  const explicit = await runCoach(makeClient("deepseek", undefined), { text: "I had eggs today", images: [] },
    { ...context, ...data, logDate: "2026-10-12" });
  assert.equal(explicit.meals[0].date, today);
});
