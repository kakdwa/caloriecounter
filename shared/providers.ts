// AI provider adapters. Runs in Node (behind the API server) and in the browser (static hosting).
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Provider } from "./types";
import { PROVIDERS } from "./catalog";

export { PROVIDERS };

export type Effort = "low" | "medium" | "high";

export interface JsonRequest<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  effort: Effort;
  maxTokens?: number;
}

export interface AiClient {
  provider: Provider;
  demo: boolean;
  json<T>(req: JsonRequest<T>): Promise<T>;
}

export class AiError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

const inBrowser = typeof window !== "undefined";

export function makeClient(provider: Provider, apiKey: string | undefined): AiClient {
  const key = apiKey?.trim();
  if (!key) return demoClient(provider);
  return provider === "anthropic" ? anthropicClient(key) : deepseekClient(key);
}

/** Verify a key with a request that costs no tokens. */
export async function checkKey(provider: Provider, apiKey: string): Promise<{ ok: boolean; message: string }> {
  try {
    if (provider === "anthropic") {
      await new Anthropic({ apiKey, dangerouslyAllowBrowser: inBrowser }).models.list({ limit: 1 });
    } else {
      const res = await fetch("https://api.deepseek.com/models", { headers: { authorization: `Bearer ${apiKey}` } });
      if (res.status === 401 || res.status === 403) return { ok: false, message: "DeepSeek rejected this key." };
      if (!res.ok) return { ok: false, message: `DeepSeek answered ${res.status}. Try again in a moment.` };
    }
    return { ok: true, message: `${PROVIDERS[provider].label} accepted the key.` };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) return { ok: false, message: "Claude rejected this key." };
    if (error instanceof Anthropic.APIError) return { ok: false, message: `Claude answered ${error.status}. Try again in a moment.` };
    return { ok: false, message: "Could not reach the provider. Check your connection." };
  }
}

// ---------------------------------------------------------------- Anthropic

function anthropicClient(apiKey: string): AiClient {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: inBrowser });
  return {
    provider: "anthropic",
    demo: false,
    async json(req) {
      try {
        const response = await client.messages.parse({
          model: PROVIDERS.anthropic.model,
          max_tokens: req.maxTokens ?? 4000,
          system: req.system,
          messages: [{ role: "user", content: req.user }],
          output_config: { format: zodOutputFormat(req.schema), effort: req.effort },
        });
        if (response.stop_reason === "refusal") throw new AiError("The model declined this request.");
        if (!response.parsed_output) throw new AiError("The model returned something I could not read.");
        return response.parsed_output;
      } catch (error) {
        if (error instanceof AiError) throw error;
        if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) throw new AiError("Claude rejected the API key.", 401);
        if (error instanceof Anthropic.RateLimitError) throw new AiError("Claude is rate limiting right now. Try again in a moment.", 429);
        if (error instanceof Anthropic.APIError) throw new AiError(`Claude error ${error.status}: ${error.message}`);
        throw new AiError("Could not reach Claude. Check your connection.");
      }
    },
  };
}

// ---------------------------------------------------------------- DeepSeek (OpenAI-compatible)

function deepseekClient(apiKey: string): AiClient {
  return {
    provider: "deepseek",
    demo: false,
    async json(req) {
      const schemaJson = JSON.stringify(z.toJSONSchema(req.schema));
      const system = `${req.system}\n\nRespond with a single JSON object and nothing else. It must match this JSON schema exactly:\n${schemaJson}`;
      let res: Response;
      try {
        res = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: PROVIDERS.deepseek.model,
            messages: [
              { role: "system", content: system },
              { role: "user", content: req.user },
            ],
            response_format: { type: "json_object" },
            temperature: req.effort === "low" ? 0.2 : 0.5,
            max_tokens: req.maxTokens ?? 4000,
          }),
        });
      } catch {
        throw new AiError("Could not reach DeepSeek. Check your connection.");
      }
      if (res.status === 401 || res.status === 403) throw new AiError("DeepSeek rejected the API key.", 401);
      if (res.status === 429) throw new AiError("DeepSeek is rate limiting right now. Try again in a moment.", 429);
      if (!res.ok) throw new AiError(`DeepSeek error ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new AiError("DeepSeek returned an empty response.");
      let raw: unknown;
      try {
        raw = JSON.parse(content);
      } catch {
        throw new AiError("DeepSeek returned something I could not read.");
      }
      const parsed = req.schema.safeParse(raw);
      if (!parsed.success) throw new AiError("DeepSeek's answer did not match the expected shape.");
      return parsed.data;
    },
  };
}

// ---------------------------------------------------------------- Demo (no key)

function demoClient(provider: Provider): AiClient {
  return {
    provider,
    demo: true,
    async json(req) {
      await new Promise((r) => setTimeout(r, 500));
      const sample = demoSamples[req.schema.description ?? ""];
      if (!sample) throw new AiError("Demo mode has no sample for this request.");
      return req.schema.parse(sample(req.user));
    },
  };
}

// Canned answers keyed by schema description; only used when no API key is available.
const demoSamples: Record<string, (user: string) => unknown> = {
  profile: () => ({
    age: 34, sex: "unspecified", heightCm: 178, weightKg: 82.6, unit: "lb", activity: "moderate",
    goal: "lose", goalWeightKg: 77.1, targetDate: null, carbPreference: "default", priorities: ["keep muscle"], missing: [],
  }),
  plan_copy: () => ({
    summary: "A gentle deficit with protein kept high, so what you lose is fat, not muscle. About three quarters of a pound a week.",
    burnNote: "Your body burns roughly this much at rest plus your training.",
    proteinNote: "Just under a gram per pound, to keep your lifts.",
    carbsNote: "Most of it around training.",
    fatNote: "Enough for hormones and feeling full.",
  }),
  log: (user) => {
    const m = user.match(/weigh(?:ed|t)?[^0-9]*([0-9]{2,3}(?:\.[0-9])?)/i);
    if (m) return { kind: "weight", weightKg: Number(m[1]) * 0.4536, note: "Logged. Weigh at the same time each day for a clean trend.", items: [] };
    return {
      kind: "meal",
      items: [
        { name: "Grilled chicken salad", detail: "demo estimate, no dressing", kcal: 410, proteinG: 38, carbsG: 22, fatG: 18 },
        { name: "Iced oat latte", detail: "12 oz, unsweetened, assumed", kcal: 130, proteinG: 3, carbsG: 16, fatG: 5 },
      ],
      weightKg: null,
      note: "Demo mode: these are sample values, not estimates of what you typed.",
    };
  },
};
