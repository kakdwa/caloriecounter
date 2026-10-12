import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyData } from "../src/lib/data";
test("legacy migration, atomic undo, persisted reload data, key exclusion and quota failure", async () => {
  const values = new Map<string, string>();
  values.set(
    "calorie-tracker/v1",
    JSON.stringify({
      plan: null,
      entries: [],
      weighIns: [{ date: "2026-10-12", weightKg: 82 }],
      settings: {
        provider: "deepseek",
        apiKeys: { deepseek: "test-only-secret" },
      },
    }),
  );
  let fail = false;
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, val: string) => {
        if (fail) throw new Error("quota");
        values.set(key, val);
      },
    },
    configurable: true,
  });
  const { store } = await import("../src/lib/store");
  assert.equal(store.get().weighIns.length, 1);
  assert.deepEqual(store.get().memory, emptyData().memory);
  const before = structuredClone(store.get());
  store.apply(
    {
      title: "Weight",
      summary: "",
      question: null,
      plan: null,
      meals: [],
      weighIns: [{ date: "2026-10-13", weightKg: 81 }],
      events: [],
      reflection: null,
      focusCompleted: false,
      options: [],
      demo: false,
    },
    "2026-10-13",
  );
  assert.equal(
    JSON.parse(values.get("calorie-tracker/v1")!).weighIns.length,
    2,
  );
  store.undo();
  assert.deepEqual(store.get(), before);
  const { settings: _, ...data } = store.get();
  assert.ok(!JSON.stringify(data).includes("test-only-secret"));
  fail = true;
  assert.throws(
    () => store.addWeighIn({ date: "2026-10-13", weightKg: 80 }),
    /could not save/,
  );
  assert.deepEqual(store.get(), before);
});
