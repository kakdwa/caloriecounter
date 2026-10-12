import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { makeClient } from "../shared/providers";
import { PROVIDERS } from "../shared/catalog";
test("DeepSeek sends text and image content with schema, validates response", async () => {
  const original = globalThis.fetch;
  let body: any;
  globalThis.fetch = async (input, init) => {
    assert.equal(input, "https://api.deepseek.com/chat/completions");
    body = JSON.parse(String(init?.body));
    assert.equal(
      (init?.headers as Record<string, string>).authorization,
      "Bearer test-only-key",
    );
    return Response.json({
      choices: [{ message: { content: JSON.stringify({ ok: true }) } }],
    });
  };
  try {
    const result = await makeClient("deepseek", "test-only-key").json({
      schema: z.object({ ok: z.boolean() }),
      system: "Return structured output",
      user: "I ate this",
      effort: "medium",
      images: [{ mediaType: "image/jpeg", data: "YQ==" }],
    });
    assert.equal(result.ok, true);
    assert.equal(body.model, PROVIDERS.deepseek.model);
    assert.equal(body.response_format.type, "json_object");
    assert.equal(
      body.messages[1].content[1].image_url.url,
      "data:image/jpeg;base64,YQ==",
    );
    assert.match(body.messages[0].content, /JSON schema/);
  } finally {
    globalThis.fetch = original;
  }
});
test("provider failures produce readable errors and no invented answers", async () => {
  const original = globalThis.fetch;
  try {
    for (const [status, message] of [
      [401, /rejected/],
      [429, /rate limiting/],
      [500, /error 500/],
    ] as const) {
      globalThis.fetch = async () => new Response("test failure", { status });
      await assert.rejects(
        makeClient("deepseek", "test-only-key").json({
          schema: z.object({ ok: z.boolean() }),
          system: "",
          user: "",
          effort: "low",
        }),
        message,
      );
    }
    globalThis.fetch = async () =>
      Response.json({ choices: [{ message: { content: '{"ok":"wrong"}' } }] });
    await assert.rejects(
      makeClient("deepseek", "test-only-key").json({
        schema: z.object({ ok: z.boolean() }),
        system: "",
        user: "",
        effort: "low",
      }),
      /expected shape/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
