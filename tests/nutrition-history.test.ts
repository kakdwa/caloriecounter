import { test } from "node:test";
import assert from "node:assert/strict";
import { macroEnergy, nutritionHistory } from "../src/lib/nutrition-history";
import type { Entry } from "../shared/types";

const meal = (date: string, kcal: number, demo = false): Entry => ({
  id: `${date}-${kcal}`, date, time: `${date}T12:00:00Z`, text: "Test meal", demo,
  items: [{ name: "Fixture", detail: "Test only", kcal, proteinG: 20, carbsG: 30, fatG: 10 }],
});

test("nutrition history preserves gaps, partial days, and explicit completion", () => {
  const days = nutritionHistory([meal("2026-10-18", 500), meal("2026-10-18", 700), meal("2026-10-19", 400)], ["2026-10-17", "2026-10-18"], "2026-10-17", 3);
  assert.deepEqual(days.map(day => [day.status, day.kcal]), [["missing", 0], ["complete", 1200], ["partial", 400]]);
  assert.equal(days[1].proteinG, 40);
});

test("sample food does not enter personal history and empty entries are gaps", () => {
  const entries = [meal("2026-10-18", 500, true), { ...meal("2026-10-19", 800), items: [] }];
  assert.deepEqual(nutritionHistory(entries, ["2026-10-18"], "2026-10-18", 2).map(day => day.status), ["missing", "missing"]);
  assert.equal(nutritionHistory(entries, ["2026-10-18"], "2026-10-18", 2, true)[0].kcal, 500);
});

test("chart dates cross month boundaries and exclude future/out-of-range entries", () => {
  const days = nutritionHistory([meal("2026-10-30", 900), meal("2026-11-02", 900)], [], "2026-10-31", 2);
  assert.deepEqual(days.map(day => day.date), ["2026-10-31", "2026-11-01"]);
  assert.ok(days.every(day => day.status === "missing"));
});

test("macro proportions use energy rather than gram proportions", () => {
  const shares = macroEnergy(100, 100, 100);
  assert.deepEqual(shares, [400 / 1700, 400 / 1700, 900 / 1700]);
  assert.deepEqual(macroEnergy(0, 0, 0), [0, 0, 0]);
  assert.ok(Math.abs(shares.reduce((sum, share) => sum + share, 0) - 1) < 1e-12);
});
