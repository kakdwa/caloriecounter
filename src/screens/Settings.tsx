import { useEffect, useState } from "react";
import type { Provider, ProviderStatus } from "../../shared/types";
import { getProviders } from "../lib/api";
import { store, useStore } from "../lib/store";
import { Sheet } from "../components/Sheet";

interface Props {
  onClose: () => void;
  onReset: () => void;
}

export function Settings({ onClose, onReset }: Props) {
  const { settings } = useStore();
  const [providers, setProviders] = useState<ProviderStatus[] | null>(null);
  const [serverDefault, setServerDefault] = useState<Provider>("deepseek");
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    getProviders()
      .then((r) => {
        setProviders(r.providers);
        setServerDefault(r.default);
      })
      .catch(() => setProviders([]));
  }, []);

  const active = settings.provider ?? serverDefault;

  return (
    <Sheet onClose={onClose}>
      <div className="stack gap-8">
        <h2>Which AI should I use?</h2>
        <div className="caption">Keys you enter stay on this device and are only sent to your own server.</div>
      </div>
      <div className="stack mt-16">
        {(providers ?? []).map((p) => {
          const on = active === p.provider;
          const hasKey = p.configured || Boolean(settings.apiKeys[p.provider]);
          return (
            <div className="stack" key={p.provider}>
              <button className="option" onClick={() => store.setSettings({ provider: p.provider })}>
                <span className={`radio ${on ? "on" : ""}`} />
                <span style={{ flexGrow: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>{p.label}</div>
                  <div className="caption">
                    {p.model} · {p.configured ? "key on server" : settings.apiKeys[p.provider] ? "key on this device" : "no key yet"}
                  </div>
                </span>
              </button>
              {on && !p.configured && (
                <input
                  className="field"
                  style={{ marginBottom: 16 }}
                  type="password"
                  placeholder={`${p.label} API key`}
                  autoComplete="off"
                  value={settings.apiKeys[p.provider] ?? ""}
                  onChange={(e) => store.setSettings({ apiKeys: { ...settings.apiKeys, [p.provider]: e.target.value } })}
                />
              )}
              {on && !hasKey && <div className="caption" style={{ marginBottom: 16 }}>Without a key the app runs in demo mode with sample answers.</div>}
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
