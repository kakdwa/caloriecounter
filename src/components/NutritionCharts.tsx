import { useId, useLayoutEffect, useRef, useState } from "react";
import type { State } from "../lib/store";
import type { Targets } from "../../shared/types";
import { addDays, n, shortDate } from "../lib/format";
import { macroEnergy, nutritionHistory } from "../lib/nutrition-history";
import { Disclosure, gsap, useGSAP, useMotionPreference } from "./Motion";

/** Observe a chart's actual width so labels stay readable on small phones. */
export function useChartWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(160, entry.contentRect.width)));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

export function MacroComposition({ targets }: { targets: Targets }) {
  const shares = macroEnergy(targets.proteinG, targets.carbsG, targets.fatG);
  const names = ["Protein", "Carbs", "Fat"];
  return <figure className="macro-composition">
    <figcaption className="small-label">Energy from your macros</figcaption>
    <div className="composition-bar" role="img" aria-label={names.map((name, i) => `${name} ${Math.round(shares[i] * 100)} percent`).join(", ")}>
      {names.map((name, i) => <span key={name} data-nutrient={name.toLowerCase()} style={{ flex: shares[i] }} aria-hidden="true">{shares[i] >= .12 ? `${Math.round(shares[i] * 100)}%` : ""}</span>)}
    </div>
  </figure>;
}

export function EnergyBalance({ targets }: { targets: Targets }) {
  const max = Math.max(targets.calories, targets.tdee, 1), delta = targets.calories - targets.tdee;
  return <figure className="energy-balance">
    <figcaption><span className="small-label">Your daily energy plan</span><strong>{delta === 0 ? "Maintenance" : `${n(Math.abs(delta))} kcal ${delta < 0 ? "deficit" : "surplus"}`}</strong></figcaption>
    <div className="balance-row"><span>Eat</span><div><i style={{ width: `${targets.calories / max * 100}%` }} /></div><strong>{n(targets.calories)}</strong></div>
    <div className="balance-row needs"><span>Use ≈</span><div><i style={{ width: `${targets.tdee / max * 100}%` }} /></div><strong>{n(targets.tdee)}</strong></div>
    <span className="caption">Daily needs are an estimate · kcal</span>
  </figure>;
}

