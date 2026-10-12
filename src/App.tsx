import { useEffect, useRef, useState } from "react";
import type { CoachUpdate, Entry, ImageInput } from "../shared/types";
import { getProviders, sendToCoach, type ProvidersInfo } from "./lib/api";
import { store, useStore } from "./lib/store";
import { localDate } from "./lib/format";
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
import { GearIcon } from "./components/Icons";
export default function App() {
  const state = useStore();
  const [view, setView] = useState<View>("today"),
    [settingsOpen, setSettingsOpen] = useState(false),
    [info, setInfo] = useState<ProvidersInfo | null>(null),
    [text, setText] = useState(""),
    [images, setImages] = useState<ImageInput[]>([]),
    [busy, setBusy] = useState(false),
    [update, setUpdate] = useState<CoachUpdate | null>(null),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<Entry | null>(null),
    [toast, setToast] = useState(""),
    [today, setToday] = useState(localDate()),
    [date, setDate] = useState(localDate());
  const review = useRef<HTMLDivElement>(null),
    request = useRef(false);
  useEffect(() => {
    getProviders()
      .then(setInfo)
      .catch(() => setError("Could not load AI settings."));
    const id = setInterval(() => setToday(localDate()), 30000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    setDate(today);
  }, [today]);
  const active = state.settings.provider ?? info?.default ?? "deepseek",
    demo =
      !!info &&
      !state.settings.apiKeys[active]?.trim() &&
      !info.providers.find((p) => p.provider === active)?.configured;
  function prompt(value: string) {
    setText(value);
    requestAnimationFrame(() =>
      document.getElementById("coach-input")?.focus(),
    );
  }
  async function send(override?: string) {
    const message = override ?? text;
    if (request.current || (!message.trim() && !images.length)) return;
    request.current = true;
    setBusy(true);
    setError("");
    setToast("");
    try {
      const current = store.get();
      const entries = [...current.entries]
        .sort(
          (a, b) =>
            a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
        )
        .slice(-60);
      if (selected && !entries.some((e) => e.id === selected.id)) {
        entries.shift();
        entries.push(selected);
      }
      const result = await sendToCoach(message, images, {
        today,
        bodyMetrics: current.bodyMetrics.slice(-90),
        plan: current.plan,
        entries,
        weighIns: current.weighIns.slice(-60),
        memory: {
          events: current.memory.events.slice(-30),
          reflections: current.memory.reflections.slice(-20),
          practices: current.memory.practices.slice(-90),
        },
        history: current.history.slice(-8),
        completedDays: current.completedDays.slice(-90),
        pending: update,
        selectedEntryId: selected?.id ?? null,
      });
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
          review.current?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "instant"
              : "smooth",
            block: "start",
          }),
        80,
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "I could not finish that. Your message is still here to retry.",
      );
    } finally {
      request.current = false;
      setBusy(false);
    }
  }
  function save() {
    if (!update) return;
    try {
      store.apply(update, today);
      setToast(
        update.plan
          ? "Your plan is ready. One day at a time."
          : "Saved. A little more clarity.",
      );
      setUpdate(null);
      setSelected(null);
      if (update.plan) setView("plan");
      else if (update.weighIns.length && !update.meals.length)
        setView("progress");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please try again.",
      );
    }
  }
  function select(e: Entry) {
    setSelected(e);
    prompt("Change this meal: ");
  }
  return (
    <>
      <div className="app-shell">
        <header className="app-header">
          <button
            className="brand"
            onClick={() => setView("today")}
            aria-label="Calorie home"
          >
            <span className="brand-mark" aria-hidden="true">
              ◌
            </span>
            calorie<span className="brand-subtitle">a little, every day</span>
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
              onClick={() => setSettingsOpen(true)}
            >
              <GearIcon />
            </button>
          </div>
        </header>
        {state.plan && (
          <nav className="main-nav" aria-label="Main navigation">
            {(["today", "plan", "progress"] as const).map((v) => (
              <button
                aria-current={view === v ? "page" : undefined}
                key={v}
                className={view === v ? "active" : ""}
                onClick={() => setView(v)}
              >
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
          <div role="status" aria-live="polite">
            {toast && (
              <div className="toast">
                <span className="success-check">✓</span>
                <span>{toast}</span>
                <button
                  onClick={() => {
                    try {
                      store.undo();
                      setToast("");
                    } catch (e) {
                      setError(String(e));
                    }
                  }}
                >
                  Undo
                </button>
                <button
                  aria-label="Dismiss saved message"
                  onClick={() => setToast("")}
                >
                  ×
                </button>
              </div>
            )}
          </div>
          {state.plan?.demo && (
            <div className="sample-banner">
              You're exploring a fictional sample plan.
              <button onClick={() => setSettingsOpen(true)}>
                Make it yours ↗
              </button>
            </div>
          )}
          {(error || store.storageError()) && (
            <div className="error-card" role="alert">
              {error || store.storageError()}
              <button onClick={() => setError("")} aria-label="Dismiss error">
                ×
              </button>
            </div>
          )}
          {busy && (
            <div className="thinking" role="status">
              <span className="thinking-orb" />
              <div>
                <strong>Finding a little clarity…</strong>
                <p>Your meals, your goals, your real life.</p>
              </div>
            </div>
          )}
          <div ref={review} className="review-anchor">
            {update && (
              <Proposal
                update={update}
                busy={busy}
                onSave={save}
                onDismiss={() => {
                  setUpdate(null);
                  setSelected(null);
                }}
                onPrompt={prompt}
              />
            )}
          </div>
          {!state.plan ? (
            <Welcome
              demo={demo}
              connect={() => setSettingsOpen(true)}
              prompt={(v) =>
                v === "Explore the sample plan" ? void send(v) : prompt(v)
              }
            />
          ) : (
            <div key={view} className="view-enter">
              {view === "today" ? (
                <TodayView
                  state={state}
                  today={today}
                  date={date}
                  setDate={setDate}
                  prompt={prompt}
                  select={select}
                />
              ) : view === "plan" ? (
                <PlanView state={state} prompt={prompt} />
              ) : (
                <ProgressView
                  state={state}
                  today={today}
                  prompt={prompt}
                  health={() => setSettingsOpen(true)}
                />
              )}
            </div>
          )}
        </main>
        <footer className="page-footer">
          Built around your life. Adjusted as you go.
        </footer>
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
        onSettings={() => setSettingsOpen(true)}
      />
      {settingsOpen && (
        <Settings
          providers={info?.providers ?? null}
          serverDefault={info?.default ?? "deepseek"}
          mode={info?.mode ?? "direct"}
          onClose={() => setSettingsOpen(false)}
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
            setSettingsOpen(false);
          }}
        />
      )}
    </>
  );
}
