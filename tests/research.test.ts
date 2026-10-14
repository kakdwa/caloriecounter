import { test } from "node:test";
import assert from "node:assert/strict";
import { parseResearch, researchNutrition } from "../shared/research";
import { runCoach, CoachSchema } from "../shared/coach";
import { applyUpdate, emptyData } from "../src/lib/data";
import { DataSchema } from "../shared/state-schema";
import type { AiClient } from "../shared/providers";
import type { CoachContext } from "../shared/types";
const url = "https://www.mcdonalds.com/us/en-us/product/big-mac.html";
const blocks = [
  { type: "server_tool_use", id: "search1", name: "web_search", input: { query: "US Big Mac official calories" } },
  { type: "web_search_tool_result", tool_use_id: "search1", content: [{ type: "web_search_result", url, title: "McDonald’s USA Big Mac", encrypted_content: "opaque-test-content" }] },
  { type: "text", text: "Test fixture: standard US Big Mac is 590 kcal. Macros not retrieved.", citations: [{ type: "web_search_result_location", url, cited_text: "590 calories", encrypted_index: "opaque-test-index" }] },
];
const context: CoachContext = { today: "2026-10-14", plan: null, entries: [], weighIns: [], memory: { events: [], reflections: [], practices: [] }, history: [], pending: null, selectedEntryId: null };
const draft = (patch: Record<string, unknown> = {}) => CoachSchema.parse({ title: "Review lunch", summary: "Nutrition review", question: null, profile: null, coaching: null, requiresProfessionalSupport: false, meals: [], weighIns: [], events: [], reflection: null, focusCompleted: false, options: [], ...patch });
const meal = (ids = ["s1"]) => ({ operation: "add", entryId: null, date: context.today, label: "Lunch", items: [{ name: "Big Mac", detail: "One standard US burger. Macros estimated.", kcal: 590, proteinG: 25, carbsG: 46, fatG: 34, citationIds: ids, sourceMatch: { market: "US", serving: "1 standard burger", fields: ["kcal"] } }] });
function fake(first: ReturnType<typeof draft>, second = draft({ meals: [meal()] }), research = parseResearch(blocks)) {
  const requests: any[] = [], queries: any[] = [];
  const client: AiClient = { provider: "deepseek", demo: false, json: async (r) => { requests.push(r); return r.schema.parse(requests.length === 1 ? first : second); }, research: async (...q) => { queries.push(q); return research; } };
  return { client, requests, queries };
}
test("nutrition evidence must be cited AND present in real search results", () => {
  const result = parseResearch(blocks);
  assert.equal(result.status, "found"); assert.equal(result.sources[0].url, url);
  assert.equal(parseResearch([blocks[2]]).sources.length, 0);
  assert.equal(parseResearch([blocks[1]]).status, "no_results");
  assert.equal(parseResearch([{ type: "text", text: "I searched and verified 590 kcal." }]).status, "unavailable");
  const forged = structuredClone(blocks) as any[];
  forged[2].citations[0].url = "https://made-up.example/facts";
  assert.equal(parseResearch(forged).sources.length, 0);
  forged[1].content[0].url = forged[2].citations[0].url = "javascript:alert(1)";
  assert.equal(parseResearch(forged).sources.length, 0);
});
test("HTTP 200 tool errors are not successful research", () => {
  assert.equal(parseResearch([{ type: "web_search_tool_result", content: { type: "web_search_tool_result_error", error_code: "unavailable" } }]).status, "unavailable");
});
test("DeepSeek search uses same key, server tools and bounded pause continuation", async () => {
  const original = globalThis.fetch; let calls = 0;
  globalThis.fetch = async (input, init) => {
    assert.equal(input, "https://api.deepseek.com/anthropic/v1/messages");
    assert.equal((init?.headers as any).authorization, "Bearer test-only");
    const req = JSON.parse(String(init?.body));
    assert.equal(req.tools[0].type, "web_search_20250305");
    assert.equal(req.tools[0].max_uses, 3);
    assert.equal(req.messages[0].content.includes("medical"), false);
    if (++calls === 1) return Response.json({ stop_reason: "pause_turn", content: blocks.slice(0, 2) });
    assert.deepEqual(req.messages[1].content, blocks.slice(0, 2));
    return Response.json({ stop_reason: "end_turn", content: blocks.slice(2) });
  };
  try { const r = await researchNutrition("deepseek", "test-only", "Big Mac", "US"); assert.equal(calls, 2); assert.equal(r.sources.length, 1); }
  finally { globalThis.fetch = original; }
});
test("search failure is explicit, with no invented sources", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("unavailable", { status: 429 });
    assert.equal((await researchNutrition("deepseek", "test-only", "Big Mac", "US")).status, "unavailable");
    globalThis.fetch = async () => { throw new Error("offline"); };
    assert.deepEqual((await researchNutrition("deepseek", "test-only", "Big Mac", "US")).sources, []);
  } finally { globalThis.fetch = original; }
});
test("unknown menu country asks before search or writes", async () => {
  const f = fake(draft({ nutritionLookup: { query: "Big Mac", market: null }, meals: [meal()] }));
  const result = await runCoach(f.client, { text: "I ate a Big Mac", images: [] }, context);
  assert.match(result.question!, /country/); assert.equal(result.meals.length, 0); assert.equal(f.queries.length, 0);
});
test("ordinary coaching costs one call and does not search", async () => {
  const f = fake(draft()); await runCoach(f.client, { text: "I am hungry", images: [] }, context);
  assert.equal(f.requests.length, 1); assert.equal(f.queries.length, 0);
});
test("source-linked calories preserve estimated macros, survive save/backup, and report stages", async () => {
  const f = fake(draft({ nutritionLookup: { query: "Big Mac standard", market: "US" } }));
  const stages: string[] = [];
  const result = await runCoach(f.client, { text: "I ate one standard Big Mac in the US", images: [] }, context, s => stages.push(s));
  assert.deepEqual(f.queries, [["Big Mac standard", "US"]]);
  assert.deepEqual(result.meals[0].items[0].evidence?.fields, ["kcal"]);
  assert.equal(result.meals[0].items[0].evidence?.sources[0].url, url);
  assert.equal("citationIds" in result.meals[0].items[0], false);
  assert.ok(stages.includes("searching")); assert.equal(stages.at(-1), "structuring");
  const data = applyUpdate(emptyData(), result, context.today);
  const roundTrip = DataSchema.parse(JSON.parse(JSON.stringify(data)));
  assert.equal(roundTrip.entries[0].items[0].evidence?.sources[0].url, url);
});
test("unknown IDs, country mismatch and failed search cannot produce source badges", async () => {
  for (const mode of ["forged", "country", "failure"]) {
    const m = meal(mode === "forged" ? ["invented"] : ["s1"]);
    if (mode === "country") m.items[0].sourceMatch.market = "UK";
    const f = fake(draft({ nutritionLookup: { query: "Big Mac", market: "US" } }), draft({ meals: [m] }), mode === "failure" ? { status: "unavailable", sources: [], findings: "Unavailable" } : parseResearch(blocks));
    const result = await runCoach(f.client, { text: "Lunch", images: [] }, context);
    assert.equal(result.meals[0].items[0].evidence, undefined);
    if (mode === "failure") assert.match(result.research!.note, /estimates/);
  }
});