export function IntakeHistory({ state, today, range }: { state: State; today: string; range: number }) {
  const from = addDays(today, 1 - range);
  const days = nutritionHistory(state.entries, state.completedDays, from, range, !!state.plan?.demo);
  const [selectedDate, selectDate] = useState(today);
  const selectedIndex = Math.max(0, days.findIndex(day => day.date === selectedDate));
  const selected = days[selectedIndex];
  const { ref, width } = useChartWidth();
  const pattern = useId().replaceAll(":", "");
  const reduced = useMotionPreference();
  const target = state.plan!.targets.calories;
  const targetFrom = (state.plan!.targetsChangedAt ?? state.plan!.createdAt).slice(0, 10);
  const complete = days.filter(day => day.status === "complete");
  const average = complete.length ? complete.reduce((sum, day) => sum + day.kcal, 0) / complete.length : null;
  const ceiling = Math.ceil(Math.max(target * 1.15, ...days.map(day => day.kcal), 1) / 500) * 500;
  const left = 40, right = width - 8, top = 32, bottom = 184;
  const slot = (right - left) / days.length;
  const y = (value: number) => bottom - value / ceiling * (bottom - top);
  const targetIndex = days.findIndex(day => day.date >= targetFrom);
  useGSAP(() => {
    const bars = ref.current?.querySelectorAll(".intake-bar");
    if (reduced || !bars?.length) return;
    gsap.fromTo(bars, { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: .4, stagger: Math.min(.02, .18 / range), ease: "power2.out", clearProps: "transform" });
  }, { scope: ref, dependencies: [range, reduced], revertOnUpdate: true });
  return <section className="chart-section intake-history" aria-labelledby="intake-history-title">
    <div className="section-top"><div><span className="small-label">Daily intake</span><h2 id="intake-history-title">{average == null ? "Your food, day by day" : <>{n(average)} <small>kcal / day</small></>}</h2></div><span className="caption">{complete.length} complete {complete.length === 1 ? "day" : "days"}</span></div>
    <div className="chart-legend"><span><i className="legend-complete" />Complete</span><span><i className="legend-partial"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M0 4L4 0M0 10L10 0M4 12L12 4M10 12L12 10" /></svg></i>In progress</span><span><i className="legend-target" />Current target</span></div>
    <div ref={ref} className="history-plot">
      <svg viewBox={`0 0 ${width} 224`} role="img" aria-label={`Daily calories, ${shortDate(from)} to ${shortDate(today)}. ${complete.length} complete days. Current target ${n(target)} kcal. Missing days are gaps.`} onClick={event => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const clickedX = (event.clientX - bounds.left) * width / bounds.width;
        const index = Math.max(0, Math.min(days.length - 1, Math.floor((clickedX - left) / slot)));
        selectDate(days[index].date);
      }}>
        <defs><pattern id={pattern} width="6" height="6" patternUnits="userSpaceOnUse"><path d="M-1 1L1-1M0 6L6 0M5 7L7 5" stroke="var(--accent)" strokeWidth="1.5" /></pattern></defs>
        {[0, ceiling / 2, ceiling].map(value => <g key={value}><path d={`M${left} ${y(value)}H${right}`} stroke="var(--hair)" /><text x="0" y={y(value) + 4}>{value === 0 ? "0" : `${value / 1000}k`}</text></g>)}
        {days.map((day, i) => <g key={day.date}>
          {i === selectedIndex && <rect x={left + i * slot} y={top} width={slot} height={bottom - top} fill="var(--tint)" />}
          {day.status !== "missing" && <rect className="intake-bar" x={left + i * slot + slot * .15} y={y(day.kcal)} width={slot * .7} height={Math.max(1, bottom - y(day.kcal))} fill={day.status === "complete" ? "var(--accent)" : `url(#${pattern})`} stroke="var(--accent)" strokeWidth={day.status === "partial" ? 1 : 0}><title>{shortDate(day.date)}: {n(day.kcal)} kcal, {day.status === "complete" ? "complete" : "in progress"}</title></rect>}
        </g>)}
        {targetIndex >= 0 && <g><path d={`M${left + targetIndex * slot} ${y(target)}H${right}`} stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="5 4" /><text className="chart-target-label" x={right} y={y(target) - 8} textAnchor="end">{n(target)} target</text></g>}
        <text x={left} y="216">{shortDate(from)}</text><text x={right} y="216" textAnchor="end">{shortDate(today)}</text>
      </svg>
      <label className="chart-scrubber"><span className="sr-only">Inspect food log day</span><input type="range" min="0" max={range - 1} value={selectedIndex} aria-valuetext={`${shortDate(selected.date)}: ${selected.status === "missing" ? "no food logged" : `${n(selected.kcal)} kcal, ${selected.status === "complete" ? "complete" : "in progress"}`}`} onChange={event => selectDate(days[Number(event.target.value)].date)} /></label>
    </div>
    <div className="chart-selection" aria-live="polite"><span>{shortDate(selected.date)}</span><strong>{selected.status === "missing" ? "No log" : <>{n(selected.kcal)} <small>kcal</small></>}</strong><span>{selected.status === "missing" ? "Not counted as zero" : selected.status === "complete" ? "Complete" : "In progress"}</span></div>
    <Disclosure title="Daily values & chart notes">
      <p className="caption">Average uses complete days only. Striped bars are unfinished logs. The dashed line shows your current target from the date it was set.</p>
      <div className="chart-table-wrap"><table className="chart-table"><thead><tr><th>Date</th><th>kcal</th><th>Status</th></tr></thead><tbody>{days.slice().reverse().map(day => <tr key={day.date}><th scope="row">{shortDate(day.date)}</th><td>{day.status === "missing" ? "—" : n(day.kcal)}</td><td>{day.status === "missing" ? "No log" : day.status === "complete" ? "Complete" : "In progress"}</td></tr>)}</tbody></table></div>
    </Disclosure>
  </section>;
}

export function PracticeCalendar({ state, today, range }: { state: State; today: string; range: number }) {
  const days = Array.from({ length: range }, (_, i) => addDays(today, 1 - range + i));
  const practiced = new Set(state.memory.practices.map(day => day.date));
  const count = days.filter(day => practiced.has(day)).length;
  return <section className="practice-calendar chart-section">
    <div className="section-top"><h2>Small steps, adding up</h2><span><strong>{count}</strong> practice {count === 1 ? "day" : "days"}</span></div>
    <div className="practice-map" role="img" aria-label={`${count} practice ${count === 1 ? "day" : "days"} from ${shortDate(days[0])} to ${shortDate(today)}. Filled squares mean a recorded practice.`}>{days.map(date => <span key={date} className={practiced.has(date) ? "practiced" : ""} title={`${shortDate(date)}: ${practiced.has(date) ? "practiced" : "not recorded"}`} aria-hidden="true">{practiced.has(date) && <svg viewBox="0 0 24 24"><path d="m5 12 4 4 10-10" /></svg>}</span>)}</div>
    <div className="calendar-ends caption"><span>{shortDate(days[0])}</span><span>{shortDate(today)}</span></div>
  </section>;
}
