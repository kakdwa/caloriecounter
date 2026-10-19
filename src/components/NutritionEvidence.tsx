import { Disclosure } from "./Motion";
import type { FoodItem, NutritionSource } from "../../shared/types";

export function SourceLinks({ sources }: { sources: NutritionSource[] }) {
  return <div className="source-links">{sources.map(s => (
    <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">
      <span>{s.title}</span><span aria-hidden="true">↗</span>
      {s.excerpt && <small>“{s.excerpt}”</small>}
      <small>{new URL(s.url).hostname} · Retrieved {new Date(s.accessedAt).toLocaleDateString()}</small>
    </a>
  ))}</div>;
}
const labels = { kcal: "Calories", proteinG: "protein", carbsG: "carbs", fatG: "fat" };
export function NutritionEvidence({ item }: { item: FoodItem }) {
  const evidence = item.evidence;
  if (!evidence) return <span className="evidence-tag estimate">Estimated nutrition</span>;
  return <Disclosure className="nutrition-evidence" title={<><span className="evidence-tag">↗ Source-linked</span> View nutrition sources</>}>
    <div className="evidence-content">
      <p><strong>{evidence.market}</strong> · {evidence.serving}</p>
      <p className="caption">Source-linked: {evidence.fields.map(f => labels[f]).join(", ")}. {evidence.fields.length < 4 ? "Other values are estimates. " : ""}AI matched this serving; review the original source.</p>
      <SourceLinks sources={evidence.sources} />
    </div>
  </Disclosure>;
}
