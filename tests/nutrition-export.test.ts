import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createNutritionApi } from "../server/nutrition";
import { nutritionSnapshot, dailyTimestamp, healthAutoExport, shortcutNutrition, NutritionSnapshotSchema } from "../shared/nutrition-export";
import type { Entry } from "../shared/types";

const meal = (id: string, date = "2026-10-18", demo = false): Entry => ({ id, date, demo,
  time: "2026-10-19T01:00:00Z", text: "Private meal text",
  items: [{ name: "Breakfast", detail: "Private portion", kcal: 360.25, proteinG: 20.1, carbsG: 40.2, fatG: 13.3 }],
});
const snapshot = () => nutritionSnapshot([meal("one"), meal("two"), meal("today", "2026-10-19")], ["2026-10-18"], "Asia/Shanghai");
const token = "test-only-nutrition-access-token-123456789";
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
async function fixture(t: { after: (fn: () => Promise<void>) => void }, options: Record<string, unknown> = {}) {
  const dir = await mkdtemp(join(tmpdir(), "calorie-nutrition-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, "private", "nutrition.json");
  const config = { token, file, now: () => new Date("2026-10-18T17:00:00Z"), ...options };
  const app = createNutritionApi(config);
  const put = (body: unknown = snapshot()) => app.request("/snapshot", { method: "PUT", headers, body: JSON.stringify(body) });
  return { app, file, put, config };
}

test("daily totals use the journal date, exclude demo/empty meals and expose no meal text", () => {
  const result = nutritionSnapshot([meal("one"), meal("two"), meal("demo", "2026-10-18", true), { ...meal("empty"), items: [] }], ["2026-10-18", "2026-10-17"], "Asia/Shanghai");
  assert.deepEqual(result.days, [{ date: "2026-10-18", complete: true, mealCount: 2, kcal: 720.5, proteinG: 40.2, carbsG: 80.4, fatG: 26.6 }]);
  assert.ok(!JSON.stringify(result).includes("Private"));
  assert.throws(() => nutritionSnapshot([meal("same"), meal("same")], [], "UTC"), /Duplicate/);
});

test("timestamps preserve the requested date with DST, quarter-hour and negative offsets", () => {
  assert.equal(dailyTimestamp("2026-10-18", "Asia/Shanghai").hae, "2026-10-18 12:00:00 +0800");
  assert.equal(dailyTimestamp("2026-03-08", "America/New_York").iso, "2026-03-08T12:00:00-04:00");
  assert.equal(dailyTimestamp("2026-11-01", "America/New_York").iso, "2026-11-01T12:00:00-05:00");
  assert.equal(dailyTimestamp("2026-10-18", "Asia/Kathmandu").hae, "2026-10-18 12:00:00 +0545");
  assert.throws(() => dailyTimestamp("2026-02-30", "UTC"));
  assert.throws(() => dailyTimestamp("2011-12-30", "Pacific/Apia"), /does not exist/);
});

test("Health Auto Export format has documented names, units and numeric quantities", () => {
  const day = snapshot().days[0];
  assert.deepEqual(healthAutoExport(day, "Asia/Shanghai"), { data: { metrics: [
    { name: "dietary_energy", units: "kcal", data: [{ date: "2026-10-18 12:00:00 +0800", qty: 720.5 }] },
    { name: "protein", units: "g", data: [{ date: "2026-10-18 12:00:00 +0800", qty: 40.2 }] },
    { name: "carbohydrates", units: "g", data: [{ date: "2026-10-18 12:00:00 +0800", qty: 80.4 }] },
    { name: "total_fat", units: "g", data: [{ date: "2026-10-18 12:00:00 +0800", qty: 26.6 }] },
  ] } });
  const a = shortcutNutrition(day, "Asia/Shanghai", null);
  const b = shortcutNutrition(day, "Asia/Shanghai", "2026-10-19T01:00:00Z");
  assert.equal(a.syncId, b.syncId);
  assert.equal(a.revision, b.revision);
  assert.notEqual(a.revision, shortcutNutrition({ ...day, kcal: 100 }, "Asia/Shanghai", null).revision);
});

test("private routes require configured tokens and never accept query-string credentials", async t => {
  const { app } = await fixture(t);
  for (const path of ["/status", "/daily", `/daily?token=${token}`]) {
    const res = await app.request(path);
    assert.equal(res.status, 401);
    assert.equal(res.headers.get("cache-control"), "no-store");
  }
  assert.equal((await app.request("/snapshot", { method: "PUT", body: "{}" })).status, 401);
  assert.equal((await app.request("/snapshot", { method: "DELETE" })).status, 401);
  const disabled = createNutritionApi({ file: "/unused", token: "too-short" });
  assert.equal((await disabled.request("/status", { headers })).status, 503);
});

test("snapshot persists across restarts and exports yesterday in the user's time zone", async t => {
  const { app, put, file, config } = await fixture(t);
  assert.equal((await put()).status, 200);
  assert.equal((await stat(file)).mode & 0o777, 0o600);
  const restarted = createNutritionApi(config);
  const response = await restarted.request("/daily?date=yesterday&format=shortcuts", { headers });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.date, "2026-10-18");
  assert.equal(body.calories, 720.5);
  assert.equal(body.sampleDate, "2026-10-18T12:00:00+08:00");
  assert.equal(body.syncedAt, "2026-10-18T17:00:00.000Z");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await app.request("/daily", { headers })).status, 409); // local today = Oct 19
  const defaultFormat = await app.request("/daily?date=2026-10-18", { headers });
  assert.deepEqual(await defaultFormat.json(), healthAutoExport(snapshot().days[0], "Asia/Shanghai"));
});

