// Talks to the API server when one exists (npm run dev / npm start). On static hosting such as
// GitHub Pages there is no server, so the same pipeline runs here in the browser with the user's key.
import type { FoodItem, LogResponse, Plan, PlanResponse, Provider, ProviderStatus, Unit } from "../../shared/types";
import { PROVIDERS } from "../../shared/catalog";
import { store } from "./store";

export class ApiError extends Error {}

export type Mode = "server" | "direct";

export interface ProvidersInfo {
  mode: Mode;
  default: Provider;
  providers: ProviderStatus[];
}

let modePromise: Promise<ProvidersInfo> | null = null;

/** Probe once: a real API answers /api/providers; static hosting returns 404 or HTML. */
export function getProviders(): Promise<ProvidersInfo> {
  modePromise ??= (async () => {
    try {
      const res = await fetch("api/providers", { headers: { accept: "application/json" }, signal: AbortSignal.timeout(5000) });
      if (res.ok && (res.headers.get("content-type") ?? "").includes("json")) {
        const data = await res.json();
        return { mode: "server", default: data.default, providers: data.providers } as ProvidersInfo;
      }
    } catch {
      // fall through to direct mode
    }
    return {
      mode: "direct",
      default: "deepseek",
      providers: (Object.keys(PROVIDERS) as Provider[]).map((p) => ({ provider: p, configured: false, label: PROVIDERS[p].label, model: PROVIDERS[p].model })),
    };
  })();
  return modePromise;
}

function chosen(info: ProvidersInfo) {
  const { provider, apiKeys } = store.get().settings;
  const p = provider ?? info.default;
  return { provider: p, apiKey: apiKeys[p]?.trim() || undefined };
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(100000), body: JSON.stringify(body) });
  } catch {
    throw new ApiError("Could not reach the server. Is it running?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

// The adapters pull in the Anthropic SDK and zod, so they load only when the browser must call a provider itself.
const direct = () => Promise.all([import("../../shared/providers"), import("../../shared/pipeline")]);

async function wrap<T>(run: (mods: Awaited<ReturnType<typeof direct>>) => Promise<T>): Promise<T> {
  const mods = await direct();
  try {
    return await run(mods);
  } catch (e) {
    throw new ApiError(e instanceof mods[0].AiError ? e.message : "Something went wrong talking to the model.");
  }
}

export async function buildPlan(text: string, current?: Plan | null): Promise<PlanResponse> {
  const info = await getProviders();
  const c = chosen(info);
  if (info.mode === "server") return post<PlanResponse>("api/plan", { text, current: current ?? undefined, ...c });
  return wrap(([prov, pipe]) => pipe.runPlan(prov.makeClient(c.provider, c.apiKey), text, current));
}

export async function parseLog(
  text: string,
  context: { remainingKcal: number; remainingProteinG: number; unit: Unit },
  previous?: FoodItem[],
): Promise<LogResponse> {
  const info = await getProviders();
  const c = chosen(info);
  const ctx = { ...context, localTime: new Date().toString() };
  if (info.mode === "server") return post<LogResponse>("api/log", { text, previous, context: ctx, ...c });
  return wrap(([prov, pipe]) => pipe.runLog(prov.makeClient(c.provider, c.apiKey), text, ctx, previous));
}

export async function checkKey(provider: Provider, apiKey: string): Promise<{ ok: boolean; message: string }> {
  const info = await getProviders();
  if (info.mode === "direct") return (await import("../../shared/providers")).checkKey(provider, apiKey);
  const res = await fetch("api/check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider, apiKey }),
  }).catch(() => null);
  if (!res) return { ok: false, message: "Could not reach the server." };
  return res.json();
}


export async function sendToCoach(text: string, images: import("../../shared/types").ImageInput[], context: import("../../shared/types").CoachContext, onStage?: (stage: import("../../shared/types").CoachStage) => void): Promise<import("../../shared/types").CoachUpdate> {
  const info = await getProviders();
  const c = chosen(info);
  if (info.mode === "server") return streamCoach({ text, images, context, ...c }, onStage);
  try {
    const [providers, coach] = await Promise.all([import("../../shared/providers"), import("../../shared/coach")]);
    return await coach.runCoach(providers.makeClient(c.provider, c.apiKey), { text, images }, context, onStage);
  } catch (e) {
    const message = e instanceof Error ? e.message : "I could not finish that. Please try again.";
    if (/dynamically imported|module script|Importing a module/i.test(message)) throw new ApiError("The app has been updated. Copy any unsent message, then reload this page. Your saved records are safe.");
    throw new ApiError(message);
  }
}

async function streamCoach(body: unknown, onStage?: (stage: import("../../shared/types").CoachStage) => void): Promise<import("../../shared/types").CoachUpdate> {
  let res: Response;
  try { res = await fetch("api/coach", { method: "POST", headers: { "content-type": "application/json", accept: "application/x-ndjson" }, body: JSON.stringify(body), signal: AbortSignal.timeout(270000) });
  } catch { throw new ApiError("Could not reach your coach or the request timed out. Your message is still here to retry."); }
  if (!res.ok) {
    const failure = await res.json().catch(() => ({}));
    throw new ApiError(failure.error ?? "Could not reach your coach. Try again.");
  }
  if (!res.headers.get("content-type")?.includes("ndjson")) return res.json();
  const reader = res.body?.getReader();
  if (!reader) throw new ApiError("No response received. Please retry.");
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n"); buffer = lines.pop()!;
      if (done && buffer.trim()) lines.push(buffer);
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.error) throw new ApiError(event.error);
        if (["understanding", "searching", "structuring"].includes(event.stage)) onStage?.(event.stage);
        if (event.result) return event.result;
      }
      if (done) break;
    }
    throw new ApiError("The response was interrupted. Your message is still here to retry.");
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
