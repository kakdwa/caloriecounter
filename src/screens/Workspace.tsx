import { RecoveryPanel } from "../components/RecoveryPanel";
import { ProgressSummary } from "../components/ProgressSummary";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { EnergyDial } from "../components/EnergyDial";
import { NutrientSymbol } from "../components/Icons";
import { NutritionEvidence } from "../components/NutritionEvidence";
import { BodyTrends } from "../components/BodyTrends";
import { EnergyBalance, IntakeHistory, MacroComposition, PracticeCalendar } from "../components/NutritionCharts";
import { CheckControl, Disclosure, MeterFill, gsap, useGSAP, useMotionPreference } from "../components/Motion";
import { useRef, useState } from "react";
import type { State } from "../lib/store";
import { addDays, n, shortDate, weight, weekStart } from "../lib/format";
import { totals, itemTotals } from "../lib/totals";
import type { Entry } from "../../shared/types";
import type { QuickAction } from "../lib/actions";
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
    <div className="welcome-start">
      <span className="eyebrow">A little clarity, every day</span>
      <h1>A plan for<br /><span>your life.</span></h1>
      <p className="lede">
        Your goals, your favourite foods, your kind of day. Start a conversation
        and build from there.
      </p>
      <div className="welcome-actions">
        <button
          className="btn"
          onClick={
            demo ? connect : () => prompt("I'd like to build my diet plan. ")
          }
        >
          {demo ? "Connect my AI" : "Create my plan"}
          <span aria-hidden="true">↗</span>
        </button>
        {demo && (
          <button
            className="text-link"
            onClick={() => prompt("Explore the sample plan")}
          >
            Explore a sample
          </button>
        )}
      </div>
      <div className="welcome-prompts">
        <span className="small-label">It can start with…</span>
        {[
          "I want to lose weight without giving up the food I love.",
          "Help me find a routine that fits my busy weekdays.",
        ].map((text) => (
          <button key={text} onClick={() => prompt(text)}>
            <span>{text}</span>
            <span aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
      <p className="caption">
        Your records stay in this browser. You review every AI change before
        saving.
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
    <div className="macro" data-nutrient={name.toLowerCase()}>
      <span className="small-label"><NutrientSymbol name={name.toLowerCase()} />{name}</span>
      <div>
        <strong>
          <AnimatedNumber value={value} />
        </strong>
        <span> / {n(target)} g</span>
      </div>
      <div
        className="meter"
        role="meter"
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={Math.max(target, value, 1)}
        aria-valuenow={value}
        aria-valuetext={`${n(value)} of ${n(target)} grams`}
      >
        <MeterFill ratio={target ? value / target : 0} />
      </div>
    </div>
  );
}

function Meals({
  entries,
  select,
  savedIds,
  act,
  locked,
  prompt,
}: {
  entries: Entry[];
  select: (e: Entry) => void;
  savedIds: string[];
  act: (action: QuickAction) => void;
  locked: boolean;
  prompt: (v: string) => void;
}) {
  return (
    <div className="food-list">
      {entries.length ? (
        entries.map((e) => {
          const sum = itemTotals(e.items);
          return (
            <div
              className={`food-entry ${savedIds.includes(e.id) ? "just-saved" : ""}`}
              key={e.id}
            >
              <Disclosure
                className="food-disclosure"
                label={`Details for ${e.text}`}
                title={
                  <>
                    <span className="food-identity">
                      <strong>{e.text}</strong>
                      <small>
                        {e.demo ? "Sample · " : ""}
                        {e.items.length}{" "}
                        {e.items.length === 1 ? "food" : "foods"} ·{" "}
                        {n(sum.proteinG)} g protein
                      </small>
                    </span>
                    <span className="food-energy">
                      {n(sum.kcal)}
                      <small>kcal</small>
                    </span>
                  </>
                }
              >
                <div className="food-macros">
                  <span data-nutrient="protein">{n(sum.proteinG)} g protein</span>
                  <span data-nutrient="carbs">{n(sum.carbsG)} g carbs</span>
                  <span data-nutrient="fat">{n(sum.fatG)} g fat</span>
                </div>
                {e.items.map((item, j) => (
                  <div key={j} className="saved-food">
                    <strong>{item.name}</strong>
                    <p className="caption">
                      {item.detail} · {n(item.kcal)} kcal
                    </p>
                    <NutritionEvidence item={item} />
                  </div>
                ))}
                <div className="food-actions">
                  <button
                    className="text-link"
                    disabled={locked}
                    onClick={() => select(e)}
                  >
                    Adjust meal ↗
                  </button>
                  <button
                    className="text-link remove-meal"
                    disabled={locked}
                    onClick={() => act({ type: "remove", entryId: e.id })}
                  >
                    Remove
                  </button>
                </div>
              </Disclosure>
            </div>
          );
        })
      ) : (
        <div className="food-empty">
          <div>
            <h3>Your day starts here.</h3>
            <p>Tell me what you ate. A few words is enough.</p>
          </div>
          <button className="text-link" onClick={() => prompt("I had ")}>
            Log a meal <span aria-hidden="true">↗</span>
          </button>
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
  act,
  locked,
  progress,
}: {
  state: State;
  today: string;
  date: string;
  setDate: (v: string) => void;
  prompt: (v: string) => void;
  select: (e: Entry) => void;
  savedIds: string[];
  revision: number;
  act: (action: QuickAction) => void;
  locked: boolean;
  progress: () => void;
}) {
  const p = s.plan!,
    entries = s.entries.filter((e) => e.date === date),
    sum = totals(entries),
    remaining = p.targets.calories - sum.kcal;
  const days = new Set(
    s.memory.practices
      .filter(
        (x) =>
          x.date >= weekStart(today) &&
          x.date <= today &&
          x.focus === p.coaching?.focus,
      )
      .map((x) => x.date),
  );
  const done = s.completedDays.includes(date);
  const practiced = days.has(today);
  const feedback = useRef<HTMLDivElement>(null);
  const previous = useRef({ date, done, practiced });
  const reduced = useMotionPreference();
  useGSAP(() => {
    const before = previous.current;
    previous.current = { date, done, practiced };
    // Browsing dates is not a completed action. Only actual changes get feedback.
    if (before.date !== date || reduced) return;
    const sequence = gsap.timeline({ defaults: { duration: 0.24, ease: "power2.out", overwrite: true } });
    if (before.done !== done) {
      sequence.fromTo(".day-status", { opacity: 0.5 }, { opacity: 1, clearProps: "opacity" }, 0);
    }
    if (before.practiced !== practiced) {
      sequence.fromTo(".week-practice .current .practice-mark", { scale: 0.72, rotation: -18 }, { scale: 1, rotation: 0, duration: 0.32, ease: "back.out(1.4)", clearProps: "transform" }, 0)
        .fromTo(".practice-count", { opacity: 0.5 }, { opacity: 1, clearProps: "opacity" }, 0.08);
    }
  }, { scope: feedback, dependencies: [date, done, practiced, reduced], revertOnUpdate: true });
  const recent = [...s.entries]
    .sort(
      (a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time),
    )
    .filter((e) => e.date < date && (p.demo || !e.demo))
    .filter(
      (e, i, all) =>
        i ===
        all.findIndex(
          (other) =>
            other.text === e.text &&
            JSON.stringify(other.items) === JSON.stringify(e.items),
        ),
    )
    .slice(0, 3);
  return (
    <>
      <div className="page-heading daily-heading">
        <div>
          <h1>{date === today ? "Today" : shortDate(date)}</h1>
          <p className="caption">
            {new Date(date + "T12:00:00").toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="date-controls" aria-label="Food journal date">
          <button
            aria-label="Previous day"
            onClick={() => setDate(addDays(date, -1))}
          >
            ‹
          </button>
          {date !== today && (
            <button className="back-today" onClick={() => setDate(today)}>
              Today
            </button>
          )}
          <button
            aria-label="Next day"
            disabled={date >= today}
            onClick={() => setDate(addDays(date, 1))}
          >
            ›
          </button>
        </div>
      </div>
      <div className="daily-layout" ref={feedback}>
        <div className="daily-main">
          <section
            className={`daily-budget ${done ? "day-complete" : ""}`}
            aria-label="Daily nutrition"
          >
            <div className="energy-panel">
              <div className="budget-heading">
                <span className="small-label">
                  {remaining >= 0
                    ? date === today
                      ? "Remaining today"
                      : "Below your daily target"
                    : "Above your daily target"}
                </span>
                <span className="day-status">
                  <span className="status-dot" />
                  {done ? "Complete" : "In progress"}
                </span>
              </div>
              <div className="budget-reading">
                <div className="budget-number">
                  <strong>
                    <AnimatedNumber value={Math.abs(remaining)} />
                  </strong>
                  <span>kcal</span>
                </div>
                <EnergyDial value={sum.kcal} target={p.targets.calories} />
              </div>
              <div className="budget-ends">
                <span>
                  <AnimatedNumber value={sum.kcal} /> eaten
                </span>
                <span>{n(p.targets.calories)} target</span>
              </div>
            </div>
            <div className="macro-grid">
              <Macro
                name="Protein"
                value={sum.proteinG}
                target={p.targets.proteinG}
              />
              <Macro
                name="Carbs"
                value={sum.carbsG}
                target={p.targets.carbsG}
              />
              <Macro name="Fat" value={sum.fatG} target={p.targets.fatG} />
            </div>
            {remaining < 0 && (
              <p className="budget-note">
                One day is one part of the picture. Keep your next meal normal.
              </p>
            )}
            {date === today && (
              <button
                className="next-meal-action"
                disabled={locked}
                onClick={done ? progress : () => prompt("Help me choose my next meal using my plan, food preferences and what I've logged today. ")}
              >
                <span>{done ? "See today's progress" : "What fits my next meal?"}</span>
                <span aria-hidden="true">↗</span>
              </button>
            )}
          </section>
          <section className="food-journal" aria-label="Food journal">
            <div className="section-top">
              <h2>Food journal</h2>
              <span className="caption">
                {entries.length} {entries.length === 1 ? "meal" : "meals"}
              </span>
            </div>
            <Meals
              entries={entries}
              select={select}
              savedIds={savedIds}
              act={act}
              locked={locked}
              prompt={prompt}
            />
            {!!recent.length && (
              <Disclosure className="repeat-meals" title="Repeat a recent meal">
                <p className="caption">
                  Same portions, added to{" "}
                  {date === today ? "today" : shortDate(date)}. Always undoable.
                </p>
                {recent.map((e) => (
                  <button
                    key={e.id}
                    className="repeat-meal"
                    disabled={locked}
                    onClick={() => act({ type: "repeat", entryId: e.id, date })}
                  >
                    <span>
                      <strong>{e.text}</strong>
                      <small>
                        {n(itemTotals(e.items).kcal)} kcal · {shortDate(e.date)}
                      </small>
                    </span>
                    <span aria-hidden="true">＋</span>
                  </button>
                ))}
              </Disclosure>
            )}
            {!!entries.length && (
              <div className="day-check">
                <CheckControl
                  checked={done}
                  disabled={locked}
                  onChange={() =>
                    act({ type: "complete", date, complete: !done })
                  }
                  detail={
                    done
                      ? "Included in your progress review. You can reopen anytime."
                      : "Check when every meal and snack is here."
                  }
                >
                  All food logged for{" "}
                  {date === today ? "today" : shortDate(date)}
                </CheckControl>
              </div>
            )}
          </section>
        </div>
        <aside className="daily-context" aria-label="Your next steps">
          <section className="weekly-focus">
            <span className="small-label">One small thing this week</span>
            <h2>{p.coaching?.focus ?? "Make the next meal easier"}</h2>
            <p>
              {p.coaching?.focusReason ??
                "Choose one small action that makes your day easier."}
            </p>
            <div
              className="week-practice"
              aria-label={`${days.size} practice days this week`}
            >
              {Array.from({ length: 7 }, (_, i) => {
                const d = addDays(weekStart(today), i);
                return (
                  <div
                    key={d}
                    className={`${days.has(d) ? "done" : ""} ${d === today ? "current" : ""}`}
                    aria-label={`${shortDate(d)}: ${days.has(d) ? "practiced" : "not recorded"}`}
                  >
                    <span>
                      {new Date(d + "T12:00:00").toLocaleDateString(undefined, {
                        weekday: "narrow",
                      })}
                    </span>
                    <span className="practice-mark" aria-hidden="true">
                      {days.has(d) ? (
                        <svg viewBox="0 0 24 24">
                          <path pathLength="1" d="m5 12 4 4 10-10" />
                        </svg>
                      ) : (
                        <i />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            {p.coaching?.focus ? (
              <CheckControl
                checked={days.has(today)}
                disabled={locked}
                onChange={() =>
                  act({ type: "practice", complete: !days.has(today) })
                }
              >
                I practiced today
              </CheckControl>
            ) : (
              <button
                className="text-link"
                onClick={() =>
                  prompt("Help me choose one small focus for this week. ")
                }
              >
                Choose my focus ↗
              </button>
            )}
            <span className="caption practice-count">
              {days.size} {days.size === 1 ? "day" : "days"} this week. No
              streak to protect.
            </span>
          </section>
          <ProgressSummary
            state={s}
            today={today}
            prompt={prompt}
            compact
            onOpen={progress}
          />
          {!!s.memory.events.filter((e) => e.date >= today).length && (
            <section className="upcoming">
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
                    <span>
                      <strong>{e.title}</strong>
                      <small>{e.detail}</small>
                    </span>
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
            </section>
          )}
        </aside>
      </div>
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
        <span className="eyebrow">Built around you</span>
        <h1>Your plan</h1>
        <p className="lede">{c?.intention ?? p.copy.summary}</p>
      </div>
      <div className="plan-grid">
        <section className="card plan-targets">
          <div className="plan-energy">
          <span className="small-label">
            {p.profile.goal === "lose"
              ? "Daily calorie target"
              : "Daily starting point"}
          </span>
          <div className="plan-calories">
            <strong>{n(p.targets.calories)}</strong>
            <span>kcal / day</span>
          </div>
          </div>
          <div className="macro-grid">
            {[
              ["Protein", p.targets.proteinG],
              ["Carbs", p.targets.carbsG],
              ["Fat", p.targets.fatG],
            ].map(([label, val]) => (
              <div key={label} className="target-nutrient" data-nutrient={String(label).toLowerCase()}>
                <span className="small-label"><NutrientSymbol name={String(label).toLowerCase()} />{label}</span>
                <div className="target-macro">
                  {val}
                  <small> g</small>
                </div>
              </div>
            ))}
          </div>
          <MacroComposition targets={p.targets} />
          <EnergyBalance targets={p.targets} />
          <Disclosure
            className="plan-explainer"
            title="How your targets were set"
          >
            <p>
              {p.profile.goal === "lose"
                ? `Start around ${n(p.targets.calories)} kcal per day, with ${p.targets.proteinG}g protein. This is about ${n(Math.max(0, p.targets.tdee - p.targets.calories))} kcal below your estimated daily needs.`
                : `Start around ${n(p.targets.calories)} kcal per day, based on your profile and activity.`}
            </p>
            <p className="caption">
              {p.targets.weeklyRateKg
                ? `Starting weight-change estimate: ${weight(Math.abs(p.targets.weeklyRateKg), p.profile.unit, 2)} per week ${p.targets.weeklyRateKg < 0 ? "down" : "up"}. `
                : "Aim for a broadly stable weight. "}
              Review your trend, hunger and energy together. Weight change is
              not the same as fat loss; targets stay unchanged until you approve
              a revision.
            </p>
          </Disclosure>
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
          <span className="small-label">Your direction</span>
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
              <dd>
                {weight(
                  p.startingWeightKg ?? p.profile.weightKg,
                  p.profile.unit,
                  1,
                )}
              </dd>
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
              <div className="meal-option-top">
                <h3>{m.title}</h3>
                <span className="meal-option-arrow" aria-hidden="true">↗</span>
              </div>
              <p>{m.description}</p>
              <span className="text-link">Make this work for me</span>
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
          <span className="small-label">A plan that adapts</span>
          <h2>Keep what helps. Change what doesn’t.</h2>
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
  const [range, setRange] = useState(7),
    from = addDays(today, 1 - range);
  const weights = s.weighIns.filter((w) => w.date >= from && w.date <= today);
  return (
    <>
      <div className="page-heading">
        <h1>Your progress</h1>
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
      <div className="progress-charts">
      <BodyTrends
        weights={weights}
        measurements={s.bodyMetrics.filter(
          (m) => m.date >= from && m.date <= today,
        )}
        unit={s.plan!.profile.unit}
        from={from}
        to={today}
        onPrompt={prompt}
        onHealth={health}
      />
      <IntakeHistory key={range} state={s} today={today} range={range} />
      </div>
      <RecoveryPanel state={s} today={today} prompt={prompt} />
      <PracticeCalendar state={s} today={today} range={range} />
      <section className="section-block">
        <Disclosure title="Your reflections">
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
        <button className="text-link" onClick={() => prompt("Review my week: what helped, what is uncertain, and one small thing to try next?")}>Review my week ↗</button>
        </Disclosure>
      </section>
    </>
  );
}
