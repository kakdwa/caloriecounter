import type { Entry, Plan, WeighIn } from "../../shared/types";
import { addDays, localDate, monthDay, n, shortDate, weekStart, weight, weightNum } from "../lib/format";
import { totals } from "../lib/totals";
import { InputPill } from "../components/InputPill";
import { BackIcon, CheckIcon } from "../components/Icons";

interface Props {
  plan: Plan;
  entries: Entry[];
  weighIns: WeighIn[];
  onBack: () => void;
  onLog: (text: string) => void;
}

const W = 342;

export function Progress({ plan, entries, weighIns, onBack, onLog }: Props) {
  const today = localDate();
  const start = weekStart(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const perDay = days.map((d) => totals(entries.filter((e) => e.date === d)).kcal);
  const completed = days.map((d, i) => ({ d, k: perDay[i] })).filter((x) => x.d < today && x.k > 0);
  const avg = completed.length ? completed.reduce((s, x) => s + x.k, 0) / completed.length : null;
  const goal = plan.targets.calories;
  const diff = avg != null ? Math.round(avg - goal) : null;

  const proteinDays = days.filter((d) => d < today && entries.some((e) => e.date === d));
  const proteinHit = proteinDays.filter((d) => totals(entries.filter((e) => e.date === d)).proteinG >= plan.targets.proteinG * 0.9).length;

  const unit = plan.profile.unit;
  const ws = weighIns.slice(-10);
  const first = ws[0];
  const last = ws[ws.length - 1];
  const delta = first && last && ws.length > 1 ? last.weightKg - first.weightKg : null;

  const projection = projectDate(ws, plan);

  const headline =
    avg == null ? "Early days." : diff != null && Math.abs(diff) <= goal * 0.05 ? "On track." : diff! < 0 ? "Under goal." : "Over goal.";

  const lede =
    avg == null
      ? "Log a few days and this page starts to mean something. Weigh-ins go in the same box: “181.2 this morning”."
      : `Averaging ${n(avg)} kcal a day, ${Math.abs(diff!)} ${diff! <= 0 ? "under" : "over"} your goal. Protein landed ${proteinHit} day${proteinHit === 1 ? "" : "s"} out of ${proteinDays.length}.`;

  return (
    <div className="screen">
      <div className="header">
        <div className="stack gap-8">
          <div className="eyebrow">Week of {monthDay(start)}</div>
          <h1>{headline}</h1>
        </div>
        <button className="icon-btn" aria-label="Back" onClick={onBack}>
          <BackIcon />
        </button>
      </div>
      <p className="lede mt-16" style={{ margin: "16px 0 0" }}>{lede}</p>

      <div className="stack gap-16 mt-32">
        <div className="row between" style={{ alignItems: "baseline" }}>
          <h2>Intake</h2>
          <div className="eyebrow">{avg != null ? `${n(avg)} avg` : "no full days yet"}</div>
        </div>
        <Bars values={perDay} days={days} today={today} goal={goal} />
      </div>

      <div className="stack gap-16 mt-32">
        <div className="row between" style={{ alignItems: "baseline" }}>
          <h2>Weight</h2>
          <div className="eyebrow">
            {delta != null ? `${delta > 0 ? "+" : "−"}${weight(Math.abs(delta), unit, 1)} since ${shortDate(first.date)}` : ws.length ? weight(ws[0].weightKg, unit, 1) : "no weigh-ins yet"}
          </div>
        </div>
        {ws.length >= 2 ? (
          <Line points={ws} unit={unit} />
        ) : (
          <p className="caption" style={{ margin: 0 }}>Two weigh-ins draw a line. Say “weighed {n(weightNum(plan.profile.weightKg, unit))} this morning” below.</p>
        )}
      </div>

      {projection && (
        <div className="note mt-24" style={{ padding: "16px 0", borderTop: "1px solid var(--hair)" }}>
          <CheckIcon />
          <span>{projection}</span>
        </div>
      )}

      <div className="bottom">
        <div className="bottom-inner">
          <InputPill placeholder="Log a weigh-in or a meal" onSubmit={onLog} />
        </div>
      </div>
    </div>
  );
}

function projectDate(ws: WeighIn[], plan: Plan): string | null {
  const { profile: p, targets: t } = plan;
  if (p.goalWeightKg == null || p.goal === "maintain") return null;
  const goalTxt = weight(p.goalWeightKg, p.unit);
  if (ws.length >= 3) {
    // Simple least-squares slope in kg/day over the logged weigh-ins.
    const t0 = new Date(ws[0].date).getTime();
    const xs = ws.map((w) => (new Date(w.date).getTime() - t0) / 864e5);
    const ys = ws.map((w) => w.weightKg);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / Math.max(1e-9, xs.reduce((s, x) => s + (x - mx) ** 2, 0));
    const remaining = p.goalWeightKg - ws[ws.length - 1].weightKg;
    if (Math.sign(slope) !== Math.sign(remaining) || Math.abs(slope) < 1e-4) return `At the current trend you are not moving toward ${goalTxt} yet. Give it another week before changing anything.`;
    const daysLeft = remaining / slope;
    if (daysLeft > 365 * 3) return null;
    return `At this pace you reach ${goalTxt} around ${monthDay(addDays(ws[ws.length - 1].date, Math.round(daysLeft)))}.`;
  }
  if (t.projectedDate) return `Sticking to the plan puts you at ${goalTxt} around ${monthDay(t.projectedDate)}.`;
  return null;
}

function Bars({ values, days, today, goal }: { values: number[]; days: string[]; today: string; goal: number }) {
  const H = 120, TOP = 8, bw = 42, gap = 8;
  const max = Math.max(goal * 1.12, ...values) || 1;
  const goalY = TOP + H - (goal / max) * H;
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <svg className="chart" width="100%" viewBox={`0 0 ${W} ${TOP + H + 24}`} role="img" aria-label="Calories per day this week">
      {values.map((v, i) => {
        const x = i * (bw + gap);
        if (v <= 0) return <rect key={i} x={x} y={TOP + H - 4} width={bw} height={4} rx={2} fill="var(--tint-2)" />;
        const h = Math.max(4, (v / max) * H);
        const y = TOP + H - h;
        const r = 4;
        const d = `M${x} ${TOP + H} V${y + r} a${r} ${r} 0 0 1 ${r} -${r} h${bw - 2 * r} a${r} ${r} 0 0 1 ${r} ${r} V${TOP + H} Z`;
        return <path key={i} d={d} fill={days[i] === today ? "var(--accent)" : "var(--tint-2)"} />;
      })}
      <line x1={0} y1={goalY} x2={W} y2={goalY} stroke="var(--ink-3)" strokeWidth={1} strokeDasharray="3 4" />
      <text x={W} y={goalY - 6} textAnchor="end" fontSize={11} fill="var(--ink-3)">goal {n(goal)}</text>
      {labels.map((l, i) => (
        <text key={i} x={i * (bw + gap) + bw / 2} y={TOP + H + 20} textAnchor="middle" fontSize={12} fill={days[i] === today ? "var(--ink)" : "var(--ink-3)"}>{l}</text>
      ))}
    </svg>
  );
}

