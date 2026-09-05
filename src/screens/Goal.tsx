import { useState } from "react";
import type { Plan } from "../../shared/types";
import { ApiError, buildPlan } from "../lib/api";
import { useSpeech } from "../lib/speech";
import { GearIcon, MicIcon } from "../components/Icons";

interface Props {
  onPlan: (plan: Plan, demo: boolean) => void;
  onSettings: () => void;
  demo: boolean;
}

/** Onboarding: one freeform box instead of a form. */
export function Goal({ onPlan, onSettings, demo }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [base, setBase] = useState("");
  const speech = useSpeech((t, final) => {
    setText(base ? `${base} ${t}` : t);
    if (final) speech.stop();
  });

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await buildPlan(text.trim());
      if (res.status === "need_more") {
        setQuestion(res.question);
        setText((t) => t.trimEnd() + " ");
      } else {
        onPlan(res.plan, Boolean(res.demo));
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <div className="header">
        <div className="stack gap-16">
          {demo && (
            <button className="tag" onClick={onSettings} style={{ alignSelf: "flex-start" }}>
              Demo mode · add an API key
            </button>
          )}
          <h1>Tell me about you, and what you're after.</h1>
        </div>
        <button className="icon-btn" aria-label="AI settings" onClick={onSettings}>
          <GearIcon />
        </button>
      </div>
      <div className="stack gap-16">
        <p className="lede" style={{ margin: 0 }}>
          Age, height, weight, how you move, what you want. Say it however you like.
        </p>
      </div>

      <div className="card textbox mt-32">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="I'm 34, 5'10&quot;, 182 lb. I lift three mornings a week and walk the dog most days. I want to get to 170 by Christmas without losing muscle."
          autoFocus
          disabled={busy}
        />
        <div className="row between">
          <div className="caption">{speech.supported ? (speech.listening ? "Listening…" : "Or just say it") : ""}</div>
          <button
            type="button"
            className={`mic ${speech.listening ? "listening" : ""} ${speech.supported ? "" : "disabled"}`}
            aria-label="Speak"
            disabled={!speech.supported || busy}
            onClick={() => {
              if (!speech.listening) setBase(text.trim());
              speech.toggle();
            }}
          >
            <MicIcon />
          </button>
        </div>
      </div>

      {question && (
        <p className="quote mt-24" style={{ margin: "24px 0 0" }}>
          {question}
        </p>
      )}
      {error && <p className="caption error mt-16">{error}</p>}

      <div className="bottom">
        <div className="bottom-inner">
          <button className="btn" onClick={submit} disabled={busy || !text.trim()}>
            {busy ? "Working out your plan…" : question ? "Update my plan" : "Build my plan"}
          </button>
          <div className="caption" style={{ textAlign: "center" }}>
            Change anything later, just by asking.
          </div>
        </div>
      </div>
    </div>
  );
}
