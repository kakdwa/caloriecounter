import type { State } from "../lib/store";
import { progressSummary } from "../../shared/progress";
import { weight, n, shortDate } from "../lib/format";
import { AnimatedNumber } from "./AnimatedNumber";

export function ProgressSummary({ state, today, prompt, compact = false }: { state: State; today: string; prompt: (s: string) => void; compact?: boolean }) {
  const plan = state.plan!, summary = progressSummary(state, plan, today), unit = plan.profile.unit;
  const rate = (v: number) => weight(Math.abs(v), unit, 2) + "/week " + (v < 0 ? "down" : v > 0 ? "up" : "change");
  if (compact) return <button className="progress-glance" onClick={() => prompt("Review my fat-loss plan and progress: what is working, what needs attention, and one practical next step. Distinguish weight change from fat loss.")}>
    <span className="glance-icon" aria-hidden="true">↗</span><span><small>YOUR PROGRESS</small><strong>{summary.status}</strong><span>{summary.rateKg == null ? "More readings will make the trend clearer." : `${rate(summary.rateKg)} · recent weight trend`}</span></span><span aria-hidden="true">→</span>
  </button>;
  return <section className="progress-summary" aria-labelledby="progress-summary-title">
    <div className="section-top"><span className="eyebrow blue">YOUR PLAN CHECK-IN</span><span className="caption">{shortDate(summary.from)} – {shortDate(summary.to)}</span></div>
    <h2 id="progress-summary-title">{summary.status}</h2>
    <p className="caption">{summary.rateKg == null ? "A trend needs at least three readings in each of the last two weeks, including a recent reading. Until then, no progress verdict." : `Based on ${summary.previousCount} readings in the previous week and ${summary.recentCount} this week. Weight change doesn't tell us how much fat changed.`}</p>
    <div className="progress-comparison">
      <div><span className="small-label">STARTING PACE ESTIMATE</span><strong>{summary.intendedRate === 0 ? "Maintain" : rate(summary.intendedRate)}</strong><small>From your plan, not a promised outcome</small></div>
      <div><span className="small-label">OBSERVED WEIGHT PACE</span><strong>{summary.rateKg == null ? "Not enough data" : rate(summary.rateKg)}</strong><small>{summary.faster ? "Faster than the starting estimate; check how you feel" : "Comparison of weekly averages, adjusted for reading dates"}</small></div>
    </div>
    {plan.profile.goalWeightKg != null && <div className="goal-journey">
      <div className="goal-labels"><span>Start <strong>{weight(plan.profile.weightKg, unit, 1)}</strong></span><span>Weekly average <strong>{summary.recentAverage == null ? "—" : weight(summary.recentAverage, unit, 1)}</strong></span><span>Goal <strong>{weight(plan.profile.goalWeightKg, unit, 1)}</strong></span></div>
      <div className="goal-track" aria-hidden="true"><span style={{ width: `${(summary.goalProgress ?? 0) * 100}%` }} /></div>
      <p className="caption">{summary.goalProgress == null ? "Your weight-goal progress appears when this week's average has enough readings." : `${Math.round(summary.goalProgress * 100)}% of the way from your starting weight to your weight goal. This is not a measure of fat lost.`}</p>
    </div>}
    <div className="intake-comparison">
      <div><span className="small-label">COMPLETE-DAY INTAKE</span><strong>{summary.averageKcal == null ? "—" : <AnimatedNumber value={summary.averageKcal} />}<small> / {n(plan.targets.calories)} kcal</small></strong></div>
      <div><span className="small-label">COMPLETE-DAY PROTEIN</span><strong>{summary.averageProtein == null ? "—" : <AnimatedNumber value={summary.averageProtein} />}<small> / {plan.targets.proteinG} g</small></strong></div>
    </div>
    <p className="caption">{summary.completeDays} {summary.completeDays === 1 ? "day" : "days"} marked complete in this review. Unlogged days are excluded. These are logged estimates, not measured energy balance.</p>
    <div className="next-step"><span className="small-label">WHAT TO WORK ON NEXT</span><h3>{summary.next.title}</h3><p>{summary.next.detail}</p><button className="text-link" onClick={() => prompt(summary.next.prompt)}>Work on this with my coach ↗</button></div>
    <button className="secondary" onClick={() => prompt("Give me a structured progress review: my fat-loss plan, what the weight and body-composition trends show, what is working, what needs attention, and one practical next step. State missing data and uncertainty; do not treat weight loss as confirmed fat loss or change targets without asking.")}>Get my AI progress review ↗</button>
    <details className="progress-method"><summary>How this review works</summary><p>We compare two seven-day windows with at least three weigh-ins each and a reading in the last three days. The pace is adjusted for the average dates of those readings. Only records since your current plan began are compared with its targets. A 0.1 kg/week change or less is described as broadly steady; this is a display convention, not a clinical threshold. Next-step prompts use logging coverage and your existing targets. They do not diagnose a plateau or change your plan.</p><p>Scale body-fat readings are estimates. Weight, fat percentage and lean mass are shown separately in your trends below.</p></details>
  </section>;
}
