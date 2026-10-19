import { Disclosure, useMotionPreference } from "./Motion";
import AnimatedContent from "./react-bits/AnimatedContent";
import type { CoachUpdate } from "../../shared/types";
import { NutritionEvidence, SourceLinks } from "./NutritionEvidence";
import { hasChanges } from "../lib/data";
import { itemTotals } from "../lib/totals";
import { n, shortDate, weight } from "../lib/format";
export function Proposal({
  update: u,
  onSave,
  onDismiss,
  onPrompt,
  busy,
}: {
  update: CoachUpdate;
  onSave: () => void;
  onDismiss: () => void;
  onPrompt: (v: string) => void;
  busy: boolean;
}) {
  const changes = hasChanges(u);
  const reduced = useMotionPreference();
  return (
    <AnimatedContent distance={reduced ? 0 : 8} duration={reduced ? 0 : 0.24} ease="power2.out" className="proposal-arrival">
    <section className="proposal" aria-labelledby="proposal-title">
      <div className="section-top">
        <span className="eyebrow blue">
          {u.demo
            ? "Sample response"
            : changes
              ? "Ready to review"
              : "Your coach"}
        </span>
        <button
          className="close-button"
          aria-label="Dismiss response"
          disabled={busy}
          onClick={onDismiss}
        >
          ×
        </button>
      </div>
      <h2 id="proposal-title">{u.title}</h2>
      <p className="muted">{u.summary}</p>
      {u.research && <div className={`research-receipt ${u.research.status}`}>
        <span className="research-icon" aria-hidden="true">↗</span>
        <div><strong>{u.research.status === "found" ? "Nutrition sources found" : "Using estimates"}</strong><p>{u.research.note}</p>
        {!!u.research.sources.length && <Disclosure title={<>View all {u.research.sources.length} sources</>}><SourceLinks sources={u.research.sources} /></Disclosure>}</div>
      </div>}
      {u.question && (
        <div className="question">
          <span className="small-label">One thing to clarify</span>
          <p>{u.question}</p>
        </div>
      )}
      {u.plan && (
        <div className="preview-plan">
          <span className="small-label">
            {u.plan.demo ? "Fictional example plan" : "Proposed plan"}
          </span>
          <h3>{u.plan.coaching?.intention ?? u.plan.copy.summary}</h3>
          <div className="target-line">
            <strong>{n(u.plan.targets.calories)}</strong> kcal / day
          </div>
          <div className="macro-inline">
            {u.plan.targets.proteinG}g protein · {u.plan.targets.carbsG}g carbs
            · {u.plan.targets.fatG}g fat
          </div>
          <p className="caption">
            {u.plan.profile.age} years · {u.plan.profile.heightCm} cm ·{" "}
            {weight(u.plan.profile.weightKg, u.plan.profile.unit, 1)} ·{" "}
            {u.plan.profile.activity.replaceAll("_", " ")} activity
          </p>
          {u.plan.coaching && (
            <>
              <div className="small-label">This week’s practice</div>
              <p>{u.plan.coaching.focus}</p>
              <p className="caption">{u.plan.coaching.focusReason}</p>
              <div className="tags">
                {u.plan.coaching.preferences.map((v) => (
                  <span key={v}>{v}</span>
                ))}
              </div>
              <Disclosure title="Your go-to meals">
              {u.plan.coaching.meals.map((m) => (
                <div className="preview-item" key={m.title}>
                  <strong>{m.title}</strong>
                  <p className="caption">{m.description}</p>
                </div>
              ))}
              </Disclosure>
            </>
          )}
          <p className="caption">
            Starting estimates, reviewed over time.{" "}
            {u.plan.profile.targetDate
              ? "Your requested timeline is a preference, not a prediction."
              : "No promised finish date."}
          </p>
        </div>
      )}
      {u.meals.map((m, i) => (
        <div className="preview-item" key={i}>
          <div className="section-top">
            <span className="small-label">
              {m.operation === "add"
                ? "Add meal"
                : m.operation === "remove"
                  ? "Remove meal"
                  : "Update meal"}{" "}
              · {shortDate(m.date)}
            </span>
            <strong>
              {m.operation !== "remove" &&
                `${n(itemTotals(m.items).kcal)} kcal`}
            </strong>
          </div>
          <h3>{m.label}</h3>
          {m.operation !== "remove" &&
            m.items.map((it, j) => (
              <div className="food-review" key={j}><div className="food-preview">
                <div>
                  {it.name}
                  <span className="caption">{it.detail}</span>
                </div>
                <div>
                  <b>{n(it.kcal)}</b>
                  <span className="caption">
                    P {n(it.proteinG)} · C {n(it.carbsG)} · F {n(it.fatG)} g
                  </span>
                </div>
              </div><NutritionEvidence item={it} /></div>
            ))}
        </div>
      ))}
      {u.weighIns.map((w) => (
        <div className="preview-item section-top" key={w.date}>
          <span>Weight · {shortDate(w.date)}</span>
          <strong>{w.weightKg.toFixed(1)} kg</strong>
        </div>
      ))}
      {u.bodyMetrics?.map((m) => (
        <div className="preview-item" key={m.date}>
          <span className="small-label">
            Body measurements · {shortDate(m.date)}
          </span>
          <div className="body-preview">
            {m.waistCm != null && <span>Waist <strong>{m.waistCm.toFixed(1)} cm</strong></span>}
            {m.bmi != null && (
              <span>
                BMI <strong>{m.bmi.toFixed(1)}</strong>
              </span>
            )}
            {m.bodyFatPercent != null && (
              <span>
                Body fat <strong>{m.bodyFatPercent.toFixed(1)}%</strong>
              </span>
            )}
            {m.leanBodyMassKg != null && (
              <span>
                Lean mass <strong>{m.leanBodyMassKg.toFixed(1)} kg</strong>
              </span>
            )}
          </div>
          <p className="caption">
            Reported measurements. Your targets stay unchanged.
          </p>
        </div>
      ))}
      {u.recovery?.map(r => <div className="preview-item" key={`recovery-${r.date}`}>
        <span className="small-label">Recovery · {shortDate(r.date)}</span>
        <div className="body-preview">
          {r.sleepHours != null && <span>Sleep <strong>{r.sleepHours} h</strong></span>}
          {r.hunger && <span>Hunger <strong>{r.hunger === "steady" ? "Manageable" : r.hunger}</strong></span>}
          {r.energy && <span>Energy <strong>{r.energy}</strong></span>}
          {r.steps != null && <span>Steps <strong>{n(r.steps)}</strong></span>}
        </div>
      </div>)}
      {u.events.map((e, i) => (
        <div className="preview-item" key={i}>
          <span className="small-label">Coming up · {shortDate(e.date)}</span>
          <h3>{e.title}</h3>
          <p className="caption">{e.detail}</p>
        </div>
      ))}
      {!!u.removedEventIds?.length && (
        <p>Remove {u.removedEventIds.length} upcoming event(s).</p>
      )}
      {u.reflection && (
        <div className="preview-item">
          <span className="small-label">Save your reflection</span>
          <p>{u.reflection}</p>
        </div>
      )}
      {u.focusCompleted && (
        <div className="practice-receipt">Record today's practice</div>
      )}
      {u.completedDays?.map((d) => (
        <p key={d.date}>
          {shortDate(d.date)} ·{" "}
          {d.complete ? "All food logged" : "Mark as incomplete"}
        </p>
      ))}
      {!!u.options.length && (
        <div className="coach-options">
          {u.options.map((o, i) => (
            <div key={i}>
              <div>
                <h3>{o.title}</h3>
                <p className="caption">{o.description}</p>
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={() =>
                    onPrompt(`Tell me more about: ${o.title}. ${o.description}`)
                  }
                >
                  Explore this ↗
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {changes && !u.question && (
        <>
          <div className="proposal-actions">
            <button className="btn" disabled={busy} onClick={onSave}>
              Save {u.plan ? "plan & changes" : "changes"} <span>↗</span>
            </button>
            <button className="secondary" disabled={busy} onClick={onDismiss}>
              Discard
            </button>
          </div>
          <p className="caption">
            Want to adjust something? Tell me below before saving. You can undo
            after saving.
          </p>
        </>
      )}
    </section>
    </AnimatedContent>
  );
}
