import { Disclosure } from "./Motion";
import { useState } from "react";
import { nutritionSnapshot, healthAutoExport, shortcutNutrition } from "../../shared/nutrition-export";
import { connectNutrition, disconnectNutrition, nutritionEndpoint, syncNutrition, useNutritionSync } from "../lib/nutrition-sync";
import { store, useStore } from "../lib/store";
import { addDays, localDate } from "../lib/format";

export function NutritionConnection() {
  const state = useStore();
  const sync = useNutritionSync();
  const [url, setUrl] = useState(sync.connection?.url ?? "");
  const [token, setToken] = useState(sync.connection?.token ?? "");
  const [timeZone, setTimeZone] = useState(sync.connection?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [date, setDate] = useState(localDate());
  const [format, setFormat] = useState("shortcuts");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function connect() {
    setBusy(true); setError(""); setMessage("");
    try { await connectNutrition(url, token, timeZone); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not save the connection."); }
    finally { setBusy(false); }
  }
  function download() {
    setError(""); setMessage("");
    try {
      if (store.storageError()) throw new Error(store.storageError());
      const snapshot = nutritionSnapshot(state.entries, state.completedDays, timeZone);
      const day = snapshot.days.find(day => day.date === date);
      if (!day) throw new Error("No personal food is logged for this date. Sample meals are not exported.");
      if (!day.complete) throw new Error("Finish this day in Today before exporting it to Apple Health.");
      const result = format === "shortcuts" ? shortcutNutrition(day, timeZone, null) : healthAutoExport(day, timeZone);
      const objectUrl = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = objectUrl; a.download = `calorie-nutrition-${date}-${format}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setMessage("JSON downloaded. Import it with your iPhone Shortcut to write to Apple Health.");
    } catch (error) { setError(error instanceof Error ? error.message : "Could not export nutrition."); }
  }
  return <section className="settings-section nutrition-connection">
    <div className="section-top"><h3>Nutrition → Apple Health</h3><span className="tag">Via Shortcuts</span></div>
    <p className="caption">Send daily calories, protein, carbs and fat to an iPhone Shortcut. Health Auto Export exports from Health; it does not provide a documented import into Health.</p>
    <label className="small-label" htmlFor="nutrition-date">FOOD LOG DATE</label>
    <input id="nutrition-date" className="field" type="date" max={localDate()} value={date} onChange={e => setDate(e.target.value)} />
    <div className="row gap-8 mt-16"><button className="small-btn" aria-pressed={date === addDays(localDate(), -1)} onClick={() => setDate(addDays(localDate(), -1))}>Yesterday</button><button className="small-btn" aria-pressed={date === localDate()} onClick={() => setDate(localDate())}>Today</button></div>
    <label className="small-label" htmlFor="nutrition-zone">FOOD LOG TIME ZONE</label>
    <input id="nutrition-zone" className="field" value={timeZone} onChange={e => setTimeZone(e.target.value)} placeholder="Asia/Shanghai" spellCheck={false} />
    <label className="small-label" htmlFor="nutrition-format">JSON FORMAT</label>
    <select id="nutrition-format" className="field" value={format} onChange={e => setFormat(e.target.value)}>
      <option value="shortcuts">Apple Shortcuts</option><option value="health-auto-export">Health Auto Export format</option>
    </select>
    <button className="secondary full mt-16" onClick={download}>Download daily nutrition</button>
    <p className="caption">Finish the selected day first. This works without a backend and excludes all sample meals. Downloading a file does not write to Health.</p>
    <Disclosure className="nutrition-setup" title={<>Connect a nutrition server</>}>
      <p className="caption">Use one browser as the source for this connection. Its daily totals replace the server copy, including edits and deletions, while Calorie is open. Your AI keys, meal descriptions and body measurements stay out of this sync.</p>
      <label className="small-label" htmlFor="nutrition-server">SERVER ADDRESS</label>
      <input id="nutrition-server" className="field" type="url" placeholder="https://your-server.example" value={url} onChange={e => setUrl(e.target.value)} autoCapitalize="none" spellCheck={false} />
      <label className="small-label" htmlFor="nutrition-token">NUTRITION ACCESS TOKEN</label>
      <input id="nutrition-token" className="field" type="password" value={token} onChange={e => setToken(e.target.value)} autoComplete="off" placeholder="Token from your backend settings" />
      <p className="caption">GitHub Pages cannot run this server. The token is stored on this device and excluded from backups. A public server must use HTTPS.</p>
      <button className="small-btn" disabled={busy || !url.trim() || token.trim().length < 32} onClick={() => void connect()}>{busy ? "Checking connection…" : "Connect & sync totals"}</button>
      {sync.connection && <>
        <div className="row gap-16 mt-16"><button className="text-link" disabled={sync.phase === "syncing"} onClick={() => syncNutrition()}>Sync now</button><button className="text-link" onClick={() => { try { disconnectNutrition(); setToken(""); } catch { setError("Could not remove the saved connection."); } }}>Disconnect</button></div>
        <p className="caption">Shortcut URL (GET). Use the access token in the Authorization header.</p>
        <code className="nutrition-url">{nutritionEndpoint(sync.connection, "daily?date=yesterday&format=shortcuts")}</code>
      </>}
    </Disclosure>
    <Disclosure className="nutrition-setup" title={<>Set up the iPhone Shortcut</>}>
      <ol className="caption">
        <li>In Shortcuts, choose a downloaded JSON file and use Get Dictionary from Input. For a server connection, use Get Contents of URL with the URL above and the header <code>Authorization: Bearer YOUR_TOKEN</code>.</li>
        <li>Stop if the response contains <code>error</code> or if <code>complete</code> is not true.</li>
        <li>Check a saved receipt for this <code>date</code> in an iCloud Drive folder named Calorie. If one exists, stop. Write a “pending” receipt before logging anything.</li>
        <li>Add four Log Health Sample actions: Dietary Energy = <code>calories</code> kcal, Protein = <code>proteinG</code> g, Carbohydrates = <code>carbsG</code> g, Total Fat = <code>fatG</code> g. Use <code>sampleDate</code> as the date for each action. Allow Health access when prompted.</li>
        <li>After all four succeed, replace the receipt with <code>revision</code>. Run manually first; then you can add a daily automation for yesterday’s finished log.</li>
      </ol>
      <p className="caption">The receipt prevents accidental repeats. If an import fails partway or the food log changes, reconcile that day’s Calorie imports in Health before removing its receipt and rerunning. Never remove records from other sources. A server sync does not update previously imported Health samples.</p>
      <a className="text-link" href="https://support.apple.com/guide/shortcuts/apd58d46713f/ios" target="_blank" rel="noreferrer">Apple’s guide to API requests ↗</a>
    </Disclosure>
    {error && <p className="error" role="alert">{error}</p>}
    {message && <p className="caption" role="status">{message}</p>}
    {sync.message && <p className={sync.phase === "error" ? "error" : "caption"} role={sync.phase === "error" ? "alert" : "status"}>{sync.message}{sync.syncedAt && sync.phase === "synced" ? ` Last synced ${new Date(sync.syncedAt).toLocaleString()}. Not yet a confirmation of import into Apple Health.` : ""}</p>}
  </section>;
}
