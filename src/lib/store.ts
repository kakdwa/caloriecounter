import { useSyncExternalStore } from "react";
import type { Entry, Plan, WeighIn, CoachUpdate } from "../../shared/types";
import {
  applyUpdate,
  emptyData,
  type State,
  type Settings,
  type Data,
} from "./data";
import { DataSchema } from "../../shared/state-schema";
import { localDate } from "./format";
export { uid } from "./data";
export type { State, Settings } from "./data";
const KEY = "calorie-tracker/v1";
const empty = (): State => ({
  ...emptyData(),
  settings: { provider: "deepseek", apiKeys: {} },
});
let storageError = "";
function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw);
    const data = DataSchema.parse({ ...emptyData(), ...p });
    return {
      ...data,
      settings: {
        provider: p.settings?.provider ?? "deepseek",
        apiKeys: p.settings?.apiKeys ?? {},
      },
    };
  } catch {
    storageError =
      "Saved data could not be read. The original is preserved. Restore a valid backup or start over in settings.";
    return empty();
  }
}
let state = load();
let previous: Data | null = null;
const listeners = new Set<() => void>();
function set(next: State) {
  // A failed save must never appear successful or overwrite an unreadable original.
  if (storageError) throw new Error(storageError);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    throw new Error(
      "Your browser could not save this. Free some storage or enable site storage, then retry.",
    );
  }
  state = next;
  listeners.forEach((l) => l());
}
export const store = {
  get: () => state,
  storageError: () => storageError,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  apply(u: CoachUpdate, today: string) {
    const next = applyUpdate(state, u, today);
    const before = structuredClone(state);
    set({ ...next, settings: state.settings });
    previous = before;
  },
  undo() {
    if (!previous) return;
    const before = previous;
    set({ ...before, settings: state.settings });
    previous = null;
  },
  addHistory(user: string, assistant: string) {
    set({
      ...state,
      history: [
        ...state.history,
        { user: user.slice(0, 12000), assistant: assistant.slice(0, 24000) },
      ].slice(-24),
    });
  },
  setPlan(plan: Plan) {
    set({
      ...state,
      plan,
      weighIns: state.weighIns.length
        ? state.weighIns
        : [{ date: localDate(), weightKg: plan.profile.weightKg }],
    });
  },
  addEntry(entry: Entry) {
    set({ ...state, entries: [...state.entries, entry] });
  },
  removeEntry(id: string) {
    set({ ...state, entries: state.entries.filter((e) => e.id !== id) });
  },
  addWeighIn(w: WeighIn) {
    set({
      ...state,
      weighIns: [...state.weighIns.filter((x) => x.date !== w.date), w].sort(
        (a, b) => a.date.localeCompare(b.date),
      ),
    });
  },
  setSettings(patch: Partial<Settings>) {
    set({ ...state, settings: { ...state.settings, ...patch } });
  },
  restore(data: Data) {
    const before = structuredClone(state);
    const oldError = storageError;
    storageError = "";
    try {
      set({ ...data, settings: state.settings });
    } catch (error) {
      storageError = oldError;
      throw error;
    }
    previous = before;
  },
  reset() {
    storageError = "";
    set({ ...empty(), settings: state.settings });
    previous = null;
  },
};
export function useStore() {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
