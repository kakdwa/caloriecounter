import { Disclosure, MeterFill } from "./Motion";
import type { State } from "../lib/store";
import { progressSummary } from "../../shared/progress";
import { addDays, weight, n, shortDate } from "../lib/format";

export function ProgressSummary({ state, today, prompt, compact = false, onOpen }: { state: State; today: string; prompt: (s: string) => void; compact?: boolean; onOpen?: () => void }) {
  const plan = state.plan!, summary = progressSummary(state, plan, today), unit = plan.profile.unit;
  const rate = (v: number) => weight(Math.abs(v), unit, 2) + "/week " + (v < 0 ? "down" : v > 0 ? "up" : "change");
  const starting = plan.startingWeightKg ?? plan.profile.weightKg;
  const goal = plan.profile.goalWeightKg;
  const hasJourney = goal != null && goal !== starting && plan.profile.goal !== "maintain";
  const readingDates = new Set(state.weighIns.filter(reading => reading.date >= summary.from && reading.date <= today).map(reading => reading.date));
  if (compact) return <button className="progress-glance" onClick={onOpen}>
    <span className="glance-icon" aria-hidden="true">↗</span><span><small>Your progress</small><strong>{summary.status}</strong><span>{summary.rateKg == null ? `${summary.recentCount} weigh-in${summary.recentCount === 1 ? "" : "s"} this week` : rate(summary.rateKg)}</span></span><span aria-hidden="true">→</span>
  </button>;
  return <section className="progress-summary visual-summary" aria-labelledby="progress-summary-title">
    <div className="summary-status"><span className="status-symbol" aria-hidden="true">{summary.rateKg == null ? "○" : Math.abs(summary.rateKg) <= .1 ? "→" : summary.rateKg < 0 ? "↘" : "↗"}</span><h2 id="progress-summary-title">{summary.status}</h2></div>
    <div className="journey-chart">
      <div className="journey-reading"><div><span className="small-label">Weekly average</span><strong>{summary.recentAverage == null ? "—" : weight(summary.recentAverage, unit, 1)}</strong></div><div><span className="small-label">{summary.goalProgress == null ? "Starting weight" : "Toward your weight goal"}</span><strong>{summary.goalProgress == null ? weight(starting, unit, 1) : `${Math.round(summary.goalProgress * 100)}%`}</strong></div></div>
      {hasJourney && <>
        <div className={`journey-rail ${summary.goalProgress == null ? "awaiting-data" : ""}`} role="img" aria-label={summary.goalProgress == null ? `Start ${weight(starting, unit, 1)}, goal ${weight(goal, unit, 1)}. Not enough readings for a current average.` : `${Math.round(summary.goalProgress * 100)} percent from starting weight ${weight(starting, unit, 1)} toward goal ${weight(goal, unit, 1)}.`}>
          {summary.goalProgress != null && <MeterFill ratio={summary.goalProgress} />}
          <i className="journey-origin" />
          {summary.goalProgress != null && <i className="journey-position" style={{ left: `${summary.goalProgress * 100}%` }} />}
          <i className="journey-destination" />
        </div>
        <div className="journey-endpoints"><span>Start <strong>{weight(starting, unit, 1)}</strong></span><span>Goal <strong>{weight(goal, unit, 1)}</strong></span></div>
      </>}
    </div>
    {summary.rateKg == null ? <div className="baseline-coverage">
      <div className="coverage-weeks">{[0, 1].map(week => {
        const dates = Array.from({ length: 7 }, (_, index) => addDays(today, -13 + week * 7 + index));
        const count = dates.filter(date => readingDates.has(date)).length;
        return <div key={week}><span>{week === 0 ? "Previous 7 days" : "Latest 7 days"}</span><div className="coverage-dots" role="img" aria-label={`${count} weigh-ins ${week === 0 ? "in the previous seven days" : "in the latest seven days"}`}>{dates.map(date => <i key={date} className={readingDates.has(date) ? "has-reading" : ""} title={`${shortDate(date)}: ${readingDates.has(date) ? "weigh-in recorded" : "no reading"}`} />)}</div></div>;
      })}</div><p className="caption">A trend needs 3+ readings in each week and a recent weigh-in.</p>
    </div> : <div className="pace-pair"><div><span className="small-label">Observed pace</span><strong>{rate(summary.rateKg)}</strong></div><div><span className="small-label">Plan estimate</span><strong>{summary.intendedRate === 0 ? "Maintain" : rate(summary.intendedRate)}</strong></div></div>}
    <div className="review-signals" aria-label="Additional progress context">
      <div><span className="small-label">Waist · past 28 days</span><strong>{summary.recovery.waistChange == null ? "—" : `${summary.recovery.waistChange > 0 ? "+" : ""}${summary.recovery.waistChange.toFixed(1)} cm`}</strong><small>{summary.recovery.waistChange == null ? "Needs two readings, 7+ days apart" : `${shortDate(summary.recovery.waist[0].date)}–${shortDate(summary.recovery.waist.at(-1)!.date)}`}</small></div>
      <div><span className="small-label">Sleep · past 7 days</span><strong>{summary.recovery.averageSleep == null ? "—" : `${summary.recovery.averageSleep.toFixed(1)} h`}</strong><small>{summary.recovery.sleepCount ? `${summary.recovery.sleepCount} recorded ${summary.recovery.sleepCount === 1 ? "night" : "nights"}` : "No nights recorded"}</small></div>
      <div><span className="small-label">Hunger & energy</span><strong>{summary.recovery.records.some(r => r.hunger || r.energy) ? summary.recovery.reviewRecovery ? "Check in" : "Recorded" : "—"}</strong><small>{summary.recovery.records.filter(r => r.hunger || r.energy).length} reported check-ins</small></div>
    </div>
    <button className="next-step next-step-button" onClick={() => prompt(summary.next.prompt)}><span><span className="small-label">Your next step</span><strong>{summary.next.title}</strong></span><span className="next-step-arrow" aria-hidden="true">↗</span></button>
    <Disclosure className="progress-breakdown" title="Why this next step?">
      <p>{summary.next.detail}</p>
      <div className="intake-comparison"><div><span className="small-label">Complete-day intake</span><strong>{summary.averageKcal == null ? "—" : n(summary.averageKcal)}<small> / {n(plan.targets.calories)} kcal</small></strong></div><div><span className="small-label">Complete-day protein</span><strong>{summary.averageProtein == null ? "—" : n(summary.averageProtein)}<small> / {plan.targets.proteinG} g</small></strong></div></div>
      <p className="caption">{summary.completeDays} complete food days, {shortDate(summary.intakeFrom)}–{shortDate(summary.to)}. Unlogged days are excluded.</p>
      {plan.targetsChangedAt && plan.targetsChangedAt > summary.from && <p className="caption">Targets changed {shortDate(plan.targetsChangedAt)}. Food averages use the current targets’ period.</p>}
      <p className="caption">Trend compares two seven-day windows with at least three weigh-ins each and a reading in the last three days, adjusted for reading dates. A change of 0.1 kg/week or less is shown as broadly steady. This is a display convention, not a clinical threshold. Weight-goal progress does not measure fat loss. Targets change only with your approval.</p>
      <button className="secondary" onClick={() => prompt("Give me a structured progress review: my fat-loss plan, what the weight, waist, sleep, hunger and energy records show, what is working, what needs attention, and one practical next step. State missing data and uncertainty; do not treat weight loss as confirmed fat loss or change targets without asking.")}>Get my AI progress review ↗</button>
    </Disclosure>
  </section>;
}