test("missing and incomplete days are not invented as zero intake", async t => {
  const { app, put } = await fixture(t);
  assert.equal((await app.request("/daily", { headers })).status, 404);
  await put();
  assert.equal((await app.request("/daily?date=2026-10-17", { headers })).status, 404);
  assert.equal((await app.request("/daily?date=today", { headers })).status, 409);
  const partial = await app.request("/daily?date=today&format=shortcuts&includeIncomplete=true", { headers });
  assert.equal(partial.status, 200);
  assert.equal((await partial.json()).complete, false);
});

test("invalid queries and payloads fail without replacing saved nutrition", async t => {
  const { app, put, file } = await fixture(t);
  await put();
  const before = await readFile(file, "utf8");
  const good = snapshot();
  const invalid = [
    { ...good, timeZone: "Not/AZone" },
    { ...good, days: [good.days[0], good.days[0]] },
    { ...good, days: [{ ...good.days[0], date: "2026-02-30" }] },
    { ...good, days: [{ ...good.days[0], date: "2026-10-20" }] },
    { ...good, days: [{ ...good.days[0], kcal: -1 }] },
    { ...good, apiKey: "must-not-store" },
  ];
  for (const body of invalid) assert.equal((await put(body)).status, 400);
  assert.equal((await app.request("/snapshot", { method: "PUT", headers, body: "{broken" })).status, 400);
  for (const query of ["date=2026-02-30", "format=csv", "includeIncomplete=yes", "date=tomorrow"])
    assert.equal((await app.request(`/daily?${query}`, { headers })).status, 400);
  assert.equal(await readFile(file, "utf8"), before);
  assert.ok(!NutritionSnapshotSchema.safeParse({ ...good, days: [{ ...good.days[0], kcal: Infinity }] }).success);
});

test("replacement removes deleted days; repeated uploads do not accumulate values", async t => {
  const { app, put } = await fixture(t);
  await put(); await put();
  const first = await (await app.request("/daily?date=yesterday&format=shortcuts", { headers })).json();
  assert.equal(first.calories, 720.5);
  await put({ ...snapshot(), days: [] });
  assert.equal((await app.request("/daily?date=yesterday", { headers })).status, 404);
  await put();
  assert.equal((await app.request("/snapshot", { method: "DELETE", headers })).status, 204);
  assert.deepEqual(await (await app.request("/status", { headers })).json(), { version: 1, syncedAt: null, days: 0 });
});

test("CORS allows only configured origins and does not bypass authorization", async t => {
  const { app } = await fixture(t, { allowedOrigins: ["https://kakdwa.github.io"] });
  const allowed = await app.request("/snapshot", { method: "OPTIONS", headers: { Origin: "https://kakdwa.github.io", "Access-Control-Request-Method": "PUT" } });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get("access-control-allow-origin"), "https://kakdwa.github.io");
  assert.equal((await app.request("/status", { headers: { Origin: "https://kakdwa.github.io" } })).status, 401);
  assert.equal((await app.request("/status", { headers: { ...headers, Origin: "https://attacker.example" } })).status, 403);
});

test("corrupt disk data returns an error, not a successful empty export", async t => {
  const { app, put, file } = await fixture(t);
  await put();
  await writeFile(file, "broken private file");
  const result = await app.request("/daily", { headers });
  assert.equal(result.status, 500);
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.ok(!(await result.text()).includes("broken private file"));
});

test("oversized uploads are rejected before persistence", async t => {
  const { app } = await fixture(t);
  const res = await app.request("/snapshot", { method: "PUT", headers, body: " ".repeat(4 * 1024 * 1024 + 1) });
  assert.equal(res.status, 413);
});
