import type {
  CoachMemory,
  BodyMetrics,
  CoachUpdate,
  Entry,
  Plan,
  Provider,
  WeighIn,
  RecoveryRecord,
} from "../../shared/types";
export interface Settings {
  provider: Provider | null;
  apiKeys: Partial<Record<Provider, string>>;
}
export interface Data {
  recovery: RecoveryRecord[];
  bodyMetrics: BodyMetrics[];
  plan: Plan | null;
  entries: Entry[];
  weighIns: WeighIn[];
  memory: CoachMemory;
  completedDays: string[];
  history: { user: string; assistant: string }[];
}
export interface State extends Data {
  settings: Settings;
}
export const emptyData = (): Data => ({
  recovery: [],
  bodyMetrics: [],
  plan: null,
  entries: [],
  weighIns: [],
  memory: { events: [], reflections: [], practices: [] },
  completedDays: [],
  history: [],
});
export const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  Math.random().toString(36).slice(2) + Date.now().toString(36);
export function hasChanges(u: CoachUpdate) {
  return Boolean(
    u.recovery?.length ||
    u.bodyMetrics?.length ||
    u.plan ||
    u.meals.length ||
    u.weighIns.length ||
    u.events.length ||
    u.reflection ||
    u.focusCompleted ||
    u.removedPractices?.length ||
    u.completedDays?.length ||
    u.removedEventIds?.length,
  );
}
/** Pure, atomic transaction. Unknown edit references fail before any state is changed. */
export function applyUpdate(data: Data, u: CoachUpdate, today: string): Data {
  if (u.question) throw new Error("Answer the question before saving.");
  let next: Data = structuredClone(data);
  if (u.plan) {
    if (data.plan?.demo && !u.plan.demo)
      next = { ...emptyData(), history: data.history };
    next.plan = u.plan;
    if (!next.weighIns.length)
      next.weighIns = [{ date: today, weightKg: u.plan.profile.weightKg }];
  }
  for (const m of u.meals) {
    if (m.operation !== "add" && !next.entries.some((e) => e.id === m.entryId))
      throw new Error("This meal has changed. Please review it again.");
    const previous = next.entries.find((e) => e.id === m.entryId);
    if (m.operation !== "add")
      next.entries = next.entries.filter((e) => e.id !== m.entryId);
    if (m.operation !== "remove")
      next.entries.push({
        id: previous?.id ?? uid(),
        date: m.date,
        time: previous?.time ?? new Date().toISOString(),
        text: m.label,
        items: m.items,
        demo: u.demo,
      });
    // Editing a finished day makes completeness explicit again.
    next.completedDays = next.completedDays.filter(
      (d) => d !== m.date && d !== previous?.date,
    );
  }
  for (const w of u.weighIns)
    next.weighIns = [...next.weighIns.filter((v) => v.date !== w.date), w];
  for (const m of u.bodyMetrics ?? []) {
    const old = next.bodyMetrics.find((x) => x.date === m.date);
    next.bodyMetrics = [
      ...next.bodyMetrics.filter((x) => x.date !== m.date),
      { ...old, ...m },
    ];
  }
  next.bodyMetrics.sort((a, b) => a.date.localeCompare(b.date));
  for (const record of u.recovery ?? []) {
    const old = next.recovery.find(r => r.date === record.date);
    next.recovery = [...next.recovery.filter(r => r.date !== record.date), { ...old, ...record }];
  }
  next.recovery.sort((a, b) => a.date.localeCompare(b.date));
  next.weighIns.sort((a, b) => a.date.localeCompare(b.date));
  for (const e of u.events)
    next.memory.events = [
      ...next.memory.events.filter(
        (v) => !(v.date === e.date && v.title === e.title),
      ),
      { ...e, id: uid() },
    ];
  next.memory.events = next.memory.events.filter(
    (e) => !u.removedEventIds?.includes(e.id),
  );
  if (u.reflection)
    next.memory.reflections.push({ date: today, text: u.reflection });
  const focus = next.plan?.coaching?.focus;
  next.memory.practices = next.memory.practices.filter(p =>
    !u.removedPractices?.some(removed => removed.date === p.date && removed.focus === p.focus));
  if (
    u.focusCompleted &&
    focus &&
    !next.memory.practices.some((p) => p.date === today && p.focus === focus)
  )
    next.memory.practices.push({ date: today, focus });
  for (const d of u.completedDays ?? [])
    next.completedDays = d.complete
      ? [...new Set([...next.completedDays, d.date])]
      : next.completedDays.filter((v) => v !== d.date);
  return next;
}
