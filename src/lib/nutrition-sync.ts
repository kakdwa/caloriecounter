import { useSyncExternalStore } from "react";
import { z } from "zod";
import { TimeZone, nutritionSnapshot } from "../../shared/nutrition-export";
import { store } from "./store";

const KEY = "calorie-tracker/nutrition-connection-v1";
const ConnectionSchema = z.object({ url: z.string().url(), token: z.string().min(32).max(512), timeZone: TimeZone });
type Connection = z.infer<typeof ConnectionSchema>;
type Status = { connection: Connection | null; phase: "off" | "waiting" | "syncing" | "synced" | "error"; message: string; syncedAt: string | null };
let connection: Connection | null = null;
try { connection = ConnectionSchema.parse(JSON.parse(localStorage.getItem(KEY) ?? "null")); } catch { /* Connection is optional. */ }
let status: Status = { connection, phase: connection ? "waiting" : "off", message: "", syncedAt: null };
const listeners = new Set<() => void>();
function update(patch: Partial<Status>) {
  status = { ...status, ...patch, connection };
  listeners.forEach(listener => listener());
}
export function useNutritionSync() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => status);
}

export function normalizeNutritionUrl(value: string) {
  const url = new URL(value.trim());
  if (url.username || url.password || url.search || url.hash) throw new Error("Use the server address without a password, query or fragment.");
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]" ||
    /^10\./.test(url.hostname) || /^192\.168\./.test(url.hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) throw new Error("Use HTTPS, or a local network address for development.");
  if (location.protocol === "https:" && url.protocol === "http:") throw new Error("This HTTPS page needs an HTTPS backend. For local testing, open Calorie from the local server too.");
  return url.href.replace(/\/$/, "");
}
export function nutritionEndpoint(config: Pick<Connection, "url">, path: string) {
  return `${config.url}/api/nutrition/${path}`;
}
async function request(config: Connection, path: string, body?: string) {
  let res: Response;
  try {
    res = await fetch(nutritionEndpoint(config, path), {
      method: body === undefined ? "GET" : "PUT",
      headers: { Authorization: `Bearer ${config.token}`, Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(body === undefined ? {} : { body }),
      signal: AbortSignal.timeout(15000), cache: "no-store", credentials: "omit", redirect: "error",
    });
  } catch { throw new Error("Could not reach the nutrition server. Check its address, connection and allowed app origin."); }
  const data = (res.headers.get("content-type") ?? "").includes("json") ? await res.json() : null;
  if (!res.ok) throw new Error(data?.error ?? `Nutrition server returned ${res.status}.`);
  if (!data || data.version !== 1 || !(data.syncedAt === null || typeof data.syncedAt === "string"))
    throw new Error("This address is not a Calorie nutrition backend. GitHub Pages cannot host this route.");
  return data as { version: 1; syncedAt: string | null; days: number };
}

let queued: { config: Connection; body: string } | null = null;
let running = false;
let last = "";
let timer: ReturnType<typeof setTimeout> | undefined;
// One request at a time: edits and Undo cannot race an older upload from this tab.
async function drain() {
  if (running) return;
  running = true;
  try {
    while (queued) {
      const job = queued;
      queued = null;
      if (job.config !== connection) continue;
      update({ phase: "syncing", message: "Syncing daily totals…" });
      try {
        const result = await request(job.config, "snapshot", job.body);
        if (job.config === connection) {
          last = job.body;
          update({ phase: "synced", syncedAt: result.syncedAt, message: "Daily totals are saved on your server." });
        }
      } catch (error) {
        if (job.config === connection) update({ phase: "error", message: error instanceof Error ? error.message : "Nutrition sync failed." });
      }
    }
  } finally { running = false; }
}
export function syncNutrition(force = true) {
  clearTimeout(timer);
  if (!connection) return;
  try {
    if (store.storageError()) throw new Error("Restore your saved food data before syncing nutrition.");
    const state = store.get();
    const body = JSON.stringify(nutritionSnapshot(state.entries, state.completedDays, connection.timeZone));
    if (!force && body === last && !running && !queued) return;
    queued = { config: connection, body };
    void drain();
  } catch (error) { update({ phase: "error", message: error instanceof Error ? error.message : "Could not prepare nutrition." }); }
}
export async function connectNutrition(url: string, token: string, timeZone: string) {
  const config = ConnectionSchema.parse({ url: normalizeNutritionUrl(url), token: token.trim(), timeZone });
  await request(config, "status");
  localStorage.setItem(KEY, JSON.stringify(config));
  connection = config;
  last = "";
  update({ phase: "waiting", syncedAt: null, message: "Connection saved." });
  syncNutrition();
}
export function disconnectNutrition() {
  localStorage.removeItem(KEY);
  connection = null;
  queued = null;
  last = "";
  clearTimeout(timer);
  update({ phase: "off", syncedAt: null, message: "Disconnected. Existing server data is retained; Apple Health records are unchanged." });
}
export function startNutritionSync() {
  const schedule = () => {
    if (!connection) return;
    clearTimeout(timer);
    timer = setTimeout(() => syncNutrition(false), 800);
  };
  const retry = () => { if (status.phase === "error" || status.phase === "waiting") syncNutrition(); };
  const unsubscribe = store.subscribe(schedule);
  window.addEventListener("online", retry);
  const retryTimer = setInterval(retry, 30000);
  schedule();
  return () => { unsubscribe(); clearTimeout(timer); clearInterval(retryTimer); window.removeEventListener("online", retry); };
}
