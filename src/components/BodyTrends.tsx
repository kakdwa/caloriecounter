import { useState } from "react";
import type { BodyMetrics, WeighIn, Unit } from "../../shared/types";
import type { HealthMetric } from "../lib/health";
import { shortDate } from "../lib/format";
const names: Record<HealthMetric, string> = {
  weightKg: "Weight",
  bodyFatPercent: "Body fat",
  leanBodyMassKg: "Lean body mass",
  bmi: "BMI",
};
export function BodyTrends({
  weights,
  measurements,
  unit,
  onPrompt,
  onHealth,
}: {
  weights: WeighIn[];
  measurements: BodyMetrics[];
  unit: Unit;
  onPrompt: (v: string) => void;
  onHealth: () => void;
}) {
  const [metric, setMetric] = useState<HealthMetric>("weightKg");
  const rows = new Map<
    string,
    Partial<Record<HealthMetric, number>> & { date: string }
  >();
  for (const w of weights) rows.set(w.date, w);
  for (const m of measurements) rows.set(m.date, { ...rows.get(m.date), ...m });
  const records = [...rows.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const units = (m: HealthMetric) =>
    m === "bodyFatPercent" ? "%" : m === "bmi" ? "" : unit;
  const value = (v: number, m: HealthMetric) =>
    (m === "weightKg" || m === "leanBodyMassKg") && unit === "lb"
      ? v / 0.45359237
      : v;
  const readings = records
    .filter((r) => r[metric] != null)
    .map((r) => ({ date: r.date, value: value(r[metric]!, metric) }));
  const vals = readings.map((r) => r.value),
    last = readings.at(-1),
    lo = Math.min(...vals) - 0.5,
    hi = Math.max(...vals) + 0.5;
  const firstDate = readings.length ? new Date(readings[0].date).getTime() : 0,
    lastDate = last ? new Date(last.date).getTime() : 0;
  const points = readings.map((r) => ({
    x:
      readings.length === 1
        ? 300
        : 40 +
          ((new Date(r.date).getTime() - firstDate) /
            Math.max(86400000, lastDate - firstDate)) *
            520,
    y: 160 - ((r.value - lo) / (hi - lo)) * 128,
  }));
  return (
    <section className="card trend-card">
      <div className="section-top">
        <div>
          <span className="small-label">YOUR BODY, OVER TIME</span>
          <h2>
            {last
              ? `${last.value.toFixed(1)} ${units(metric)}`
              : "A little perspective"}
          </h2>
          <span className="caption">
            {last
              ? `${names[metric]} · ${shortDate(last.date)}`
              : "Import your scale readings or tell me below."}
          </span>
        </div>
        <button className="text-link" onClick={onHealth}>
          Apple Health ↗
        </button>
      </div>
      <div className="measurement-tabs" aria-label="Measurement to chart">
        {(Object.keys(names) as HealthMetric[]).map((m) => (
          <button
            key={m}
            aria-pressed={m === metric}
            className={m === metric ? "active" : ""}
            onClick={() => setMetric(m)}
          >
            {names[m]}
          </button>
        ))}
      </div>
      {readings.length ? (
        <svg
          className="weight-chart"
          viewBox="0 0 600 200"
          role="img"
          aria-label={`${names[metric]} from ${shortDate(readings[0].date)} to ${shortDate(last!.date)}. Latest ${last!.value.toFixed(1)} ${units(metric)}.`}
        >
          <path
            d="M40 32H560 M40 96H560 M40 160H560"
            stroke="var(--hair)"
            fill="none"
          />
          <text x="8" y="36">
            {hi.toFixed(1)}
          </text>
          <text x="8" y="164">
            {lo.toFixed(1)}
          </text>
          <path
            d={points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ")}
            stroke="var(--accent)"
            strokeWidth="2"
            fill="none"
          />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--accent)">
              <title>
                {shortDate(readings[i].date)}: {readings[i].value.toFixed(1)}{" "}
                {units(metric)}
              </title>
            </circle>
          ))}
          <text x="40" y="192">
            {shortDate(readings[0].date)}
          </text>
          {readings.length > 1 && (
            <text x="560" y="192" textAnchor="end">
              {shortDate(last!.date)}
            </text>
          )}
        </svg>
      ) : (
        <div className="empty-note">
          <p>
            No {names[metric].toLowerCase()} readings in this period.
            <small>Missing data stays empty, never zero.</small>
          </p>
        </div>
      )}
      <p className="caption">
        {metric === "weightKg"
          ? "Daily weight fluctuates. Look for patterns across weeks."
          : metric === "bmi"
            ? "BMI relates weight to height; it does not measure body fat or muscle."
            : metric === "leanBodyMassKg"
              ? "Lean body mass includes water, organs and bone, as well as muscle. Scale estimates vary with hydration."
              : "Smart-scale body fat is an estimate and varies with hydration. Compare longer-term trends in similar conditions."}
      </p>
      <div className="body-metric-grid">
        {(["bodyFatPercent", "leanBodyMassKg", "bmi"] as HealthMetric[]).map(
          (m) => {
            const r = records.filter((r) => r[m] != null).at(-1);
            return (
              <button key={m} onClick={() => setMetric(m)}>
                <span className="small-label">{names[m]}</span>
                <strong>
                  {r
                    ? `${value(r[m]!, m).toFixed(1)}${units(m) ? " " + units(m) : ""}`
                    : "—"}
                </strong>
                <span className="caption">
                  {r ? shortDate(r.date) : "No reading"}
                </span>
              </button>
            );
          },
        )}
      </div>
      <details>
        <summary>
          View measurements ({records.length}{" "}
          {records.length === 1 ? "day" : "days"})
        </summary>
        <div className="measurements">
          {records
            .slice()
            .reverse()
            .map((r) => (
              <button
                className="measurement-row"
                key={r.date}
                onClick={() =>
                  onPrompt(`Correct my measurements on ${r.date}: `)
                }
              >
                <span>{shortDate(r.date)}</span>
                <span>
                  {(Object.keys(names) as HealthMetric[])
                    .filter((m) => r[m] != null)
                    .map(
                      (m) =>
                        `${names[m]} ${value(r[m]!, m).toFixed(1)} ${units(m)}`,
                    )
                    .join(" · ")}{" "}
                  ↗
                </span>
              </button>
            ))}
        </div>
      </details>
    </section>
  );
}
