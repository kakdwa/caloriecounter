import { test } from "node:test";
import assert from "node:assert/strict";
import { progressSummary } from "../shared/progress";
import { emptyData } from "../src/lib/data";
import type { Plan } from "../shared/types";
const plan: Plan = { createdAt: "2026-10-01T12:00:00Z", profile: { age: 34, sex: "unspecified", heightCm: 178, weightKg: 83, unit: "kg", activity: "moderate", goal: "lose", goalWeightKg: 78, targetDate: null, carbPreference: "default", priorities: [] }, targets: { calories: 2200, proteinG: 150, carbsG: 250, fatG: 66, bmr: 1700, tdee: 2600, weeklyRateKg: -.35, projectedDate: null }, copy: { summary: "", burnNote: "", proteinNote: "", carbsNote: "", fatNote: "" } };
const today = "2026-10-14";
const weights = [2, 4, 6, 9, 11, 13].map(d => ({ date: `2026-10-${String(d).padStart(2,"0")}`, weightKg: 83 - d * .05 }));
test("no observations means no pace verdict, no fake fat-loss percentage", () => {
  const r = progressSummary(emptyData(), plan, today);
  assert.equal(r.rateKg, null); assert.equal(r.goalProgress, null); assert.equal(r.averageKcal, null);
  assert.equal(r.status, "Building your baseline"); assert.match(r.next.title, /clearer/);
});
test("weekly average comparison accounts for reading dates, future and duplicate weights", () => {
  const data = { ...emptyData(), weighIns: [...weights, weights[0], { date: "2026-11-01", weightKg: 40 }] };
  const r = progressSummary(data, plan, today);
  assert.ok(Math.abs(r.rateKg! + .35) < 1e-9); assert.equal(r.recentCount, 3); assert.equal(r.previousCount, 3);
  assert.equal(r.status, "Weight is trending down"); assert.ok(r.goalProgress! > 0 && r.goalProgress! < 1);
});
test("sparse, stale and pre-plan records cannot masquerade as a current trend", () => {
  assert.equal(progressSummary({ ...emptyData(), weighIns: weights.slice(0,4) }, plan, today).rateKg, null);
  assert.equal(progressSummary({ ...emptyData(), weighIns: weights }, plan, "2026-10-20").rateKg, null);
  assert.equal(progressSummary({ ...emptyData(), weighIns: weights }, { ...plan, createdAt: "2026-10-10T12:00:00Z" }, today).rateKg, null);
});
test("only explicit complete days contribute intake averages; never count missing days as zero", () => {
  const item = (kcal: number) => ({ name: "Synthetic full-day log", detail: "test fixture", kcal, proteinG: 150, carbsG: 200, fatG: 80 });
  const data = { ...emptyData(), completedDays: ["2026-10-12", "2026-10-12", "2026-11-01"], entries: [{ id:"1", date:"2026-10-12", time:"", text:"Fixture", items:[item(2200)] }, {id:"2", date:"2026-10-13",time:"",text:"Partial",items:[item(500)]}] };
  const r = progressSummary(data, plan, today);
  assert.equal(r.completeDays, 1); assert.equal(r.averageKcal, 2200); assert.equal(r.averageProtein, 150);
});
test("next step responds to protein and energy without changing targets", () => {
  const data = { ...emptyData(), weighIns: weights, completedDays: ["2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13"] };
  data.entries = data.completedDays.map((date,i) => ({id:String(i),date,time:"",text:"Fixture",items:[{name:"Day",detail:"",kcal:2200,proteinG:90,carbsG:200,fatG:70}]}));
  assert.match(progressSummary(data, plan, today).next.title, /protein/);
  data.entries.forEach(e => e.items[0].kcal = 1000);
  assert.match(progressSummary(data, plan, today).next.title, /hunger and energy/);
  assert.equal(plan.targets.calories, 2200);
});
test("maintenance has no weight-goal completion percentage", () => {
  const r = progressSummary({ ...emptyData(), weighIns: weights }, {...plan, profile:{...plan.profile,goal:"maintain",goalWeightKg:83}}, today);
  assert.equal(r.goalProgress, null);
});

test("legacy plan dates cannot crash the progress view", () => {
  const r = progressSummary(emptyData(), { ...plan, createdAt: "" }, today);
  assert.equal(r.from, "2026-10-01"); assert.equal(r.rateKg, null);
});
