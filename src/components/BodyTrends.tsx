import { Disclosure, gsap, useGSAP, useMotionPreference } from "./Motion";
import { useState } from "react";
import type { BodyMetrics, WeighIn, Unit } from "../../shared/types";
import type { HealthMetric } from "../lib/health";
import { shortDate } from "../lib/format";
import { useChartWidth } from "./NutritionCharts";

type ChartMetric = HealthMetric | "waistCm";
const names: Record<ChartMetric, string> = { weightKg: "Weight", waistCm: "Waist", bodyFatPercent: "Body fat", leanBodyMassKg: "Lean mass", bmi: "BMI" };

export function BodyTrends({ weights, measurements, unit, from, to, onPrompt, onHealth }: {
  weights: WeighIn[]; measurements: BodyMetrics[]; unit: Unit;
  from: string; to: string; onPrompt: (v: string) => void; onHealth: () => void;
}) {
  const [metric, setMetric] = useState<ChartMetric>("weightKg");
  const [selectedDate, selectDate] = useState<string | null>(null);
  const { ref, width } = useChartWidth();
  const reduced = useMotionPreference();
  const rows = new Map<string, Partial<Record<ChartMetric, number>> & { date: string }>();
  for (const w of weights) rows.set(w.date, w);
  for (const m of measurements) rows.set(m.date, { ...rows.get(m.date), ...m });
  const records = [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
  const units = (m: ChartMetric) => m === "waistCm" ? "cm" : m === "bodyFatPercent" ? "%" : m === "bmi" ? "" : unit;
  const value = (v: number, m: ChartMetric) => (m === "weightKg" || m === "leanBodyMassKg") && unit === "lb" ? v / 0.45359237 : v;
  const readings = records.filter(r => r[metric] != null).map(r => ({ date: r.date, value: value(r[metric]!, metric) }));
  const last = readings.at(-1);
  const selectedIndex = selectedDate && readings.some(r => r.date === selectedDate) ? readings.findIndex(r => r.date === selectedDate) : readings.length - 1;
  const selected = readings[selectedIndex];
  const values = readings.map(r => r.value);
  const lo = last ? Math.min(...values) - .5 : 0;
  const hi = last ? Math.max(...values) + .5 : 1;
  const left = 48, right = width - 8, top = 32, bottom = 184;
  const y = (v: number) => bottom - (v - lo) / (hi - lo) * (bottom - top);
  const time = (date: string) => Date.parse(`${date}T12:00:00Z`);
  const x = (date: string) => left + (time(date) - time(from)) / Math.max(86400000, time(to) - time(from)) * (right - left);
  const points = readings.map(r => ({ x: x(r.date), y: y(r.value) }));
  const change = last ? last.value - readings[0].value : 0;
  useGSAP(() => {
    const line = ref.current?.querySelector(".trend-line");
    if (reduced || !line) return;
    gsap.fromTo(line, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: .45, ease: "power2.out", clearProps: "strokeDasharray,strokeDashoffset" });
  }, { scope: ref, dependencies: [metric, from, to, reduced], revertOnUpdate: true });

  return <section className="chart-section trend-card" aria-label="Body trends">
    <div className="section-top"><div><span className="small-label">Body trends</span><h2>{last ? <>{last.value.toFixed(1)} <small>{units(metric)}</small></> : "Your first reading"}</h2></div><button className="text-link" onClick={onHealth}>Apple Health ↗</button></div>
    <div className="measurement-tabs" aria-label="Measurement to chart">{(Object.keys(names) as ChartMetric[]).map(m => <button key={m} aria-pressed={m === metric} className={m === metric ? "active" : ""} onClick={() => { setMetric(m); selectDate(null); }}>{names[m]}</button>)}</div>
    <div ref={ref} className="body-plot">
      {last ? <>
        <div className="chart-legend"><span><i className="legend-point" />{readings.length} {readings.length === 1 ? "reading" : "readings"}</span>{readings.length > 1 && <strong>{change > 0 ? "+" : ""}{change.toFixed(1)} {metric === "bodyFatPercent" ? "pp" : units(metric)} in this period</strong>}</div>
        <svg className="weight-chart" viewBox={`0 0 ${width} 224`} role="img" aria-label={`${names[metric]} from ${shortDate(from)} to ${shortDate(to)}. ${readings.length} ${readings.length === 1 ? "reading" : "readings"}. Latest ${last.value.toFixed(1)} ${units(metric)}.`} onClick={event => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const clickedX = (event.clientX - bounds.left) * width / bounds.width;
          const nearest = points.reduce((best, point, i) => Math.abs(point.x - clickedX) < Math.abs(points[best].x - clickedX) ? i : best, 0);
          selectDate(readings[nearest].date);
        }}>
          {[lo, (lo + hi) / 2, hi].map(v => <g key={v}><path d={`M${left} ${y(v)}H${right}`} stroke="var(--hair)" /><text x="0" y={y(v) + 4}>{v.toFixed(1)}</text></g>)}
          {readings.length > 1 && <path className="trend-line" pathLength="1" d={points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ")} stroke="var(--accent)" strokeWidth="2.5" fill="none" />}
          <path d={`M${points[selectedIndex].x} ${top}V${bottom}`} stroke="var(--accent)" opacity=".25" />
          {points.map((point, i) => <circle key={readings[i].date} cx={point.x} cy={point.y} r={i === selectedIndex ? 5 : 3} fill="var(--accent)" stroke="var(--bg)" strokeWidth="2"><title>{shortDate(readings[i].date)}: {readings[i].value.toFixed(1)} {units(metric)}</title></circle>)}
          <text x={left} y="216">{shortDate(from)}</text><text x={right} y="216" textAnchor="end">{shortDate(to)}</text>
        </svg>
        {readings.length > 1 && <label className="chart-scrubber"><span className="sr-only">Inspect body measurement</span><input type="range" min="0" max={readings.length - 1} value={selectedIndex} aria-valuetext={`${shortDate(selected.date)}: ${selected.value.toFixed(1)} ${units(metric)}`} onChange={event => selectDate(readings[Number(event.target.value)].date)} /></label>}
        <div className="chart-selection" aria-live="polite"><span>{shortDate(selected.date)}</span><strong>{selected.value.toFixed(1)} <small>{units(metric)}</small></strong><span>{readings.length === 1 ? "First reading" : names[metric]}</span></div>
      </> : <div className="chart-empty"><span className="empty-measure" aria-hidden="true">—</span><p>No {names[metric].toLowerCase()} readings</p><button className="text-link" onClick={() => onPrompt(`My ${names[metric].toLowerCase()} today is `)}>Add a reading ↗</button></div>}
    </div>
    <Disclosure title={`Measurements & context (${readings.length})`}>
      <p className="caption">{metric === "waistCm" ? "Measure at the same location and in similar conditions. Compare measurements across weeks; a smaller waist alone does not quantify fat loss." : metric === "weightKg" ? "Daily weight fluctuates. Dots are actual readings; lines connect them across time. Look for patterns across weeks. Weight change does not measure fat loss." : metric === "bmi" ? "BMI relates weight to height; it does not measure body fat or muscle." : metric === "leanBodyMassKg" ? "Lean mass includes water, organs and bone, as well as muscle. Scale estimates vary with hydration." : "Smart-scale body fat is an estimate and varies with hydration. Compare longer-term trends in similar conditions. pp means percentage points."}</p>
      <div className="measurements">{readings.slice().reverse().map(reading => <button className="measurement-row" key={reading.date} onClick={() => onPrompt(`Correct my measurements on ${reading.date}: `)}><span>{shortDate(reading.date)}</span><strong>{reading.value.toFixed(1)} {units(metric)} ↗</strong></button>)}</div>
    </Disclosure>
  </section>;
}
