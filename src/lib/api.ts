import type { FoodItem, LogResponse, Plan, PlanResponse, Provider, ProviderStatus, Unit } from "../../shared/types";
import { store } from "./store";

export class ApiError extends Error {}

function clientFields() {
  const { provider, apiKeys } = store.get().settings;
  const p = provider ?? undefined;
  return { provider: p, apiKey: p ? apiKeys[p] : undefined };
}

async function post<T>(path: string, body: unknown): Promise<T & { demo?: boolean }> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...(body as object), ...clientFields() }),
    });
  } catch {
    throw new ApiError("Could not reach the server. Is it running?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T & { demo?: boolean };
}

export function buildPlan(text: string, current?: Plan | null) {
  return post<PlanResponse>("/api/plan", { text, current: current ?? undefined });
}

export function parseLog(
  text: string,
  context: { remainingKcal: number; remainingProteinG: number; unit: Unit },
  previous?: FoodItem[],
) {
  return post<LogResponse>("/api/log", {
    text,
    previous,
    context: { ...context, localTime: new Date().toString() },
  });
}

export async function getProviders(): Promise<{ default: Provider; providers: ProviderStatus[] }> {
  const res = await fetch("/api/providers");
  if (!res.ok) throw new ApiError("Could not reach the server.");
  return res.json();
}
