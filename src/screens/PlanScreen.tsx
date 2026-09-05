import { useState } from "react";
import type { Plan } from "../../shared/types";
import { ApiError, buildPlan } from "../lib/api";
import { monthDay, n, weight } from "../lib/format";
import { InputPill } from "../components/InputPill";
import { ArrowIcon, BackIcon } from "../components/Icons";

interface Props {
  plan: Plan;
  isNew: boolean;
  onStart: () => void;
  onUpdate: (plan: Plan) => void;
  onBack: () => void;
  onSettings: () => void;
}

export function PlanScreen({ plan, isNew, onStart, onUpdate, onBack, onSettings }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const { profile: p, targets: t, copy } = plan;

  async function adjust(text: string) {
    setBusy(true);
    setError(null);
    setQuestion(null);
    try {
      const res = await buildPlan(text, plan);
      if (res.status === "need_more") setQuestion(res.question);
      else onUpdate(res.plan);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const rate = Math.abs(t.weeklyRateKg);
  const goalDate = p.targetDate ?? t.projectedDate;

  return (
    <div className="screen" style={{ paddingBottom: 240 }}>
      <div className="header">
        <div className="stack gap-8">
          {!isNew && <div className="eyebrow">Your plan</div>}
          <h1>{isNew ? "Your plan." : busy ? "Rethinking…" : "Still yours."}</h1>
        </div>
        {!isNew && (
          <button className="icon-btn" aria-label="Back" onClick={onBack}>
            <BackIcon />
          </button>
        )}
      </div>
      <p className="lede mt-16" style={{ margin: "16px 0 0", opacity: busy ? 0.5 : 1 }}>
        {copy.summary}
      </p>

      <div className="stack gap-8 mt-40" style={{ opacity: busy ? 0.5 : 1 }}>
        <div className="hero">
          <span className="hero-num">{n(t.calories)}</span>
          <span className="hero-unit">kcal a day</span>
        </div>
        <div className="caption">{copy.burnNote}</div>
      </div>

      <div className="grid-3 mt-40" style={{ opacity: busy ? 0.5 : 1 }}>
        <Macro name="Protein" grams={t.proteinG} why={copy.proteinNote} />
        <Macro name="Carbs" grams={t.carbsG} why={copy.carbsNote} />
        <Macro name="Fat" grams={t.fatG} why={copy.fatNote} />
      </div>

      {p.goal !== "maintain" && p.goalWeightKg != null && (
        <div className="divider-row mt-40">
          <div style={{ flexGrow: 1 }}>
            <div className="eyebrow">Today</div>
            <div style={{ fontSize: 16, lineHeight: "24px", fontWeight: 500 }}>{weight(p.weightKg, p.unit)}</div>
          </div>
          <ArrowIcon />
          <div style={{ flexGrow: 1, textAlign: "right" }}>
            <div className="eyebrow">{goalDate ? monthDay(goalDate) : `${weight(rate, p.unit, 1)} a week`}</div>
            <div style={{ fontSize: 16, lineHeight: "24px", fontWeight: 500 }}>{weight(p.goalWeightKg, p.unit)}</div>
          </div>
        </div>
      )}

      {question && <p className="quote mt-24" style={{ margin: "24px 0 0" }}>{question}</p>}
      {error && <p className="caption error mt-16">{error}</p>}

      <div className="row between mt-24">
        <button className="link" onClick={onSettings}>AI settings</button>
        <span className="caption">
          {p.activity.replace("_", " ")} · {p.age} · {Math.round(p.heightCm)} cm
        </span>
      </div>

      <div className="bottom">
        <div className="bottom-inner">
          <InputPill placeholder="Change anything, like “more carbs on lifting days”" onSubmit={adjust} disabled={busy} />
          <button className="btn" onClick={onStart} disabled={busy}>
            {isNew ? "Start tracking" : "Back to today"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Macro({ name, grams, why }: { name: string; grams: number; why: string }) {
  return (
    <div className="plan-macro">
      <div className="eyebrow">{name}</div>
      <div className="g">
        {grams}
        <span> g</span>
      </div>
      <div className="why">{why}</div>
    </div>
  );
}
