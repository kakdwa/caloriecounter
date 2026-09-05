import type { Entry, FoodItem } from "../../shared/types";

export function itemTotals(items: FoodItem[]) {
  return items.reduce(
    (s, i) => ({ kcal: s.kcal + i.kcal, proteinG: s.proteinG + i.proteinG, carbsG: s.carbsG + i.carbsG, fatG: s.fatG + i.fatG }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

export function totals(entries: Entry[]) {
  return itemTotals(entries.flatMap((e) => e.items));
}
