import { useEffect, useState } from "react";
import type { Plan, Provider, ProviderStatus } from "../shared/types";
import { getProviders, parseLog, ApiError, type Mode } from "./lib/api";
import { localDate } from "./lib/format";
import { store, uid, useStore } from "./lib/store";
import { totals } from "./lib/totals";
import { Goal } from "./screens/Goal";
import { PlanScreen } from "./screens/PlanScreen";
import { Today } from "./screens/Today";
import { LogScreen, type LogState } from "./screens/LogScreen";
import { Progress } from "./screens/Progress";
import { Settings } from "./screens/Settings";

type Screen = "goal" | "plan" | "today" | "log" | "progress";

export default function App() {
  const { plan, entries, weighIns, settings } = useStore();
  const [screen, setScreen] = useState<Screen>(plan ? "today" : "goal");
  const [planIsNew, setPlanIsNew] = useState(!plan);
  const [log, setLog] = useState<LogState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [providers, setProviders] = useState<ProviderStatus[] | null>(null);
  const [serverDefault, setServerDefault] = useState<Provider>("deepseek");
  const [mode, setMode] = useState<Mode>("server");

  useEffect(() => {
    getProviders()
      .then((r) => {
        setProviders(r.providers);
        setServerDefault(r.default);
        setMode(r.mode);
      })
      .catch(() => setProviders([]));
  }, []);

  // Demo mode: the active provider has no key on the server and none on this device.
  const activeProvider = settings.provider ?? serverDefault;
  const activeStatus = providers?.find((p) => p.provider === activeProvider);
  const demo = providers !== null && !(activeStatus?.configured || Boolean(settings.apiKeys[activeProvider]?.trim()));

  const today = localDate();
  const todaysEntries = entries.filter((e) => e.date === today);
  const sum = totals(todaysEntries);
  const remainingKcal = plan ? plan.targets.calories - sum.kcal : 0;
  const remainingProteinG = plan ? plan.targets.proteinG - sum.proteinG : 0;

  async function runLog(text: string, previous?: LogState) {
    if (!plan) return;
    const prevItems = previous?.result?.kind === "meal" ? previous.result.items : undefined;
    const shown = prevItems ? `${previous!.text} — ${text}` : text;
    setLog({ text: shown, status: "loading" });
    setScreen("log");
    try {
      const res = await parseLog(text, { remainingKcal, remainingProteinG, unit: plan.profile.unit }, prevItems);
      setLog({ text: shown, status: "ready", result: res });
    } catch (e) {
      setLog({ text: shown, status: "error", error: e instanceof ApiError ? e.message : "Something went wrong. Try again." });
    }
  }

  function addLog() {
    const r = log?.result;
    if (!r || r.kind === "unclear") return;
    if (r.kind === "meal") {
      store.addEntry({ id: uid(), date: today, time: new Date().toISOString(), text: log!.text, items: r.items });
    } else {
      store.addWeighIn({ date: today, weightKg: r.weightKg });
    }
    setLog(null);
    setScreen(r.kind === "weight" ? "progress" : "today");
  }

  function onPlan(p: Plan) {
    store.setPlan(p);
    setPlanIsNew(true);
    setScreen("plan");
  }

  return (
    <>
      {screen === "goal" && <Goal onPlan={onPlan} demo={demo} onSettings={() => setSettingsOpen(true)} />}
      {screen === "plan" && plan && (
        <PlanScreen
          plan={plan}
          isNew={planIsNew}
          onStart={() => {
            setPlanIsNew(false);
            setScreen("today");
          }}
          onUpdate={(p) => store.setPlan(p)}
          onBack={() => setScreen("today")}
          onSettings={() => setSettingsOpen(true)}
        />
      )}
      {screen === "today" && plan && (
        <Today
          plan={plan}
          entries={todaysEntries}
          demo={demo}
          onLog={(t) => runLog(t)}
          onProgress={() => setScreen("progress")}
          onPlan={() => {
            setPlanIsNew(false);
            setScreen("plan");
          }}
          onSettings={() => setSettingsOpen(true)}
          onRemove={(id) => store.removeEntry(id)}
        />
      )}
      {screen === "log" && plan && log && (
        <LogScreen
          plan={plan}
          state={log}
          remainingKcal={remainingKcal}
          remainingProteinG={remainingProteinG}
          onCorrect={(t) => runLog(t, log.status === "ready" ? log : undefined)}
          onAdd={addLog}
          onBack={() => {
            setLog(null);
            setScreen("today");
          }}
        />
      )}
      {screen === "progress" && plan && (
        <Progress plan={plan} entries={entries} weighIns={weighIns} onBack={() => setScreen("today")} onLog={(t) => runLog(t)} />
      )}
      {settingsOpen && (
        <Settings
          providers={providers}
          serverDefault={serverDefault}
          mode={mode}
          onClose={() => setSettingsOpen(false)}
          onReset={() => {
            store.reset();
            setSettingsOpen(false);
            setLog(null);
            setPlanIsNew(true);
            setScreen("goal");
          }}
        />
      )}
    </>
  );
}
