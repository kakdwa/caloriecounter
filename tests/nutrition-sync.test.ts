import { test } from "node:test";
import assert from "node:assert/strict";

test("browser sync serializes edits and Undo, excludes private fields, and disconnects", async () => {
  const saved = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
    removeItem: (key: string) => saved.delete(key),
  } });
  Object.defineProperty(globalThis, "location", { configurable: true, value: { protocol: "http:" } });
  const { store } = await import("../src/lib/store");
  const { emptyData } = await import("../src/lib/data");
  const sync = await import("../src/lib/nutrition-sync");
  const data = { ...emptyData(), completedDays: ["2026-10-18"], entries: [{ id: "meal", date: "2026-10-18", time: "2026-10-18T01:00:00Z", text: "private", items: [{ name: "private food", detail: "", kcal: 100, proteinG: 10, carbsG: 10, fatG: 2 }] }] };
  store.restore(data);
  store.setSettings({ apiKeys: { deepseek: "private-ai-key" } });
  const uploads: string[] = [];
  let release: (() => void) | null = null;
  let block = false;
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    if (init?.method === "PUT") {
      uploads.push(String(init.body));
      if (block) { block = false; await new Promise<void>(resolve => { release = resolve; }); }
    }
    return Response.json({ version: 1, syncedAt: "2026-10-19T01:00:00Z", days: 1 });
  };
  const settle = () => new Promise(resolve => setImmediate(resolve));
  try {
    await sync.connectNutrition("http://localhost:8787/", "test-only-token-for-nutrition-123456789", "Asia/Shanghai");
    await settle();
    assert.equal(uploads.length, 1);
    assert.ok(!uploads[0].includes("private"));
    assert.equal(JSON.parse(uploads[0]).days[0].kcal, 100);
    block = true;
    store.restore({ ...data, entries: [{ ...data.entries[0], items: [{ ...data.entries[0].items[0], kcal: 200 }] }] });
    sync.syncNutrition(false);
    await settle();
    assert.equal(uploads.length, 2);
    store.restore(data); // Undo while the changed version is still uploading.
    sync.syncNutrition(false);
    assert.equal(uploads.length, 2); // No racing request.
    assert.ok(release);
    (release as () => void)();
    await settle(); await settle();
    assert.equal(uploads.length, 3);
    assert.equal(JSON.parse(uploads[2]).days[0].kcal, 100);
    const before = saved.get("calorie-tracker/nutrition-connection-v1");
    globalThis.fetch = async () => Response.json({ error: "Invalid token" }, { status: 401 });
    await assert.rejects(sync.connectNutrition("http://localhost:8787", "a-different-invalid-token-1234567890", "UTC"), /Invalid token/);
    assert.equal(saved.get("calorie-tracker/nutrition-connection-v1"), before);
    assert.throws(() => sync.normalizeNutritionUrl("https://example.com?token=secret"), /without/);
    assert.throws(() => sync.normalizeNutritionUrl("http://example.com"), /HTTPS/);
    sync.disconnectNutrition();
    assert.ok(!saved.has("calorie-tracker/nutrition-connection-v1"));
    sync.syncNutrition();
    assert.equal(uploads.length, 3);
  } finally { globalThis.fetch = original; }
});
