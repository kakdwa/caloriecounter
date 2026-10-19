import { useEffect, useRef, useState } from "react";
import type { Provider, ProviderStatus, WeighIn } from "../../shared/types";
import { checkKey, type Mode } from "../lib/api";
import { PROVIDERS } from "../../shared/catalog";
import { store, useStore } from "../lib/store";
import type { Data } from "../lib/data";
import { BackupSchema } from "../../shared/state-schema";
import { readHealthMeasurements, type HealthImport } from "../lib/health";
import { localDate, shortDate } from "../lib/format";
import { AutoHeight, SwitchPanel } from "../components/Motion";
import { Sheet } from "../components/Sheet";
import { NutritionConnection } from "../components/NutritionConnection";
interface Props {
  initialArea?: "ai" | "health" | "data";
  providers: ProviderStatus[] | null;
  serverDefault: Provider;
  mode: Mode;
  onClose: () => void;
  onReset: () => void;
  onDataChanged: () => void;
  onConnected: () => void;
}
export function Settings({
  initialArea = "ai",
  providers,
  serverDefault,
  mode,
  onClose,
  onReset,
  onDataChanged,
  onConnected,
}: Props) {
  const state = useStore();
  const [area, setArea] = useState(initialArea);
  const active = state.settings.provider ?? serverDefault;
  const [provider, setProvider] = useState<Provider>(active),
    [key, setKey] = useState(state.settings.apiKeys[active] ?? ""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [connectionMessage, setConnectionMessage] = useState(""),
    [connectionError, setConnectionError] = useState(""),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false),
    [weights, setWeights] = useState<HealthImport | null>(null),
    [canUndo, setCanUndo] = useState(false),
    [backup, setBackup] = useState<Data | null>(null);
  const healthFile = useRef<HTMLInputElement>(null),
    backupFile = useRef<HTMLInputElement>(null),
    feedback = useRef<HTMLDivElement>(null),
    preview = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = weights || backup ? preview.current : message || error ? feedback.current : null;
    target?.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [weights, backup, message, error]);
  function choose(p: Provider) {
    setProvider(p);
    setKey(state.settings.apiKeys[p] ?? "");
    setMessage("");
    setError("");
    setConnectionMessage("");
    setConnectionError("");
  }
  async function saveKey() {
    setBusy(true);
    setConnectionError("");
    setConnectionMessage("");
    try {
      if (key.trim()) {
        const r = await checkKey(provider, key.trim());
        if (!r.ok) throw new Error(r.message);
      }
      store.setSettings({
        provider,
        apiKeys: { ...state.settings.apiKeys, [provider]: key.trim() },
      });
      setConnectionMessage(
        key.trim()
          ? `${PROVIDERS[provider].label} accepted your key. Ready for your first message.`
          : "Key removed from this browser.",
      );
    } catch (e) {
      setConnectionError(
        e instanceof Error ? e.message : "Could not connect. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  function download() {
    const { settings: _, ...data } = state;
    const blob = new Blob(
      [
        JSON.stringify(
          { version: 2, exportedAt: new Date().toISOString(), data },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `calorie-backup-${localDate()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importFile(file: File | undefined, kind: "health" | "backup") {
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (kind === "health") {
        if (state.plan?.demo)
          throw new Error(
            "Create your personal plan before importing real Apple Health measurements. Sample and personal data stay separate.",
          );
        setWeights(await readHealthMeasurements(file));
        setBackup(null);
      } else {
        if (file.size > 20 * 1024 * 1024)
          throw new Error("Choose a backup smaller than 20 MB.");
        const parsed = BackupSchema.safeParse(JSON.parse(await file.text()));
        if (!parsed.success)
          throw new Error(
            "This file is not a valid Calorie backup. Nothing was changed.",
          );
        setBackup(parsed.data.data);
        setWeights(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read this file.");
    } finally {
      setBusy(false);
      if (healthFile.current) healthFile.current.value = "";
      if (backupFile.current) backupFile.current.value = "";
    }
  }
  function saveImport() {
    try {
      if (weights) {
        const merged = new Map(state.weighIns.map((w) => [w.date, w]));
        for (const w of weights.weighIns) merged.set(w.date, w);
        const metrics = new Map(state.bodyMetrics.map((m) => [m.date, m]));
        for (const m of weights.bodyMetrics)
          metrics.set(m.date, { ...metrics.get(m.date), ...m });
        store.restore({
          ...state,
          bodyMetrics: [...metrics.values()].sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
          weighIns: [...merged.values()].sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
        });
        setMessage(
          `${weights.weighIns.length} weight days and ${weights.bodyMetrics.length} body-composition days imported.`,
        );
        setWeights(null);
      } else if (backup) {
        store.restore(backup);
        setBackup(null);
        setMessage("Your backup has been restored.");
      }
      setCanUndo(true);
      onDataChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
  }
  return (
    <Sheet onClose={onClose}>{closeSheet => <>
      <div className="section-top">
        <div>
          <h2>Settings</h2>
        </div>
        <button
          className="close-button"
          aria-label="Close settings"
          onClick={() => closeSheet()}
        >
          ×
        </button>
      </div>
      <nav className="settings-nav" aria-label="Settings sections" style={{ "--settings-tab": ["ai", "health", "data"].indexOf(area) } as React.CSSProperties}><span className="settings-nav-indicator" aria-hidden="true" />{(["ai", "health", "data"] as const).map(tab => <button key={tab} aria-pressed={area === tab} onClick={() => setArea(tab)}>{tab === "ai" ? "Your AI" : tab === "health" ? "Apple Health" : "Your data"}</button>)}</nav>
      <AutoHeight className="settings-panels"><SwitchPanel active={area === "ai"}>
      <section className="settings-section">
        <h3>Your AI</h3>
        <p className="caption">
          DeepSeek understands your meals, photos and plans. Your key is saved
          on this device.
        </p>
        <div className="provider-options">
          {(["deepseek", "anthropic"] as Provider[]).map((p) => (
            <button
              disabled={busy}
              className={provider === p ? "selected" : ""}
              aria-pressed={provider === p}
              key={p}
              onClick={() => choose(p)}
            >
              {PROVIDERS[p].label}
              {p === "deepseek" && <span>Recommended</span>}
            </button>
          ))}
        </div>
        <label className="small-label" htmlFor="api-key">
          {PROVIDERS[provider].label} API KEY
        </label>
        <input
          id="api-key"
          className="field"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={key}
          disabled={busy}
          placeholder={
            providers?.find((p) => p.provider === provider)?.configured
              ? "Server key available"
              : "Paste your API key"
          }
          onChange={(e) => setKey(e.target.value)}
        />
        <div className="section-top mt-16">
          <a
            className="text-link"
            href={PROVIDERS[provider].keysUrl}
            target="_blank"
            rel="noreferrer"
          >
            Get a key ↗
          </a>
          <button
            className="small-btn"
            disabled={busy}
            onClick={() => void saveKey()}
          >
            {busy ? "Working…" : "Save connection"}
          </button>
        </div>
        {connectionError && <p className="error" role="alert">{connectionError}</p>}
        {connectionMessage && <div className="connection-success" role="status"><p>{connectionMessage}</p>{!!key.trim() && <button className="text-link" onClick={() => closeSheet(onConnected)}>{!state.plan || state.plan.demo ? "Create my personal plan" : "Back to my coach"} ↗</button>}</div>}
        <p className="caption">
          {mode === "direct"
            ? "Messages, attached photos and relevant history go directly to your chosen AI provider."
            : "Messages, photos and relevant history pass through this app's server to your chosen AI provider."}{" "}
          Keys are stored in browser storage, not included in backups. Voice
          uses your browser's speech service.
        </p>
        <p className="caption">
          Restaurant nutrition can be searched online using this same key.
          Searches add provider usage. Source links and estimates appear in your review.
        </p>
      </section>
      </SwitchPanel><SwitchPanel active={area === "health"}>
      <section className="settings-section">
        <div className="section-top">
          <h3>Import body measurements</h3>
          <span className="tag">Body measurements</span>
        </div>
        <p className="caption">
          In Health, tap your profile → Export All Health Data. Unzip the export
          in Files, then select export.xml. Only weight, BMI, body fat and lean
          body mass records are read, on this device.
        </p>
        <button
          className="secondary full"
          disabled={busy}
          onClick={() => healthFile.current?.click()}
        >
          Import health measurements ↗
        </button>
        <input
          ref={healthFile}
          hidden
          type="file"
          accept=".xml,text/xml,application/xml"
          onChange={(e) => void importFile(e.target.files?.[0], "health")}
        />
        <p className="caption">
          Direct HealthKit syncing needs a native iPhone app. Imported measurements can
          become part of the context sent to your AI when you ask for coaching.
        </p>
      </section>
      <NutritionConnection />
      </SwitchPanel><SwitchPanel active={area === "data"}>
      <section className="settings-section">
        <h3>Your data, in your hands</h3>
        <p className="caption">
          Saved in this browser, without an account or automatic cloud backup.
        </p>
        <div className="row gap-8">
          <button
            className="secondary"
            disabled={Boolean(store.storageError())}
            onClick={download}
          >
            Export backup
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => backupFile.current?.click()}
          >
            Restore backup
          </button>
        </div>
        <input
          hidden
          ref={backupFile}
          type="file"
          accept="application/json,.json"
          onChange={(e) => void importFile(e.target.files?.[0], "backup")}
        />
      </section>
      </SwitchPanel></AutoHeight>
      {(weights || backup) && (
        <div className="import-preview" ref={preview}>
          <span className="small-label">REVIEW IMPORT</span>
          {weights ? (
            <>
              <h3>Your health measurements</h3>
              <p className="caption">
                {weights.weighIns.length} weight days ·{" "}
                {weights.bodyMetrics.length} body-composition days. The latest
                value for each measurement on each day is used. Imported values
                replace matching values for that date; other measurements stay
                unchanged.
              </p>
              <div className="import-weights">
                {weights.weighIns.slice(-5).map((w) => (
                  <div className="section-top" key={w.date}>
                    <span>{shortDate(w.date)}</span>
                    <strong>{w.weightKg} kg</strong>
                  </div>
                ))}
                {weights.bodyMetrics.slice(-5).map((m) => (
                  <div className="import-body" key={m.date}>
                    <span>{shortDate(m.date)}</span>
                    <span>
                      {m.bmi != null && `BMI ${m.bmi} · `}
                      {m.bodyFatPercent != null &&
                        `${m.bodyFatPercent}% fat · `}
                      {m.leanBodyMassKg != null &&
                        `${m.leanBodyMassKg} kg lean mass`}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h3>Replace this device's data?</h3>
              <p className="caption">
                {backup!.entries.length} meals, {backup!.weighIns.length}{" "}
                weigh-ins, and {backup!.plan ? "a saved plan" : "no plan"}. This
                replaces existing records. API keys are preserved.
              </p>
            </>
          )}
          <div className="row gap-8">
            <button className="btn" onClick={saveImport}>
              Confirm import
            </button>
            <button
              className="secondary"
              onClick={() => {
                setWeights(null);
                setBackup(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {canUndo && (
        <button
          className="text-link"
          onClick={() => {
            try {
              store.undo();
              setCanUndo(false);
              setMessage("Import undone.");
              onDataChanged();
            } catch (e) {
              setError(String(e));
            }
          }}
        >
          Undo last import
        </button>
      )}
      <div ref={feedback}>{error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="connection-success" role="status">
          {message}
        </p>
      )}</div>
      <div className="settings-bottom">
        {confirm ? (
          <>
            <p>
              Erase this browser's plan, meals and progress? Your AI key will
              stay connected.
            </p>
            <div className="row gap-16">
              <button
                className="text-link danger"
                onClick={() => {
                  try {
                    onReset();
                    closeSheet();
                  } catch (e) {
                    setError(String(e));
                  }
                }}
              >
                Erase my data
              </button>
              <button className="text-link" onClick={() => setConfirm(false)}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <button className="text-link muted" onClick={() => setConfirm(true)}>
            Start over
          </button>
        )}
        <button className="text-link" onClick={() => closeSheet()}>
          Done
        </button>
      </div>
    </>}</Sheet>
  );
}
