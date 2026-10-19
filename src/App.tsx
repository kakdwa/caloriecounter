import { useEffect, useRef, useState } from "react";
import type { CoachStage, CoachUpdate, Entry, ImageInput } from "../shared/types";
import { getProviders, sendToCoach, type ProvidersInfo } from "./lib/api";
import { store, useStore } from "./lib/store";
import { addDays, localDate, shortDate } from "./lib/format";
import { quickUpdate, type QuickAction } from "./lib/actions";
import { emptyDraft, readDraft, writeDraft } from "./lib/draft";
import { Composer } from "./components/Composer";
import { Proposal } from "./components/Proposal";
import {
  Welcome,
  TodayView,
  PlanView,
  ProgressView,
  type View,
} from "./screens/Workspace";
import { Settings } from "./screens/Settings";
import { GearIcon, CheckIcon } from "./components/Icons";
import { startNutritionSync } from "./lib/nutrition-sync";
import { ViewTransition, Presence, PressFeedback } from "./components/Motion";
import { TodayIcon, TargetIcon, ChartIcon } from "./components/Icons";
export default function App() {
  const state = useStore();
  useEffect(startNutritionSync, []);
  const [draft] = useState(() => { try { return readDraft(sessionStorage); } catch { return emptyDraft(); } });
  const route = () => (["plan", "progress"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "today") as View;
  const [view, changeView] = useState<View>(route),
    [settingsOpen, setSettingsOpen] = useState(false),
    [info, setInfo] = useState<ProvidersInfo | null>(null),
    [text, setText] = useState(draft.text),
    [images, setImages] = useState<ImageInput[]>(draft.images),
    [busy, setBusy] = useState(false),
    [update, setUpdate] = useState<CoachUpdate | null>(draft.update),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<Entry | null>(state.entries.find(e => e.id === draft.selectedId) ?? null),
    [toast, setToast] = useState(""),
    [today, setToday] = useState(localDate()),
    [date, setDate] = useState(draft.logDate ?? localDate());
  const [stage, setStage] = useState<CoachStage>("understanding");
  const [settingsArea, setSettingsArea] = useState<"ai" | "health" | "data">("ai");
  const [submitted, setSubmitted] = useState("");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [revision, setRevision] = useState(0);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [draftSaved, setDraftSaved] = useState(true);
  useEffect(() => {
    if (!savedIds.length) return;
    const timer = setTimeout(() => setSavedIds([]), 1400);
    return () => clearTimeout(timer);
  }, [savedIds]);
  const review = useRef<HTMLDivElement>(null),
    request = useRef<AbortController | null>(null);
  const previousToday = useRef(today);
  const smooth = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" as const : "smooth" as const;
  function openSettings(area: "ai" | "health" | "data" = "ai") {
    setSettingsArea(area);
    setSettingsOpen(true);
  }
  function setView(next: View) {
    if (next !== view) history.pushState(null, "", `#${next}`);
    changeView(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  useEffect(() => {
    const back = () => changeView(route());
    window.addEventListener("popstate", back);
    return () => { window.removeEventListener("popstate", back); request.current?.abort(); };
  }, []);
  useEffect(() => {
    try { setDraftSaved(writeDraft(sessionStorage, { text, images, update, selectedId: selected?.id ?? null, logDate: date })); }
    catch { setDraftSaved(false); }
  }, [text, images, update, selected, date]);
  useEffect(() => {
    if (draftSaved || (!text && !images.length && !update)) return;
    const protect = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [draftSaved, text, images, update]);
  useEffect(() => {
    getProviders()
      .then(setInfo)
      .catch(() => setError("Could not load AI settings."));
    const id = setInterval(() => setToday(localDate()), 30000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (previousToday.current === today) return;
    const oldDay = previousToday.current;
    previousToday.current = today;
    setDate(previous => previous === oldDay && !text.trim() && !images.length && !update ? today : previous);
  }, [today]);
  const active = state.settings.provider ?? info?.default ?? "deepseek",
    demo =
      !!info &&
      !state.settings.apiKeys[active]?.trim() &&
      !info.providers.find((p) => p.provider === active)?.configured;
  function prompt(value: string) {
    if (request.current) return;
    setText(previous => previous.trim() ? `${previous.trim()}\n${value}` : value);
    requestAnimationFrame(() =>
      document.getElementById("coach-input")?.focus(),
    );
  }
  async function send(override?: string) {
    const message = override ?? text;
    if (request.current || (!message.trim() && !images.length)) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setStage("understanding");
    setSubmitted(message);
    setError("");
    setToast("");
    setUndoAvailable(false);
    if (override) setText(override);
    try {
      const current = store.get();
      const entries = [...current.entries]
        .sort(
          (a, b) =>
            a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
        )
        .filter((e, i, all) => e.date >= addDays(today, -13) || i >= all.length - 60)
        .slice(-500);
      if (selected && !entries.some((e) => e.id === selected.id)) {
        if (entries.length >= 500) entries.shift();
        entries.push(selected);
      }
      const result = await sendToCoach(message, images, {
        today,
        logDate: date,
        bodyMetrics: current.bodyMetrics.slice(-90),
        recovery: current.recovery.slice(-90),
        plan: current.plan,
        entries,
        weighIns: current.weighIns.slice(-60),
        memory: {
          events: current.memory.events.slice(-30),
          reflections: current.memory.reflections.slice(-20),
          practices: current.memory.practices.slice(-90),
        },
        history: current.history.slice(-8),
        completedDays: current.completedDays.filter(d => current.entries.filter(e => e.date === d).every(e => entries.some(included => included.id === e.id))).slice(-90),
        pending: update,
        selectedEntryId: selected?.id ?? null,
      }, next => { if (!controller.signal.aborted) setStage(next); }, controller.signal);
      if (controller.signal.aborted) return;
      setUpdate(result);
      setText("");
      setImages([]);
      try {
        store.addHistory(message, JSON.stringify(result));
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "History could not be saved.",
        );
      }
      setTimeout(
        () =>
          { review.current?.focus({ preventScroll: true }); review.current?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "instant"
              : "smooth",
            block: "start",
          }); },
        80,
      );
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(
        e instanceof Error
          ? e.message
          : "I could not finish that. Your message is still here to retry.",
      );
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }
  function stop() {
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setToast("Stopped. Your message is ready to edit or retry.");
    setUndoAvailable(false);
  }
  function act(action: QuickAction) {
    if (busy || update) return;
    try {
      const before = store.get().entries;
      store.apply(quickUpdate(store.get(), action, today), today);
      setSavedIds(store.get().entries.filter(e => !before.some(b => b.id === e.id)).map(e => e.id));
      setRevision(v => v + 1);
      setUndoAvailable(true);
      setToast(action.type === "practice" ? action.complete === false ? "Practice unchecked." : "Practice recorded. A small step counts."
        : action.type === "complete" ? action.complete ? "Day complete. Included in your progress review." : "Day reopened."
        : action.type === "repeat" ? "Meal added with the same portions." : "Meal removed.");
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save. Please try again."); }
  }
  function save() {
    if (!update) return;
    try {
      const before = store.get().entries;
      store.apply(update, today);
      const after = store.get().entries;
      setSavedIds(after.filter(e => !before.some(b => b.id === e.id && JSON.stringify(b) === JSON.stringify(e))).map(e => e.id));
      setRevision(v => v + 1);
      setUndoAvailable(true);
      setToast(
        update.plan
          ? "Plan saved. Your daily targets are ready."
          : update.recovery?.length || update.bodyMetrics?.length
            ? "Check-in saved. Your progress has been updated."
            : "Saved. Your dashboard is up to date.",
      );
      setUpdate(null);
      setSelected(null);
      if (update.plan) setView("plan");
      else if ((update.weighIns.length || update.bodyMetrics?.length || update.recovery?.length) && !update.meals.length)
        setView("progress");
      else if (update.meals.length) { setView("today"); setDate(update.meals[0].date); }
      window.scrollTo({ top: 0, behavior: smooth() });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please try again.",
      );
    }
  }
  function select(e: Entry) {
    if (busy || update) return;
    setSelected(e);
    prompt("Change this meal: ");
  }
  return (
    <>
      <PressFeedback />
      <div className={`app-shell ${state.plan ? "has-plan" : ""}`} inert={settingsOpen}>
        <header className="app-header">
          <button
            className="brand"
            onClick={() => setView("today")}
            aria-label="Calorie home"
          >
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" width="32" height="32" fill="none"><path d="M24 8a11.3 11.3 0 1 0 0 16" stroke="currentColor" strokeWidth="6"/><rect x="22" y="12" width="8" height="8" fill="var(--red)"/></svg>
            </span>
            calorie<span className="brand-subtitle">Nutrition, made personal</span>
          </button>
          <div className="header-right">
            <span className="connection-label">
              <span className="status-dot" />
              {demo
                ? "Sample mode"
                : info
                  ? info.providers.find((p) => p.provider === active)?.label
                  : "Connecting"}
            </span>
            <button
              className="icon-btn"
              aria-label="Settings"
              disabled={busy}
              onClick={() => openSettings()}
            >
              <GearIcon />
            </button>
          </div>
        </header>
        {state.plan && (
          <nav className="main-nav" aria-label="Main navigation" style={{ "--active-tab": ["today", "plan", "progress"].indexOf(view) } as React.CSSProperties}>
            <span className="nav-indicator" aria-hidden="true" />
            {(["today", "plan", "progress"] as const).map((v) => (
              <button
                aria-current={view === v ? "page" : undefined}
                key={v}
                className={view === v ? "active" : ""}
                onClick={() => setView(v)}
              >
                {v === "today" ? <TodayIcon /> : v === "plan" ? <TargetIcon /> : <ChartIcon />}
                {v === "today"
                  ? "Today"
                  : v === "plan"
                    ? "My plan"
                    : "Progress"}
              </button>
            ))}
          </nav>
        )}
        <main>
          {state.plan?.demo && (
            <div className="sample-banner">
              Fictional sample plan
              <button onClick={() => openSettings()}>
                Make it yours ↗
              </button>
            </div>
          )}
          {store.storageError() && (
            <div className="error-card" role="alert">
              {store.storageError()}
            </div>
          )}
          <div ref={review} className="review-anchor" aria-busy={busy} tabIndex={-1}>
            <Presence show={!!update}>{update && (
              <Proposal
                key={JSON.stringify(update)}
                update={update}
                busy={busy}
                onSave={save}
                onDismiss={() => {
                  setUpdate(null);
                  setSelected(null);
                }}
                onPrompt={prompt}
              />
            )}</Presence>
          </div>
          {!state.plan ? (
            <Welcome
              demo={demo}
              connect={() => openSettings()}
              prompt={(v) =>
                v === "Explore the sample plan" ? void send(v) : prompt(v)
              }
            />
          ) : (
            <ViewTransition view={view}>
              {view === "today" ? (
                <TodayView
                  state={state}
                  today={today}
                  date={date}
                  setDate={setDate}
                  prompt={prompt}
                  select={select}
                  savedIds={savedIds}
                  revision={revision}
                  act={act}
                  locked={busy || !!update}
                  progress={() => setView("progress")}
                />
              ) : view === "plan" ? (
                <PlanView state={state} prompt={prompt} />
              ) : (
                <ProgressView
                  state={state}
                  today={today}
                  prompt={prompt}
                  health={() => openSettings("health")}
                />
              )}
            </ViewTransition>
          )}
        </main>
      </div>
      <Composer
        text={text}
        setText={setText}
        images={images}
        setImages={setImages}
        busy={busy}
        onSend={() => void send()}
        selected={selected?.text ?? null}
        onClear={() => setSelected(null)}
        demo={demo}
        onSettings={() => openSettings()}
        stage={stage}
        submitted={submitted}
        onStop={stop}
        placeholder={!state.plan ? "Tell me your goal…" : update?.question ? "Your answer…" : selected || update ? "Tell me what to change…" : view === "plan" ? "Ask about your plan…" : view === "progress" ? "Add a weigh-in or ask your coach…" : "Log a meal or ask anything…"}
        draftSaved={draftSaved}
        logDate={state.plan && date !== today && !selected && !update ? shortDate(date) : null}
        onToday={() => setDate(today)}
        modalOpen={settingsOpen}
        error={error}
        onDismissError={() => setError("")}
      >
        <div role="status" aria-live="polite">
          <Presence show={!!toast}><div className="toast" key={revision}>
            <span className="success-check" aria-hidden="true"><CheckIcon /></span><span>{toast}</span>
            {undoAvailable && <button onClick={() => {
              try { store.undo(); setToast(""); setSavedIds([]); setUndoAvailable(false); }
              catch (e) { setError(String(e)); }
            }}>Undo</button>}
            <button aria-label="Dismiss saved message" onClick={() => setToast("")}>×</button>
          </div></Presence>
        </div>
      </Composer>
      {settingsOpen && (
        <Settings
          initialArea={settingsArea}
          providers={info?.providers ?? null}
          serverDefault={info?.default ?? "deepseek"}
          mode={info?.mode ?? "direct"}
          onClose={() => setSettingsOpen(false)}
          onConnected={() => {
            setSettingsOpen(false);
            if (!state.plan || state.plan.demo) prompt("I'd like to create my personal nutrition plan. ");
          }}
          onDataChanged={() => {
            setUpdate(null);
            setSelected(null);
            setToast("");
          }}
          onReset={() => {
            store.reset();
            setUpdate(null);
            setText("");
            setImages([]);
            setSelected(null);
            setToast("");
            setError("");
            setView("today");
          }}
        />
      )}
    </>
  );
}
