import type { LogResponse, Plan } from "../../shared/types";
import { n, weight } from "../lib/format";
import { itemTotals } from "../lib/totals";
import { InputPill } from "../components/InputPill";
import { BackIcon, CheckIcon } from "../components/Icons";

export interface LogState {
  text: string;
  status: "loading" | "ready" | "error";
  result?: LogResponse;
  error?: string;
}

interface Props {
  plan: Plan;
  state: LogState;
  remainingKcal: number;
  remainingProteinG: number;
  onCorrect: (text: string) => void;
  onAdd: () => void;
  onBack: () => void;
}

export function LogScreen({ plan, state, remainingKcal, remainingProteinG, onCorrect, onAdd, onBack }: Props) {
  const r = state.result;
  const loading = state.status === "loading";
  const meal = r?.kind === "meal" ? r : null;
  const sum = meal ? itemTotals(meal.items) : null;

  return (
    <div className="screen" style={{ paddingBottom: 240 }}>
      <div className="header">
        <div className="stack gap-8">
          <div className="eyebrow">Logging</div>
          <h1>{loading ? "One moment." : r?.kind === "weight" ? "Noted." : r?.kind === "unclear" ? "Say that again?" : "Here's what I heard."}</h1>
        </div>
        <button className="icon-btn" aria-label="Back" onClick={onBack}>
          <BackIcon />
        </button>
      </div>

      <p className="quote mt-32" style={{ margin: "32px 0 0" }}>“{state.text}”</p>

      {loading && (
        <div className="card mt-32" style={{ padding: "24px" }}>
          <div className="stack gap-16">
            <div className="shimmer" style={{ width: "60%" }} />
            <div className="shimmer" style={{ width: "40%" }} />
            <div className="shimmer" style={{ width: "70%", marginTop: 8 }} />
          </div>
        </div>
      )}

      {state.status === "error" && <p className="caption error mt-24">{state.error}</p>}

      {meal && sum && (
        <>
          <div className="card mt-32" style={{ padding: "8px 24px" }}>
            {meal.items.map((it, i) => (
              <div className="item" key={i}>
                <div className="row gap-16" style={{ alignItems: "baseline" }}>
                  <div className="item-name">{it.name}</div>
                  <div className="kcal"><b>{n(it.kcal)}</b><span>kcal</span></div>
                </div>
                <div className="row between gap-16" style={{ alignItems: "baseline" }}>
                  <div className="caption" style={{ flexGrow: 1 }}>{it.detail}</div>
                  <div className="chips">
                    <span>P <b>{Math.round(it.proteinG)}g</b></span>
                    <span>C <b>{Math.round(it.carbsG)}g</b></span>
                    <span>F <b>{Math.round(it.fatG)}g</b></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="row between mt-24" style={{ padding: "0 24px", alignItems: "baseline" }}>
            <div className="eyebrow">Adds up to</div>
            <div className="kcal"><b style={{ fontSize: 24, letterSpacing: "-0.02em" }}>{n(sum.kcal)}</b><span>kcal</span></div>
          </div>
          <div className="note mt-16" style={{ padding: "0 24px" }}>
            <CheckIcon />
            <span>
              {meal.note || `Leaves ${n(remainingKcal - sum.kcal)} kcal and ${n(remainingProteinG - sum.proteinG)} g protein for the rest of today.`}
            </span>
          </div>
        </>
      )}

      {r?.kind === "weight" && (
        <div className="stack gap-8 mt-32">
          <div className="hero">
            <span className="hero-num">{weight(r.weightKg, plan.profile.unit, 1).split(" ")[0]}</span>
            <span className="hero-unit">{plan.profile.unit}</span>
          </div>
          <div className="note"><CheckIcon /><span>{r.note}</span></div>
        </div>
      )}

      {r?.kind === "unclear" && <p className="lede mt-24">{r.note}</p>}

      <div className="bottom">
        <div className="bottom-inner">
          <InputPill
            placeholder={meal ? "Not quite? Say “half the salad” or “it had avocado”" : "Try again, in your own words"}
            onSubmit={onCorrect}
            disabled={loading}
          />
          {(meal || r?.kind === "weight") && (
            <button className="btn" onClick={onAdd} disabled={loading}>
              {meal ? "Add to today" : "Save weigh-in"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
