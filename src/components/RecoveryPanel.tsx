import { useState } from "react";
import type { State } from "../lib/store";
import { recoverySummary } from "../../shared/recovery";
import { addDays, n, shortDate } from "../lib/format";
import { AutoHeight, Disclosure } from "./Motion";

export function RecoveryPanel({ state, today, prompt }: { state: State; today: string; prompt: (text: string) => void }) {
  const [date, setDate] = useState(today);
  const review = recoverySummary(state, today);
  const selected = review.records.find(record => record.date === date);
  const description = (value?: string) => value ? value === "steady" ? "Steady" : value === "high" ? "High" : "Low" : "—";
  return <section className="recovery-panel" aria-labelledby="recovery-title">
    <div className="section-top"><div><span className="small-label">How the week felt</span><h2 id="recovery-title">Recovery matters.</h2></div><button className="text-link" onClick={() => prompt("Today, my sleep, hunger and energy: ")}>Check in ↗</button></div>
    <div className="recovery-days" aria-label="Recovery date">{Array.from({ length: 7 }, (_, index) => {
      const d = addDays(today, index - 6), record = review.records.find(r => r.date === d);
      return <button key={d} aria-pressed={date === d} aria-label={`${shortDate(d)}${record ? ", check-in recorded" : ", no check-in"}`} onClick={() => setDate(d)}>
        <span>{new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: "narrow" })}</span>
        <strong>{new Date(`${d}T12:00:00`).getDate()}</strong><i className={record ? "recorded" : ""} aria-hidden="true" />
      </button>;
    })}</div>
    <AutoHeight><div className="recovery-reading" key={date}>
      <span className="small-label">{date === today ? "Today" : shortDate(date)} · {selected ? "Your check-in" : "No check-in"}</span>
      <dl><div><dt>Sleep</dt><dd>{selected?.sleepHours == null ? "—" : <>{selected.sleepHours}<small> h</small></>}</dd></div><div><dt>Hunger</dt><dd>{description(selected?.hunger)}</dd></div><div><dt>Energy</dt><dd>{description(selected?.energy)}</dd></div></dl>
      {selected?.steps != null && <p className="caption">{n(selected.steps)} steps recorded</p>}
      <button className="text-link" onClick={() => prompt(`${selected ? "Update" : "Record"} my sleep, hunger and energy for ${date}: `)}>{selected ? "Update check-in" : "Add a few words"} ↗</button>
    </div></AutoHeight>
    <Disclosure title="This week’s context">
      <p>{review.sleepCount ? `${review.averageSleep!.toFixed(1)} h average sleep across ${review.sleepCount} recorded night${review.sleepCount === 1 ? "" : "s"}.` : "Sleep has not been recorded this week."} {review.highHunger} high-hunger {review.highHunger === 1 ? "day" : "days"}; {review.lowEnergy} low-energy {review.lowEnergy === 1 ? "day" : "days"} reported.</p>
      <p className="caption">Missing days stay unknown. Two reports of high hunger or low energy, or three recorded nights averaging under six hours, prompt a check-in. These are product prompts, not clinical cutoffs. Your targets stay unchanged.</p>
    </Disclosure>
  </section>;
}
