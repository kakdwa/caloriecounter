import { useState } from "react";
import { useSpeech } from "../lib/speech";
import { MicIcon, SendIcon } from "./Icons";

interface Props {
  placeholder: string;
  onSubmit: (text: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

/** The always-present input: type or speak, submit with Enter or the arrow. */
export function InputPill({ placeholder, onSubmit, disabled, autoFocus }: Props) {
  const [text, setText] = useState("");
  const speech = useSpeech((t, final) => {
    setText(t);
    if (final && t) {
      speech.stop();
    }
  });

  function submit() {
    const t = text.trim();
    if (!t || disabled) return;
    setText("");
    onSubmit(t);
  }

  const showSend = text.trim().length > 0;

  return (
    <form
      className="pill"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={speech.listening ? "Listening…" : placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        enterKeyHint="send"
        autoComplete="off"
      />
      {showSend ? (
        <button type="submit" className="mic" aria-label="Send" disabled={disabled}>
          <SendIcon />
        </button>
      ) : (
        <button
          type="button"
          className={`mic ${speech.listening ? "listening" : ""} ${speech.supported ? "" : "disabled"}`}
          aria-label={speech.listening ? "Stop listening" : "Speak"}
          title={speech.supported ? undefined : "Voice input is not available in this browser"}
          onClick={speech.toggle}
          disabled={disabled || !speech.supported}
        >
          <MicIcon />
        </button>
      )}
    </form>
  );
}
