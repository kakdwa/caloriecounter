import type { CoachUpdate } from "../../shared/types";
import type { Data } from "./data";
import { date as DateSchema } from "../../shared/coach";

export type QuickAction =
  | { type: "complete"; date: string; complete: boolean }
  | { type: "practice" }
  | { type: "repeat"; entryId: string; date: string }
  | { type: "remove"; entryId: string };

/** Explicit controls use the same atomic, undoable transaction as reviewed AI output. */
export function quickUpdate(data: Data, action: QuickAction, today: string): CoachUpdate {
  const update: CoachUpdate = {
    title: "Saved", summary: "", question: null, plan: null, meals: [],
    weighIns: [], events: [], reflection: null, focusCompleted: false,
    options: [], demo: !!data.plan?.demo,
  };
  if (action.type === "practice") {
    if (!data.plan?.coaching?.focus) throw new Error("Choose a focus in your plan first.");
    update.focusCompleted = true;
  } else if (action.type === "complete") {
    if (!DateSchema.safeParse(action.date).success || action.date > today)
      throw new Error("Choose today or an earlier day.");
    if (action.complete && !data.entries.some(e => e.date === action.date && (data.plan?.demo || !e.demo)))
      throw new Error("Log your food before marking the day complete.");
    update.completedDays = [{ date: action.date, complete: action.complete }];
  } else {
    const entry = data.entries.find(e => e.id === action.entryId);
    if (!entry) throw new Error("This meal has changed. Please choose it again.");
    if (action.type === "repeat" && (!DateSchema.safeParse(action.date).success || action.date > today))
      throw new Error("Choose today or an earlier day.");
    if (!data.plan?.demo && entry.demo) throw new Error("Sample meals cannot be added to your personal records.");
    update.demo = !!entry.demo;
    update.meals = [{ operation: action.type === "repeat" ? "add" : "remove",
      entryId: action.type === "repeat" ? null : entry.id,
      date: action.type === "repeat" ? action.date : entry.date,
      label: entry.text, items: structuredClone(entry.items) }];
  }
  return update;
}
