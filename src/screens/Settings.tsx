import { useEffect, useState } from "react";
import type { Provider, ProviderStatus } from "../../shared/types";
import { checkKey, type Mode } from "../lib/api";
import { PROVIDERS } from "../../shared/catalog";
import { store, useStore } from "../lib/store";
import { Sheet } from "../components/Sheet";
import { CheckIcon } from "../components/Icons";

interface Props {
  providers: ProviderStatus[] | null;
  serverDefault: Provider;
  mode: Mode;
  onClose: () => void;
  onReset: () => void;
}

/** Pick which model answers, and give it a key. Keys live in this browser only. */
export function Settings({ providers, serverDefault, mode, onClose, onReset }: Props) {
  const { settings } = useStore();
  const [confirm, setConfirm] = useState(false);
  const [check, setCheck] = useState<{ provider: Provider; busy: boolean; ok?: boolean; message?: string } | null>(null);

  const active = settings.provider ?? serverDefault;

  useEffect(() => setCheck(null), [active]);

  async function runCheck(provider: Provider) {
    const key = settings.apiKeys[provider]?.trim();
    if (!key) return;
    setCheck({ provider, busy: true });
    const r = await checkKey(provider, key);
    setCheck({ provider, busy: false, ...r });
  }

  return (
    <Sheet onClose={onClose}>
      <div className="stack gap-8">
        <h2>Which AI should I use?</h2>
        <div className="caption">
          {mode === "direct"
            ? "Paste a key from the provider's site. It stays in this browser and goes straight to that provider, nowhere else."
            : "Paste a key from the provider's site. It stays in this browser and is only sent to your own server."}
        </div>
      </div>
      <div className="stack mt-16">
        {(providers ?? []).map((p) => {
          const on = active === p.provider;
          const local = settings.apiKeys[p.provider] ?? "";
          const status = p.configured ? "key on server" : local ? "key on this device" : "no key yet";
          return (
            <div className="stack" key={p.provider}>
              <button className="option" onClick={() => store.setSettings({ provider: p.provider })}>
                <span className={`radio ${on ? "on" : ""}`} />
                <span style={{ flexGrow: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>{p.label}</div>
                  <div className="caption">{p.model} · {status}</div>
                </span>
              </button>
              {on && (
                <div className="stack gap-8" style={{ marginBottom: 16 }}>
                  <div className="row gap-8">
                    <input
                      className="field"
                      type="password"
                      placeholder={p.configured ? "Server key in use; paste one to override" : `${p.label} API key`}
                      autoComplete="off"
                      spellCheck={false}
                      value={local}
                      onChange={(e) => {
                        setCheck(null);
                        store.setSettings({ apiKeys: { ...settings.apiKeys, [p.provider]: e.target.value } });
                      }}
                    />
                    <button
                      className="btn"
                      style={{ width: "auto", height: 44, padding: "0 16px", borderRadius: 22, flexShrink: 0 }}
                      disabled={!local.trim() || check?.busy}
                      onClick={() => runCheck(p.provider)}
                    >
                      {check?.busy && check.provider === p.provider ? "Checking…" : "Check"}
                    </button>
                  </div>
                  {check && check.provider === p.provider && !check.busy && (
                    <div className={`note ${check.ok ? "" : "error"}`}>
                      {check.ok && <CheckIcon />}
                      <span>{check.message}</span>
                    </div>
                  )}
                  {!p.configured && !local && (
                    <div className="caption">
                      Without a key the app runs in demo mode with sample answers.{" "}
                      <a href={PROVIDERS[p.provider].keysUrl} target="_blank" rel="noreferrer">
                        Get a {p.label} key
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {providers && providers.length === 0 && <div className="caption">Could not reach the server.</div>}
      </div>
      <div className="row between mt-24">
        {confirm ? (
          <button className="link" style={{ color: "var(--danger)" }} onClick={onReset}>Yes, erase everything</button>
        ) : (
          <button className="link" style={{ color: "var(--ink-3)" }} onClick={() => setConfirm(true)}>Start over</button>
        )}
        <button className="link" onClick={onClose}>Done</button>
      </div>
    </Sheet>
  );
}
