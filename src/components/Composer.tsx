import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { CoachStage, ImageInput } from "../../shared/types";
import { RequestActivity } from "./RequestActivity";
import { useSpeech } from "../lib/speech";
import { MicIcon, SendIcon } from "./Icons";
export async function prepareImage(file: File): Promise<ImageInput> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPEG, PNG or WebP photo.");
  if (file.size > 15 * 1024 * 1024)
    throw new Error("Choose a photo smaller than 15 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const ratio = Math.min(1, 1440 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * ratio);
    canvas.height = Math.round(img.height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser could not prepare this photo.");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return {
      mediaType: "image/jpeg",
      data: canvas.toDataURL("image/jpeg", 0.82).split(",")[1],
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
interface Props {
  text: string;
  setText: (s: string) => void;
  images: ImageInput[];
  setImages: (v: ImageInput[]) => void;
  busy: boolean;
  onSend: () => void;
  selected: string | null;
  onClear: () => void;
  demo: boolean;
  onSettings: () => void;
  stage: CoachStage;
  submitted: string;
  onStop: () => void;
  placeholder: string;
  draftSaved: boolean;
  error: string;
  onDismissError: () => void;
  children: ReactNode;
  logDate: string | null;
  onToday: () => void;
  modalOpen: boolean;
}
export function Composer(p: Props) {
  const file = useRef<HTMLInputElement>(null),
    shell = useRef<HTMLDivElement>(null),
    input = useRef<HTMLTextAreaElement>(null),
    voicePrefix = useRef("");
  const [error, setError] = useState(""),
    [focused, setFocused] = useState(false),
    [preparing, setPreparing] = useState(false);
  const expanded = focused || !!p.text || !!p.images.length;
  useLayoutEffect(() => {
    if (!input.current) return;
    input.current.style.height = "24px";
    input.current.style.height = `${Math.min(120, input.current.scrollHeight)}px`;
  }, [p.text, expanded, p.busy]);
  useEffect(() => {
    if (!shell.current) return;
    const observer = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty("--dock-height", `${entry.target.getBoundingClientRect().height}px`);
    });
    observer.observe(shell.current);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty("--dock-height"); };
  }, []);
  const speech = useSpeech((t) =>
    p.setText([voicePrefix.current, t].filter(Boolean).join(" ")),
  );
  async function attach(files: FileList | File[] | null) {
    if (!files || preparing || p.busy) return;
    setError("");
    if (files.length + p.images.length > 2) {
      setError("Use up to two photos in one message.");
      return;
    }
    setPreparing(true);
    try {
      p.setImages([
        ...p.images,
        ...(await Promise.all(Array.from(files).map(prepareImage))),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that photo.");
    } finally {
      setPreparing(false);
      if (file.current) file.current.value = "";
    }
  }
  function send() {
    if (p.busy || preparing || (!p.text.trim() && !p.images.length)) return;
    speech.stop();
    p.onSend();
  }
  return (
    <div className="composer-shell" ref={shell} inert={p.modalOpen}>
      <div className="composer-inner">
        {p.children}
        {p.logDate && <div className="context-chip"><span>Logging food for {p.logDate}</span><button disabled={p.busy} onClick={p.onToday}>Today</button></div>}
        {p.selected && (
          <div className="context-chip">
            <span>Editing · {p.selected}</span>
            <button onClick={p.onClear} aria-label="Clear selected meal">
              ×
            </button>
          </div>
        )}
        {(p.error || error || speech.error) && (
          <div className="composer-error" role="alert">
            <span>{p.error || error || speech.error}</span>
            {!!(p.error || error) && <button aria-label="Dismiss error" onClick={() => { setError(""); p.onDismissError(); }}>×</button>}
          </div>
        )}
        {!p.draftSaved && <div className="composer-error" role="status">Draft storage is full. Keep this tab open until you’ve saved your changes.</div>}
        <form
          className={`composer ${expanded ? "expanded" : "compact"} ${speech.listening ? "is-listening" : ""} ${p.busy ? "is-working" : ""} ${p.text.trim() || p.images.length ? "has-input" : ""}`}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}
          onPaste={e => {
            const photos = Array.from(e.clipboardData.files).filter(f => f.type.startsWith("image/"));
            if (photos.length) { e.preventDefault(); void attach(photos); }
          }}
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          {p.busy && <RequestActivity stage={p.stage} input={p.submitted} onStop={p.onStop} />}
          {!!p.images.length && (
            <div className="attachments">
              {p.images.map((im, i) => (
                <div key={i}>
                  <img
                    src={`data:${im.mediaType};base64,${im.data}`}
                    alt={`Attached meal photo ${i + 1}`}
                  />
                  <button
                    type="button"
                    disabled={p.busy}
                    aria-label={`Remove photo ${i + 1}`}
                    onClick={() =>
                      p.setImages(p.images.filter((_, j) => j !== i))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <textarea
            id="coach-input"
            ref={input}
            aria-label="Tell your coach"
            placeholder={
              speech.listening
                ? "Listening…"
                : p.placeholder
            }
            rows={1}
            value={p.text}
            maxLength={12000}
            disabled={p.busy}
            onChange={(e) => p.setText(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                if (!p.busy && !preparing && (p.text.trim() || p.images.length))
                  send();
              }
            }}
          />
          <div className="composer-tools">
            <div className="row gap-8">
              <button
                className="tool"
                type="button"
                aria-label="Attach a photo"
                disabled={p.busy || preparing}
                onClick={() => file.current?.click()}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="5" width="18" height="16" rx="4" />
                  <path d="M8 5l2-3h4l2 3" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
              {speech.supported && <button
                className={`tool ${speech.listening ? "recording" : ""}`}
                type="button"
                aria-label={
                  speech.listening ? "Stop recording" : "Speak your message"
                }
                aria-pressed={speech.listening}
                disabled={p.busy}
                onClick={() => {
                  if (!speech.listening) voicePrefix.current = p.text;
                  speech.toggle();
                }}
              >
                <MicIcon />
              </button>}
              <span className="microcopy">
                {preparing
                  ? "Preparing photo…"
                  : speech.listening
                    ? "Listening · tap to stop"
                    : speech.supported ? "Text, voice or photo" : "Text, photo or keyboard dictation"}
              </span>
            </div>
            <button
              className="send-button"
              type="submit"
              aria-label="Send to coach"
              disabled={
                p.busy || preparing || (!p.text.trim() && !p.images.length)
              }
            >
              {p.busy ? <span className="spinner" /> : <SendIcon />}
            </button>
          </div>
          <input
            hidden
            ref={file}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => void attach(e.target.files)}
          />
        </form>
        {expanded && !p.busy && <div className="dock-caption">{p.demo ? "Fictional sample · connect your AI in settings" : "Review before saving · draft kept in this tab"}</div>}
      </div>
    </div>
  );
}