function Line({ points, unit }: { points: WeighIn[]; unit: "lb" | "kg" }) {
  const H = 88, TOP = 12;
  const vals = points.map((p) => weightNum(p.weightKg, unit));
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const span = Math.max(hi - lo, unit === "kg" ? 1 : 2);
  const xs = points.map((_, i) => 16 + (i * (W - 32)) / Math.max(1, points.length - 1));
  const ys = vals.map((v) => TOP + ((hi + span * 0.1 - v) / (span * 1.2)) * H);
  const path = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const li = points.length - 1;
  return (
    <svg className="chart" width="100%" viewBox={`0 0 ${W} ${TOP + H + 24}`} role="img" aria-label="Weight over time">
      <polyline points={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[li]} cy={ys[li]} r={4} fill="var(--accent)" stroke="#fff" strokeWidth={2} />
      <text x={xs[0]} y={ys[0] - 10} textAnchor="start" fontSize={12} fill="var(--ink-2)">{vals[0].toFixed(1)}</text>
      <text x={xs[li]} y={ys[li] - 12} textAnchor="end" fontSize={12} fontWeight={500} fill="var(--ink)">{vals[li].toFixed(1)}</text>
      <text x={xs[0]} y={TOP + H + 20} textAnchor="start" fontSize={12} fill="var(--ink-3)">{shortDate(points[0].date)}</text>
      <text x={xs[li]} y={TOP + H + 20} textAnchor="end" fontSize={12} fill="var(--ink-3)">{shortDate(points[li].date)}</text>
    </svg>
  );
}
