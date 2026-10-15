import { DraftSchema } from "../../shared/state-schema";
import type { CoachUpdate, ImageInput } from "../../shared/types";

export interface Draft { text: string; images: ImageInput[]; selectedId: string | null; update: CoachUpdate | null; logDate?: string }
const KEY = "calorie-tracker/draft-v1";
export const emptyDraft = (): Draft => ({ text: "", images: [], selectedId: null, update: null });
export function readDraft(storage: Pick<Storage, "getItem">): Draft {
  try {
    const raw = storage.getItem(KEY);
    return raw ? DraftSchema.parse(JSON.parse(raw)) : emptyDraft();
  } catch { return emptyDraft(); }
}
export function writeDraft(storage: Pick<Storage, "setItem" | "removeItem">, draft: Draft): boolean {
  try {
    if (!draft.text && !draft.images.length && !draft.update && !draft.selectedId) storage.removeItem(KEY);
    else storage.setItem(KEY, JSON.stringify(draft));
    return true;
  } catch { return false; }
}
