import { createHash, timingSafeEqual, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { NutritionSnapshotSchema, NutritionDate, dateInZone, healthAutoExport, shortcutNutrition } from "../shared/nutrition-export";

const StoredSchema = z.object({ syncedAt: z.iso.datetime(), snapshot: NutritionSnapshotSchema }).strict();
interface Options { token?: string; file: string; allowedOrigins?: string[]; now?: () => Date }

/** Single-user, single-process service. Keep its private data directory on a persistent disk. */
export function createNutritionApi({ token, file, allowedOrigins = [], now = () => new Date() }: Options) {
  const app = new Hono();
  const configured = !!token && token.length >= 32;
  const expected = createHash("sha256").update(token ?? "").digest();
  let writes: Promise<unknown> = Promise.resolve();

  app.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Vary", "Origin");
    const origin = c.req.header("origin");
    if (origin && origin !== new URL(c.req.url).origin && !allowedOrigins.includes(origin))
      return c.json({ error: "This app origin is not allowed by the nutrition server." }, 403);
    if (origin) {
      c.header("Access-Control-Allow-Origin", origin);
      c.header("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
      c.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
    }
    if (c.req.method === "OPTIONS") return c.body(null, 204);
    if (!configured) return c.json({ error: "Nutrition export is not configured. Set NUTRITION_SYNC_TOKEN to a random secret of at least 32 characters." }, 503);
    const authorization = c.req.header("authorization") ?? "";
    const supplied = /^Bearer (\S+)$/i.exec(authorization)?.[1] ?? "";
    if (!timingSafeEqual(expected, createHash("sha256").update(supplied).digest())) {
      c.header("WWW-Authenticate", "Bearer");
      return c.json({ error: "A valid nutrition access token is required." }, 401);
    }
    await next();
  });
  app.use("*", bodyLimit({ maxSize: 4 * 1024 * 1024, onError: c => c.json({ error: "Nutrition data exceeds the 4 MB limit." }, 413) }));
  app.onError((_error, c) => c.json({ error: "The nutrition store could not be read or saved. Check server storage and retry." }, 500));

  async function read() {
    await writes.catch(() => {});
    try { return StoredSchema.parse(JSON.parse(await readFile(file, "utf8"))); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  function serialize(operation: () => Promise<void>) {
    const pending = writes.catch(() => {}).then(operation);
    writes = pending;
    return pending;
  }

  app.get("/status", async c => {
    const data = await read();
    return c.json({ version: 1, syncedAt: data?.syncedAt ?? null, days: data?.snapshot.days.length ?? 0 });
  });
  app.put("/snapshot", async c => {
    if (!(c.req.header("content-type") ?? "").includes("application/json"))
      return c.json({ error: "Send application/json." }, 415);
    const parsed = NutritionSnapshotSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid nutrition snapshot. Send version, timeZone and unique daily totals only." }, 400);
    const today = dateInZone(now(), parsed.data.timeZone);
    if (parsed.data.days.some(day => day.date > today)) return c.json({ error: "Future food logs cannot be exported." }, 400);
    const syncedAt = now().toISOString();
    await serialize(async () => {
      await mkdir(dirname(file), { recursive: true, mode: 0o700 });
      const temp = `${file}.${randomUUID()}.tmp`;
      try {
        await writeFile(temp, JSON.stringify({ syncedAt, snapshot: parsed.data }), { mode: 0o600, flag: "wx" });
        await rename(temp, file);
      } finally { await rm(temp, { force: true }); }
    });
    return c.json({ version: 1, syncedAt, days: parsed.data.days.length });
  });
  app.delete("/snapshot", async c => {
    await serialize(() => rm(file, { force: true }));
    return c.body(null, 204);
  });
  app.get("/daily", async c => {
    const format = c.req.query("format") ?? "health-auto-export";
    const requested = c.req.query("date") ?? "today";
    const incomplete = c.req.query("includeIncomplete") ?? "false";
    if (!["health-auto-export", "shortcuts"].includes(format) || !["true", "false"].includes(incomplete) ||
      (!["today", "yesterday"].includes(requested) && !NutritionDate.safeParse(requested).success))
      return c.json({ error: "Use date=YYYY-MM-DD, today or yesterday; format=health-auto-export or shortcuts; includeIncomplete=true or false." }, 400);
    const stored = await read();
    if (!stored) return c.json({ error: "No nutrition has been synced. Connect and sync from Calorie settings first." }, 404);
    const { snapshot, syncedAt } = stored;
    const today = dateInZone(now(), snapshot.timeZone);
    const yesterday = new Date(Date.parse(`${today}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
    const date = requested === "today" ? today : requested === "yesterday" ? yesterday : requested;
    const day = snapshot.days.find(d => d.date === date);
    if (!day) return c.json({ error: "No real food is logged for this day.", date, syncedAt }, 404);
    if (!day.complete && incomplete !== "true") return c.json({ error: "Finish this day in Calorie before importing it into Apple Health.", date, syncedAt }, 409);
    c.header("X-Nutrition-Synced-At", syncedAt);
    return c.json(format === "shortcuts" ? shortcutNutrition(day, snapshot.timeZone, syncedAt) : healthAutoExport(day, snapshot.timeZone));
  });
  app.notFound(c => c.json({ error: "Nutrition route not found." }, 404));
  return app;
}
