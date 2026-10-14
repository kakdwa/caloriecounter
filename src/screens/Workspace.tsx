import { ProgressSummary } from "../components/ProgressSummary";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { NutritionEvidence } from "../components/NutritionEvidence";
import { BodyTrends } from "../components/BodyTrends";
import { useState } from "react";
import type { State } from "../lib/store";
import { addDays, n, shortDate, weight, weekStart } from "../lib/format";
import { totals, itemTotals } from "../lib/totals";
import type { Entry, WeighIn } from "../../shared/types";
export type View = "today" | "plan" | "progress";
export function Welcome({
  prompt,
  connect,
  demo,
}: {
  prompt: (v: string) => void;
  connect: () => void;
  demo: boolean;
}) {
  return (
    <div className="welcome">
      <div className="welcome-visual" aria-hidden="true">
        <div className="welcome-message"><span>↗</span> A plan that works with my life.</div>
        <div className="welcome-output"><div><span>YOUR EVERYDAY PLAN</span><strong>Less effort.<br />More clarity.</strong></div><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="30"/><circle cx="40" cy="40" r="30"/></svg><div className="mini-macros"><i/><i/><i/></div></div>
      </div>
      <span className="eyebrow blue">YOUR PERSONAL NUTRITION COACH</span>
      <h1>
        Make room for
        <br />
        <em>feeling better.</em>
      </h1>
      <p className="lede">
        A plan built around you. Food tracking that keeps up.
        <br />
        Just tell us what’s on your mind.
      </p>
      <div className="welcome-steps">
        <div>
          <span>01</span>
          <p>
            Tell us what matters to you.
            <small>Goals, routines, foods you love.</small>
          </p>
        </div>
        <div>
          <span>02</span>
          <p>
            Make a plan that fits.
            <small>Personal targets and practical meals.</small>
          </p>
        </div>
        <div>
          <span>03</span>
          <p>
            Learn as you go.<small>A meal, a photo, a moment to reflect.</small>
          </p>
        </div>
      </div>
      <button
        className="btn"
        onClick={
          demo ? connect : () => prompt("I'd like to build my diet plan. ")
        }
      >
        {demo ? "Connect DeepSeek" : "Let's make my plan"}
        <span>↗</span>
      </button>
      {demo && (
        <button
          className="text-link sample-button"
          onClick={() => prompt("Explore the sample plan")}
        >
          Explore a sample first
        </button>
      )}
      <p className="caption centered">
        Your data stays in this browser. AI receives the context needed to help.
      </p>
    </div>
  );
}
function Macro({
  name,
  value,
  target,
}: {
  name: string;
  value: number;
  target: number;
}) {
  return (
    <div className="macro">
      <span className="small-label">{name}</span>
      <div>
        <strong><AnimatedNumber value={value} /></strong>
        <span> / {n(target)} g</span>
      </div>
      <div className="meter">
        <div
          style={{
            width: `${Math.min(100, target ? (value / target) * 100 : 0)}%`,
          }}
        />
      </div>
    </div>
  );
}
function Meals({
  entries,
  select,
  savedIds,
}: {
  savedIds: string[];
  entries: Entry[];
  select: (e: Entry) => void;
}) {
  return (
    <div className="meals">
      {entries.length ? (
        entries.map((e) => (
          <div className={`meal-card ${savedIds.includes(e.id) ? "just-saved" : ""}`} key={e.id}><button className="meal-row" onClick={() => select(e)}>
            <span className="meal-symbol">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 3v6a3 3 0 0 0 6 0V3M7 3v18M18 3c-3 4-3 8 1 9V3m0 9v9"/></svg>
            </span>
            <span className="meal-copy">
              <strong>{e.text}</strong>
              <small>
                {e.demo ? "Sample · " : ""}
                {e.items.map((x) => x.name).join(" · ")}
              </small>
            </span>
            <span className="meal-energy">
              {n(itemTotals(e.items).kcal)}
              <small>kcal ↗</small>
            </span>
          </button>
          <div className="meal-detail-line"><span>{n(itemTotals(e.items).proteinG)}g protein</span><span>{n(itemTotals(e.items).carbsG)}g carbs</span><span>{n(itemTotals(e.items).fatG)}g fat</span></div>
          <details className="meal-details"><summary>Nutrition details <span>＋</span></summary>{e.items.map((item, j) => <div key={j} className="saved-food"><strong>{item.name}</strong><p className="caption">{item.detail} · {n(item.kcal)} kcal</p><NutritionEvidence item={item}/></div>)}</details>
          </div>
        ))
      ) : (
        <div className="empty-note">
          <span>◌</span>
          <p>
            No meals yet.<small>Type it, say it, or take a photo below.</small>
          </p>
        </div>
      )}
    </div>
  );
}
export function TodayView({
  state: s,
  today,
  date,
  setDate,
  prompt,
  select,
  savedIds,
  revision,
}: {
  savedIds: string[];
  revision: number;
  state: State;
  today: string;
  date: string;
  setDate: (v: string) => void;
  prompt: (v: string) => void;
  select: (e: Entry) => void;
}) {
  const p = s.plan!,
    entries = s.entries.filter((e) => e.date === date),
    sum = totals(entries),
    remain = p.targets.calories - sum.kcal;
  const practices = s.memory.practices.filter(
      (x) =>
        x.date >= weekStart(today) &&
        x.date <= today &&
        x.focus === p.coaching?.focus,
    ),
    days = new Set(practices.map((v) => v.date));
  const done = s.completedDays.includes(date);
  const last = s.entries
    .filter((e) => e.date < today)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">
          {new Date(date + "T12:00:00").toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </span>
        <h1>
          {date === today ? (
            <>
              Today, <em>at a glance.</em>
            </>
          ) : (
            <>
              Your <em>daily picture.</em>
            </>
          )}
        </h1>
        <p className="lede">
          {last && last.date < addDays(today, -2) && !entries.length
            ? "Welcome back. Your next meal is enough to begin again."
            : "Your food, your targets, your next step."}
        </p>
      </div>
      <div className="today-grid">
        <section className="card intake-card">
          <div className="section-top">
            <span className="small-label">
              {date === today ? "DAILY INTAKE" : "DAILY INTAKE"}
            </span>
            <div className="date-nav">
              <button
                aria-label="Previous day"
                onClick={() => setDate(addDays(date, -1))}
              >
                ‹
              </button>
              <button onClick={() => setDate(today)}>
                {date === today ? "Today" : shortDate(date)}
              </button>
              <button
                aria-label="Next day"
                disabled={date >= today}
                onClick={() => setDate(addDays(date, 1))}
              >
                ›
              </button>
            </div>
          </div>
          <div className="energy-overview">
            <div className="energy-number"><span className="small-label">CALORIES LOGGED</span><strong><AnimatedNumber value={sum.kcal} /></strong><span>of {n(p.targets.calories)} kcal</span></div>
          <div className="calorie-ring">
            <svg viewBox="0 0 240 240" aria-hidden="true">
              <circle className="ring-track" cx="120" cy="120" r="104" />
              <circle
                className="ring-value"
                cx="120"
                cy="120"
                r="104"
                strokeDasharray="653.45"
                strokeDashoffset={
                  653.45 * (1 - Math.min(1, sum.kcal / p.targets.calories))
                }
              />
            </svg>
            <div className="ring-copy">
              <strong><AnimatedNumber value={sum.kcal / p.targets.calories * 100} /><small>%</small></strong>
              <span>of target</span>
            </div>
          </div>
          </div>
          <div className="intake-caption" key={revision}>
            {sum.kcal === 0
              ? "Ready when you are. Start with your next meal."
              : remain >= 0
                ? `${n(remain)} kcal remaining to your starting target`
                : `${n(-remain)} kcal above your starting target`}
          </div>
          <div className="macro-grid">
            <Macro
              name="Protein"
              value={sum.proteinG}
              target={p.targets.proteinG}
            />
            <Macro name="Carbs" value={sum.carbsG} target={p.targets.carbsG} />
            <Macro name="Fat" value={sum.fatG} target={p.targets.fatG} />
          </div>
          <div className="card-foot">
            <span className={`status-dot ${done ? "complete" : ""}`} />
            {done
              ? "You've marked this day complete"
              : "Partial picture · only logged food is shown"}
          </div>
        </section>
        <div className="today-aside">
          <section className="focus-card">
            <div className="section-top">
              <span className="small-label">THIS WEEK’S FOCUS</span>
              <span className="sparkle" aria-hidden="true">↗</span>
            </div>
            <h2>{p.coaching?.focus ?? "Make the next meal easier"}</h2>
            <p>
              {p.coaching?.focusReason ??
                "Choose one small action that makes your day feel easier. Tell me what you'd like to try."}
            </p>
            <div
              className="practice-dots"
              aria-label={`${days.size} practice days this week`}
            >
              {Array.from({ length: 7 }, (_, i) => {
                const d = addDays(weekStart(today), i);
                return (
                  <span
                    key={d}
                    className={
                      days.has(d) ? "done" : d === today ? "current" : ""
                    }
                    title={shortDate(d)}
                  >
                    {days.has(d)
                      ? "✓"
                      : new Date(d + "T12:00:00").toLocaleDateString(
                          undefined,
                          { weekday: "narrow" },
                        )}
                  </span>
                );
              })}
            </div>
            <span className="caption">
              {days.size
                ? `${days.size} practice day${days.size === 1 ? "" : "s"} this week. Each one counts.`
                : "A practice, not a streak. Start whenever you're ready."}
            </span>
            <button
              className="text-link"
              onClick={() => prompt("I practiced my focus today.")}
            >
              I tried it today <span>↗</span>
            </button>
          </section>
          <button
            className="support-card"
            onClick={() => prompt("Help me decide what to eat tonight. ")}
          >
            <span className="support-icon">↗</span>
            <div>
              <h3>Make tonight easier</h3>
              <p className="caption">
                A satisfying meal for the day you're having.
              </p>
            </div>
          </button>
        </div>
      </div>
      <ProgressSummary state={s} today={today} prompt={prompt} compact />
      <section className="section-block">
        <div className="section-top">
          <h2>Your meals</h2>
          <span className="caption">
            {entries.length} {entries.length === 1 ? "entry" : "entries"} · tap
            to adjust
          </span>
        </div>
        <Meals entries={entries} select={select} savedIds={savedIds} />
        {entries.length > 0 && (
          <button
            className="text-link"
            onClick={() =>
              prompt(
                done
                  ? `Mark ${date} as incomplete.`
                  : `I've finished logging all my food for ${date}.`,
              )
            }
          >
            {done ? "Reopen this day" : "That's everything for this day"} ↗
          </button>
        )}
      </section>
      {!!s.memory.events.filter((e) => e.date >= today).length && (
        <section className="section-block">
          <h2>Coming up</h2>
          {s.memory.events
            .filter((e) => e.date >= today)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((e) => (
              <button
                className="event-row"
                key={e.id}
                onClick={() =>
                  prompt(`Let's adjust my ${e.title} on ${e.date}: `)
                }
              >
                <span className="small-label">{shortDate(e.date)}</span>
                <div>
                  <h3>{e.title}</h3>
                  <p className="caption">{e.detail}</p>
                </div>
                <span>↗</span>
              </button>
            ))}
        </section>
      )}
    </>
  );
}
export function PlanView({
  state: s,
  prompt,
}: {
  state: State;
  prompt: (v: string) => void;
}) {
  const p = s.plan!,
    c = p.coaching;
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">BUILT AROUND YOU</span>
        <h1>
          Your plan. <em>Your pace.</em>
        </h1>
        <p className="lede">{c?.intention ?? p.copy.summary}</p>
      </div>
      <div className="plan-grid">
        <section className="card plan-targets">
          <span className="small-label">{p.profile.goal === "lose" ? "YOUR FAT-LOSS PLAN" : "YOUR DAILY STARTING POINT"}</span>
          <div className="plan-calories">
            <strong>{n(p.targets.calories)}</strong>
            <span>kcal / day</span>
          </div>
          <div className="macro-grid">
            {[
              ["Protein", p.targets.proteinG],
              ["Carbs", p.targets.carbsG],
              ["Fat", p.targets.fatG],
            ].map(([label, val]) => (
              <div key={label}>
                <span className="small-label">{label}</span>
                <div className="target-macro">
                  {val}
                  <small> g</small>
                </div>
              </div>
            ))}
          </div>
          <div className="plan-explainer"><span className="small-label">HOW YOUR PLAN WORKS</span><p>{p.profile.goal === "lose" ? `Start around ${n(p.targets.calories)} kcal per day, with ${p.targets.proteinG}g protein. This is about ${n(Math.max(0, p.targets.tdee - p.targets.calories))} kcal below your estimated daily needs.` : `Start around ${n(p.targets.calories)} kcal per day, based on your profile and activity.`}</p><p className="caption">{p.targets.weeklyRateKg ? `Starting weight-change estimate: ${weight(Math.abs(p.targets.weeklyRateKg), p.profile.unit, 2)} per week ${p.targets.weeklyRateKg < 0 ? "down" : "up"}. ` : "Aim for a broadly stable weight. "}Review your trend, hunger and energy together. Weight change is not the same as fat loss; targets stay unchanged until you approve a revision.</p></div>
          <p className="caption mt-24">
            Estimates based on your profile and activity. A useful starting
            point, not a daily pass or fail.
          </p>
          <button
            className="text-link"
            onClick={() =>
              prompt("I'd like to review my calorie and macro targets. ")
            }
          >
            Review my targets ↗
          </button>
        </section>
        <section className="profile-card">
          <span className="small-label">THE DIRECTION</span>
          <h2>
            {p.profile.goal === "lose"
              ? "Lose weight, keep living."
              : p.profile.goal === "gain"
                ? "Build strength, steadily."
                : "Find your steady place."}
          </h2>
          <dl>
            <div>
              <dt>Starting weight</dt>
              <dd>{weight(p.profile.weightKg, p.profile.unit, 1)}</dd>
            </div>
            <div>
              <dt>Goal</dt>
              <dd>
                {p.profile.goalWeightKg
                  ? weight(p.profile.goalWeightKg, p.profile.unit, 1)
                  : "Maintain & feel well"}
              </dd>
            </div>
            <div>
              <dt>Activity</dt>
              <dd>{p.profile.activity.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Age / height</dt>
              <dd>
                {p.profile.age} / {p.profile.heightCm} cm
              </dd>
            </div>
          </dl>
          <button
            className="text-link"
            onClick={() => prompt("My goal or routine has changed: ")}
          >
            Update my direction ↗
          </button>
        </section>
      </div>
      <section className="section-block">
        <div className="section-top">
          <h2>Built around your life</h2>
          <button
            className="text-link"
            onClick={() =>
              prompt("Please remember these food preferences and constraints: ")
            }
          >
            Refine ↗
          </button>
        </div>
        <div className="tags">
          {(c?.preferences.length
            ? c.preferences
            : ["Tell me about your preferences, budget and routine"]
          ).map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </section>
      <section className="section-block">
        <div className="section-top">
          <h2>Your reliable meals</h2>
          <button
            className="text-link"
            onClick={() => prompt("Refresh my fallback meals. ")}
          >
            Refresh ↗
          </button>
        </div>
        <p className="caption">
          A few good defaults for when deciding feels like work.
        </p>
        <div className="fallback-grid">
          {c?.meals.map((m, i) => (
            <button
              className="fallback-card"
              key={i}
              onClick={() =>
                prompt(`Help me prepare ${m.title}: ${m.description}`)
              }
            >
              <span className="meal-number">0{i + 1}</span>
              <h3>{m.title}</h3>
              <p>{m.description}</p>
              <span className="text-link">Make this work for me ↗</span>
            </button>
          )) ?? (
            <button
              className="fallback-card"
              onClick={() =>
                prompt("Help me choose three easy fallback meals.")
              }
            >
              Let's find your go-to meals ↗
            </button>
          )}
        </div>
      </section>
      <section className="review-callout">
        <div>
          <span className="small-label">A PLAN THAT LEARNS WITH YOU</span>
          <h2>
            Keep what helps.
            <br />
            <em>Change what doesn't.</em>
          </h2>
        </div>
        <button
          className="secondary"
          onClick={() =>
            prompt(
              "Review my week: what helped, what is uncertain, and one small thing to try next?",
            )
          }
        >
          Review my week ↗
        </button>
      </section>
    </>
  );
}
export function ProgressView({
  state: s,
  today,
  prompt,
  health,
}: {
  state: State;
  today: string;
  prompt: (v: string) => void;
  health: () => void;
}) {
  const [range, setRange] = useState(30),
    from = addDays(today, 1 - range);
  const entries = s.entries.filter((e) => e.date >= from && e.date <= today),
    weights = s.weighIns.filter((w) => w.date >= from && w.date <= today);
  const complete = s.completedDays.filter((d) => d >= from && d <= today),
    sum = totals(entries.filter((e) => complete.includes(e.date)));
  const practices = new Set(
    s.memory.practices
      .filter((p) => p.date >= from && p.date <= today)
      .map((p) => p.date),
  );
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">THE BIGGER PICTURE</span>
        <h1>
          Progress, <em>with perspective.</em>
        </h1>
        <p className="lede">See where you are. Know what to work on next.</p>
      </div>
      <ProgressSummary state={s} today={today} prompt={prompt} />
      <div className="section-top">
        <h2>Your records</h2>
        <div className="segmented" aria-label="Progress range">
          {[7, 30, 90].map((v) => (
            <button
              key={v}
              aria-pressed={range === v}
              className={range === v ? "active" : ""}
              onClick={() => setRange(v)}
            >
              {v} days
            </button>
          ))}
        </div>
      </div>
      <div className="stat-grid">
        <div>
          <span className="small-label">DAYS WITH A MEAL LOG</span>
          <strong>
            {new Set(entries.map((e) => e.date)).size}
            <small> / {range}</small>
          </strong>
        </div>
        <div>
          <span className="small-label">PRACTICE DAYS</span>
          <strong>
            {practices.size}
            <small> small steps</small>
          </strong>
        </div>
        <div>
          <span className="small-label">COMPLETE-DAY AVERAGE</span>
          <strong>
            {complete.length ? n(sum.kcal / complete.length) : "—"}
            <small> kcal</small>
          </strong>
          <p className="caption">
            {complete.length} day{complete.length === 1 ? "" : "s"} marked
            complete
          </p>
        </div>
      </div>
      <BodyTrends
        weights={weights}
        measurements={s.bodyMetrics.filter(
          (m) => m.date >= from && m.date <= today,
        )}
        unit={s.plan!.profile.unit}
        onPrompt={prompt}
        onHealth={health}
      />
      <section className="review-callout">
        <div>
          <span className="small-label">YOUR WEEKLY CHECK-IN</span>
          <h2>
            What made life
            <br />
            <em>a little easier?</em>
          </h2>
          <p className="caption">
            Reflect, learn, and choose one small adjustment.
          </p>
        </div>
        <button
          className="btn"
          onClick={() =>
            prompt(
              "Review my week: what helped, what is uncertain, and one small thing to try next?",
            )
          }
        >
          Let's look together ↗
        </button>
      </section>
      <section className="section-block">
        <h2>Things you're learning</h2>
        {s.memory.reflections.length ? (
          s.memory.reflections
            .slice(-8)
            .reverse()
            .map((r, i) => (
              <div className="reflection" key={i}>
                <span className="small-label">{shortDate(r.date)}</span>
                <p>{r.text}</p>
              </div>
            ))
        ) : (
          <p className="muted">
            Hunger, energy, a dinner that worked. Share a thought below and
            build a picture of what works for you.
          </p>
        )}
      </section>
    </>
  );
}
