import type { Entry, Plan } from "../../shared/types";
import { greeting, localDate, longDate, n, timeOf } from "../lib/format";
import { InputPill } from "../components/InputPill";
import { MacroTile, Meter } from "../components/Meter";
import { ChartIcon, TargetIcon } from "../components/Icons";
import { totals } from "../lib/totals";

interface Props {
  plan: Plan;
  entries: Entry[];
  demo: boolean;
  onLog: (text: string) => void;
  onProgress: () => void;
  onPlan: () => void;
  onSettings: () => void;
  onRemove: (id: string) => void;
}

export function Today({ plan, entries, demo, onLog, onProgress, onPlan, onSettings, onRemove }: Props) {
  const t = plan.targets;
  const sum = totals(entries);
  const left = t.calories - sum.kcal;

  return (
    <div className="screen">
      <div className="header">
        <div className="stack gap-8">
          <div className="eyebrow">
            {longDate(localDate())}
            {demo && (
              <button className="tag" style={{ marginLeft: 8 }} onClick={onSettings}>
                Demo · add a key
              </button>
            )}
          </div>
          <h1>{greeting()}</h1>
        </div>
        <div className="row gap-8">
          <button className="icon-btn" aria-label="Your plan" onClick={onPlan}>
            <TargetIcon />
          </button>
          <button className="icon-btn" aria-label="Progress" onClick={onProgress}>
            <ChartIcon />
          </button>
        </div>
      </div>

      <div className="stack gap-16 mt-40">
        <div className="hero">
          <span className="hero-num">{n(Math.abs(left))}</span>
          <span className="hero-unit">{left >= 0 ? "kcal left" : "kcal over"}</span>
        </div>
        <Meter value={sum.kcal} max={t.calories} big />
        <div className="row between caption">
          <span>{n(sum.kcal)} eaten</span>
          <span>{n(t.calories)} goal</span>
        </div>
      </div>

      <div className="grid-3 mt-32">
        <MacroTile name="Protein" value={sum.proteinG} goal={t.proteinG} />
        <MacroTile name="Carbs" value={sum.carbsG} goal={t.carbsG} />
        <MacroTile name="Fat" value={sum.fatG} goal={t.fatG} />
      </div>

      <h2 className="mt-40">Today</h2>
      <div className="stack mt-8">
        {entries.length === 0 && (
          <p className="lede" style={{ margin: "8px 0 0" }}>
            Nothing yet. Tell me what you eat as you go, in your own words.
          </p>
        )}
        {entries.map((e) => (
          <div className="entry" key={e.id}>
            <div className="stack gap-4" style={{ flexGrow: 1 }}>
              <div className="entry-text">{e.items.map((i) => i.name).join(", ")}</div>
              <div className="row gap-8 caption">
                <span>{timeOf(e.time)}</span>
                <button className="link" style={{ color: "var(--ink-3)" }} onClick={() => onRemove(e.id)}>
                  Remove
                </button>
              </div>
            </div>
            <div className="kcal">
              <b>{n(e.items.reduce((s, i) => s + i.kcal, 0))}</b>
              <span>kcal</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bottom">
        <div className="bottom-inner">
          <InputPill placeholder="What did you eat?" onSubmit={onLog} />
        </div>
      </div>
    </div>
  );
}
