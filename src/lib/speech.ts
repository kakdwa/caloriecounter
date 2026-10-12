import { useCallback, useEffect, useRef, useState } from "react";
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
const ctor = () => {
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};
export function useSpeech(onText: (text: string, final: boolean) => void) {
  const [listening, setListening] = useState(false),
    [error, setError] = useState("");
  const rec = useRef<Recognition | null>(null),
    cb = useRef(onText);
  cb.current = onText;
  const stop = useCallback(() => {
    rec.current?.stop();
    setListening(false);
  }, []);
  const start = useCallback(() => {
    const C = ctor();
    if (!C) {
      setError(
        "Voice is not available in this browser. You can type or use your keyboard's dictation.",
      );
      return;
    }
    setError("");
    const r = new C();
    r.lang = navigator.language;
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) =>
      cb.current(
        Array.from(e.results)
          .map((v) => v[0].transcript)
          .join(" "),
        false,
      );
    r.onend = () => setListening(false);
    r.onerror = (e) => {
      setListening(false);
      setError(
        e.error === "not-allowed"
          ? "Microphone access was declined. Allow it in your browser settings, or type below."
          : "I could not hear that. Try voice again or type your message.",
      );
    };
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setError("Microphone could not start. Please try again.");
    }
  }, []);
  useEffect(
    () => () => {
      if (rec.current) {
        rec.current.onresult = null;
        rec.current.onend = null;
        rec.current.onerror = null;
        rec.current.stop();
      }
    },
    [],
  );
  return {
    supported: typeof window !== "undefined" && !!ctor(),
    listening,
    error,
    start,
    stop,
    toggle: listening ? stop : start,
  };
}
