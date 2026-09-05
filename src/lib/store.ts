import { useSyncExternalStore } from "react";
import type { Entry, Plan, Provider, WeighIn } from "../../shared/types";

export interface Settings {
  provider: Provider | null;
  apiKeys: Partial<Record<Provider, string>>;
}

export interface State {
  plan: Plan | null;
  entries: Entry[];
  weighIns: WeighIn[];
  settings: Settings;
}

const KEY = "calorie-tracker/v1";

const empty: State = { plan: null, entries: [], weighIns: [], settings: { provider: null, apiKeys: {} } };

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<State>;
    return { ...empty, ...parsed, settings: { ...empty.settings, ...(parsed.settings ?? {}) } };
  } catch {
    return empty;
  }
}

let state: State = load();
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage full or unavailable; keep going in memory
  }
  listeners.forEach((l) => l());
}

export const store = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  setPlan(plan: Plan) {
    const weighIns = state.weighIns.length
      ? state.weighIns
      : [{ date: plan.createdAt.slice(0, 10), weightKg: plan.profile.weightKg }];
    set({ ...state, plan, weighIns });
  },
  addEntry(entry: Entry) {
    set({ ...state, entries: [...state.entries, entry] });
  },
  removeEntry(id: string) {
    set({ ...state, entries: state.entries.filter((e) => e.id !== id) });
  },
  addWeighIn(w: WeighIn) {
    const others = state.weighIns.filter((x) => x.date !== w.date);
    set({ ...state, weighIns: [...others, w].sort((a, b) => a.date.localeCompare(b.date)) });
  },
  setSettings(patch: Partial<Settings>) {
    set({ ...state, settings: { ...state.settings, ...patch } });
  },
  reset() {
    set({ ...empty, settings: state.settings });
  },
};

export function useStore(): State {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
