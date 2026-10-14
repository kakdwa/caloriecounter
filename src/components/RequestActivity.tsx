import type { CoachStage } from "../../shared/types";
const stages = {
  understanding: ["Understanding your input", "Turning your words and photos into a clear next step."],
  searching: ["Looking up nutrition", "Checking web sources for the right menu and serving."],
  structuring: ["Preparing your review", "Putting the details together. You decide what gets saved."],
};
export function RequestActivity({ stage, input }: { stage: CoachStage; input: string }) {
  return <div className="request-activity" role="status" aria-live="polite">
    <div className="input-receipt"><span>You</span><p>{input || "Meal photo"}</p></div>
    <div className="activity-body">
      <div className="activity-glyph" aria-hidden="true"><i /><i /><i /></div>
      <div key={stage} className="activity-copy"><strong>{stages[stage][0]}</strong><p>{stages[stage][1]}</p></div>
    </div>
    <div className="activity-track" aria-hidden="true"><span /></div>
  </div>;
}
