import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { z } from "zod";
import { AiError, checkKey, makeClient } from "../shared/providers";
import { PROVIDERS } from "../shared/catalog";
import { runLog, runPlan } from "../shared/pipeline";
import type { FoodItem, Plan, Provider, ProviderStatus } from "../shared/types";

try {
  process.loadEnvFile(".env");
} catch {
  // no .env file; environment variables may still be set
}

const app = new Hono();

function providerStatuses(): ProviderStatus[] {
  return (Object.keys(PROVIDERS) as Provider[]).map((provider) => ({
    provider,
    configured: Boolean(process.env[PROVIDERS[provider].env]),
    label: PROVIDERS[provider].label,
    model: PROVIDERS[provider].model,
  }));
}

function defaultProvider(): Provider {
  const wanted = process.env.AI_PROVIDER as Provider | undefined;
  if (wanted && wanted in PROVIDERS) return wanted;
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "deepseek";
}

/** A key sent by the app wins over the server's environment. */
function resolve(provider: Provider | undefined, apiKey: string | undefined) {
  const p: Provider = provider && provider in PROVIDERS ? provider : defaultProvider();
  return makeClient(p, apiKey?.trim() || process.env[PROVIDERS[p].env]);
}

function fail(c: any, error: unknown) {
  if (error instanceof AiError) return c.json({ error: error.message }, error.status as 400);
  console.error(error);
  return c.json({ error: "Something went wrong talking to the model." }, 502);
}

const ClientFields = {
  provider: z.enum(["deepseek", "anthropic"]).optional(),
  apiKey: z.string().optional(),
};

app.get("/api/providers", (c) => c.json({ mode: "server", default: defaultProvider(), providers: providerStatuses() }));

const CheckBody = z.object({ provider: z.enum(["deepseek", "anthropic"]), apiKey: z.string().min(1) });
app.post("/api/check", async (c) => {
  const body = CheckBody.safeParse(await c.req.json());
  if (!body.success) return c.json({ ok: false, message: "Enter a key first." }, 400);
  return c.json(await checkKey(body.data.provider, body.data.apiKey.trim()));
});

const PlanBody = z.object({ text: z.string().min(1), current: z.any().optional(), ...ClientFields });
app.post("/api/plan", async (c) => {
  const body = PlanBody.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Tell me a little about yourself first." }, 400);
  const ai = resolve(body.data.provider, body.data.apiKey);
  try {
    const res = await runPlan(ai, body.data.text, body.data.current as Plan | undefined);
    return c.json({ ...res, demo: ai.demo });
  } catch (error) {
    return fail(c, error);
  }
});

const LogBody = z.object({
  text: z.string().min(1),
  previous: z.array(z.any()).optional(),
  context: z.object({
    remainingKcal: z.number(),
    remainingProteinG: z.number(),
    localTime: z.string(),
    unit: z.enum(["lb", "kg"]).default("lb"),
  }),
  ...ClientFields,
});
app.post("/api/log", async (c) => {
  const body = LogBody.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Tell me what you ate." }, 400);
  const ai = resolve(body.data.provider, body.data.apiKey);
  try {
    const res = await runLog(ai, body.data.text, body.data.context, body.data.previous as FoodItem[] | undefined);
    return c.json({ ...res, demo: ai.demo });
  } catch (error) {
    return fail(c, error);
  }
});

if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: "./dist" }));
  app.get("*", serveStatic({ root: "./dist", path: "index.html" }));
}

const port = Number(process.env.API_PORT ?? 8787);
serve({ fetch: app.fetch, port }, () => {
  const configured = providerStatuses().filter((s) => s.configured).map((s) => s.label);
  console.log(`API on http://localhost:${port}`);
  console.log(
    configured.length
      ? `AI providers configured: ${configured.join(", ")} (default ${defaultProvider()})`
      : "No AI key found: running in demo mode with canned answers. Add DEEPSEEK_API_KEY or ANTHROPIC_API_KEY to .env, or enter one in the app.",
  );
});
