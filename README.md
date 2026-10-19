# Calorie — Nutrition, made personal

A mobile-first nutrition planner and tracker, with DeepSeek as the default AI. One shared composer accepts text, browser speech transcripts, and up to two photos. The rest of the interface presents structured information: Today, My plan, and Progress.

## Use the app

Production URL: https://kakdwa.github.io/caloriecounter/

Open Settings, choose DeepSeek, paste an API key, and save the connection. The key is verified using the provider's models endpoint, without generating tokens. With no key, the app offers a clearly labeled fictional sample. Sample answers are deterministic demonstrations, not estimates of the user's actual food. Personal records are protected from sample-mode writes.

On iPhone, Safari → Share → Add to Home Screen gives a standalone window. Voice availability depends on the browser; keyboard dictation and typing remain available. This app does not provide automatic background notifications or offline AI.

## Features

- Conversational goal setting, deterministic calorie/macro starting targets, food preferences, three practical fallback meals, and a small weekly practice.
- Mixed-intent input: meals, weigh-ins, body measurements, upcoming events, questions, and plan changes in one message.
- Photo attachment with local resizing, stated estimate assumptions, clarification when intent or portions are unclear, and no automatic logging of menus or planned meals.
- Structured proposals before any AI change is saved; corrections, discard, and atomic undo.
- Daily calories and macros, earlier-day meal history, and a meal journal immediately below intake. Corrections use the shared composer; explicit repeat/remove, day-completion and practice controls act instantly with Undo and no AI call.
- A compact input dock expands while composing. Requests report their actual stage beside the input, can be stopped, and preserve the message for retry. Text, attached photos, selected meal and unsaved proposals recover after a refresh in the same tab; storage failures are surfaced.
- Historical meal logging shows its date beside the input and retains that date across navigation and draft recovery. Explicit dates in a message override this default; body measurements do not inherit the journal date.
- Explicit complete-day marking; progress averages use only days the user marks complete. Missing logs are not interpreted as zero intake.
- Weight, BMI, body fat percentage, and lean body mass charts, using actual measurement dates. Body composition may be recorded independently of weight.
- Weekly reviews and reflections, practical adaptations, nonpunitive return after a gap, and practice recognition without deficit rewards or broken streaks.
- Local Apple Health XML import, preview, merge and undo; JSON backup and validated restore. API keys are excluded from backups.
- Daily nutrition JSON in Health Auto Export's metrics shape or an Apple Shortcuts-friendly shape. Optional authenticated server sync sends only daily totals, with a finished-day check and explicit time zone.
- Neutral surfaces, Inter sans-serif typography, a single blue accent and an 8px spacing rhythm. Animated intake totals, progress meters, navigation, photo attachments and saved-meal highlights; reduced-motion support.
- Nutrition web research through the selected provider, with source-linked nutrients, country and serving information, retrieval dates, and explicit estimate fallbacks.
- A fat-loss plan explanation and progress check-in: planned versus observed weight pace, weight-goal progress, complete-day intake/protein comparisons, and one practical next step. Weight change is never labeled as confirmed fat loss.

## Apple Health and smart scales

In Health, open your profile → Export All Health Data. Unzip the download in Files, then choose `apple_health_export/export.xml` in Settings → Apple Health.

The importer streams the file locally and reads only BodyMass, BodyMassIndex, BodyFatPercentage, and LeanBodyMass. It keeps the latest reading for each metric on each recorded local date, converts pounds to kilograms, and converts HealthKit percentage fractions (`0.235`) to displayed percentages (`23.5%`). Body-only dates are retained. Imported values replace matching date/metric values; other records remain. The scale's app must first write these metrics to Apple Health.

**Direct HealthKit sync is not implemented in the browser app.** It requires a native iPhone app with HealthKit entitlements and user authorization. Nutrition can instead be written by an iPhone Shortcut using the daily JSON export described below. No HealthKit connection or permission is implied by importing or downloading a file.

Body fat and lean mass from consumer scales are estimates. The app does not infer them from photos, infer muscle gain from lean-mass fluctuations, or automatically adjust calorie targets based on a reading.

References: [Apple Health export](https://support.apple.com/en-ca/guide/iphone/iph5ede58c3d/ios), [HealthKit](https://developer.apple.com/documentation/healthkit), [Apple percent units](https://developer.apple.com/documentation/healthkit/hkunit/percent()), [NIH body-composition measurement discussion](https://www.ncbi.nlm.nih.gov/books/NBK233766/).

## Privacy and persistence

Records and API keys are saved in this browser's local storage. They are not encrypted by the app and do not sync automatically between devices. Export backups before clearing browser storage.

If you explicitly connect a nutrition server, daily calorie/macro totals, food-log dates, meal counts, completion flags and the chosen time zone are copied to that server while the app is open. Meal names, descriptions, body measurements, AI keys and coaching history are excluded. The nutrition access token stays in separate browser storage and is excluded from backups. Disconnecting stops future uploads but retains previously synced server data. This is a single-source export, not a multi-device backup or conflict-resolution service.

On GitHub Pages, requests go directly to the selected AI provider. With the optional local server, requests pass through that server. Requests include your current message, attached photos, plan, recent meals/measurements, and relevant coaching history. The full Health export is never uploaded; imported measurements may be included in later coaching context. Browser speech recognition may use the browser vendor's speech service.

Restaurant and branded-food requests can trigger online nutrition research. The coach extracts a food-and-market query, excluding personal health details by instruction; that query is sent to the provider's web-search service. Search incurs additional provider usage. No separate search key is required. Search results and page text are treated as untrusted evidence. The app binds source links to actual server search-result blocks and citations; model-generated JSON cannot invent a source URL. Matching a product, serving and nutrient remains AI interpretation, not independent laboratory verification. Failed, uncited, wrong-market or unsupported matches remain estimates.

Images are not saved to the journal or backups. Unsent photos, text, edit context and pending reviews are temporarily kept in this tab's session storage. Photos and text clear after a successful response; the pending review clears when saved or discarded. AI responses are validated before review; nutrition estimates are not a verified food database. The initial targets are estimates, not clinical prescriptions. Under-18, underweight-loss, and declared medical-nutrition situations are routed to professional support rather than an automated calorie prescription.

## Development

```sh
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173. Optional server keys: `DEEPSEEK_API_KEY`, `ANTHROPIC_API_KEY`. A key entered in the app overrides the server key for that provider. DeepSeek is the default. `AI_PROVIDER` can override it on the server.

Provider models are centralized in `shared/catalog.ts`: `deepseek-flash` and `claude-sonnet-5-5`. The DeepSeek adapter uses JSON output and image content parts from the [official Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/). Web research uses the [DeepSeek Anthropic-compatible interface](https://api-docs.deepseek.com/quick_start/agent_integrations/claude_code/#using-web-search-in-claude-code) and the [Anthropic web search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool). It checks for tool-level errors inside HTTP 200 responses, preserves encrypted result blocks on pause continuation, and caps lookup rounds and duration. No paid live-model test is performed without a configured key; automated tests mock the provider transport.

```sh
npm test
npm run build
npm start
```

Every push to `main` runs tests and builds with the repository's Pages base path, then publishes through `.github/workflows/pages.yml`.

## Daily nutrition → Apple Health

Health Auto Export's [REST API automation](https://help.healthyapps.dev/en/health-auto-export/automations/rest-api/) sends data **from Apple Health to a server**. Its documentation does not describe consuming a JSON response and importing it into Health. Returning its JSON shape does not reverse that direction. Use an iPhone Shortcut with **Log Health Sample** to write the four supported nutrition values.

### Without a backend (works on GitHub Pages)

1. Finish a food-log day in Today.
2. Open Settings → Nutrition → Apple Health. Select that date, confirm the time zone and choose **Apple Shortcuts**.
3. Download daily nutrition. On iPhone, save the JSON in Files and select it in your Shortcut.

The alternative **Health Auto Export format** follows its documented [`data.metrics` structure](https://help.healthyapps.dev/en/health-auto-export/export-format/health-metrics/) and [supported nutrition metric names](https://help.healthyapps.dev/en/health-auto-export/getting-started/supported-data/). It is useful for consumers of that format; it is not a Health Auto Export import feature. Sample meals never leave the app through either export. Missing food is not exported as zero intake. Only calories, protein, carbohydrates and total fat are supported; other nutrients are not inferred.

### Run the private backend

GitHub Pages serves static files and cannot execute these routes. Run the existing Node server on a reachable host with a persistent disk. One server/token holds one person's daily totals. Use a single process and one source browser; separate browsers can otherwise replace each other's snapshots. This is not an account system.

1. Generate a token with `openssl rand -hex 32` and put it in the server's `NUTRITION_SYNC_TOKEN` environment variable. Never put it in a `VITE_` variable or a URL.
2. Set `NUTRITION_DATA_FILE` to a private file on the host's persistent disk (default `./data/nutrition.json`, ignored by Git). Data is saved atomically with owner-only file permissions, not encrypted by this app. The directory must be outside the public `dist` folder.
3. Set `NUTRITION_ALLOWED_ORIGINS=https://kakdwa.github.io` to allow the Pages frontend. Multiple exact origins can be comma-separated; no path or trailing slash. Native Shortcuts does not need CORS.
4. Build and run: `npm run build` then `npm start`. Use HTTPS for a public backend. For a same-Wi-Fi experiment, serve the app from the Mac too and use its LAN address; `localhost` on an iPhone means the iPhone, not the Mac. An HTTPS Pages page cannot connect to a plain-HTTP Mac backend.
5. In the app, open **Connect a nutrition server**, enter the server's base address (without `/api/nutrition`), the token and the food-log time zone, then tap **Connect & sync totals**. The app validates the connection before saving it. Only daily totals are uploaded.

The app serializes uploads, retries failed syncs while open and replaces the server snapshot after edits, removals and Undo. It cannot sync a closed browser. Check the last-sync time before importing. Clearing the journal while connected clears its server copy on the next sync. Disconnecting leaves the last server copy intact; delete it with `DELETE /api/nutrition/snapshot`, or remove the private file. Rotate the server token to revoke existing clients.

### Routes

All routes require `Authorization: Bearer YOUR_NUTRITION_TOKEN` and return `Cache-Control: no-store`. Routes are disabled with HTTP 503 when the token is missing or shorter than 32 characters.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/nutrition/status` | Validate the connection; return last-sync timestamp and day count. |
| PUT | `/api/nutrition/snapshot` | Replace all daily totals with the validated snapshot from the app. |
| GET | `/api/nutrition/daily?date=2026-10-18` | Return one finished day's Health Auto Export-style JSON. |
| GET | `/api/nutrition/daily?date=yesterday&format=shortcuts` | Return a day in the simple iPhone Shortcut format. |
| DELETE | `/api/nutrition/snapshot` | Remove the server copy, without changing the browser or Apple Health. Disconnect browser sync first. |

`date` accepts a real `YYYY-MM-DD`, `today` (default) or `yesterday`, resolved in the snapshot's IANA time zone, not the server's zone. `format` accepts `health-auto-export` (default) or `shortcuts`. Missing data returns 404; unfinished days return 409. `includeIncomplete=true` is an explicit diagnostic override, not recommended for Health imports. Invalid input returns 400; wrong tokens 401; disallowed browser origins 403; oversized snapshots 413. There are no token query parameters or unauthenticated health-data URLs.

Example GET response in the default format (illustrative values):

```json
{"data":{"metrics":[
  {"name":"dietary_energy","units":"kcal","data":[{"date":"2026-10-18 12:00:00 +0800","qty":1800}]},
  {"name":"protein","units":"g","data":[{"date":"2026-10-18 12:00:00 +0800","qty":130}]},
  {"name":"carbohydrates","units":"g","data":[{"date":"2026-10-18 12:00:00 +0800","qty":185}]},
  {"name":"total_fat","units":"g","data":[{"date":"2026-10-18 12:00:00 +0800","qty":60}]}
]}}
```

The Shortcut format contains `version`, `source`, `date`, `timeZone`, `sampleDate` (ISO 8601), `complete`, `mealCount`, `syncedAt`, `syncId`, `revision`, `calories`, `proteinG`, `carbsG` and `fatG`. `syncedAt` is null for a local download. Daily totals are timestamped at noon on the food-log date; this is an aggregation timestamp, not a claimed meal time. Historical entries use their journal date even when entered later. DST offsets are calculated for the exported day.

### Build the iPhone Shortcut once

Use the **Apple Shortcuts** JSON format for both methods. Apple's [API request guide](https://support.apple.com/guide/shortcuts/apd58d46713f/ios) explains Get Contents of URL, and its [JSON guide](https://support.apple.com/guide/shortcuts/apd0f2e057df/ios) explains dictionary values.

1. File method: add **Select File**, then **Get Dictionary from Input**. Server method: add **URL** with `https://YOUR_SERVER/api/nutrition/daily?date=yesterday&format=shortcuts`, then **Get Contents of URL** (GET), with header `Authorization` = `Bearer YOUR_NUTRITION_TOKEN`.
2. Get `error` from the dictionary. If it has a value, show it and stop. Also stop unless `complete` is true. Review `date` and, for the server method, `syncedAt`.
3. Create a `Calorie` folder in iCloud Drive. Use **Get File from Folder** to look for `Calorie/<date>.txt` with “Error If Not Found” disabled. If any receipt exists, show “Already imported or needs reconciliation” and stop. Save a Text value `pending` to that exact file **before** any Health writes. This guards both duplicate runs and partial failures. Avoid running simultaneous copies of this Shortcut.
4. Get `sampleDate` and convert it to a Date. Get the four numeric values, then add four **Log Health Sample** actions:

   | Health type | JSON key | Unit |
   | --- | --- | --- |
   | Dietary Energy | `calories` | kcal |
   | Protein | `proteinG` | g |
   | Carbohydrates | `carbsG` | g |
   | Total Fat | `fatG` | g |

   Set each sample's date to the parsed `sampleDate`. Grant the requested Health permissions on your iPhone. Type labels may vary by iOS language.
5. Only after all four actions succeed, overwrite `<date>.txt` with `revision`. The revision stays the same when unchanged data is re-uploaded. Do not use the last-sync timestamp as a deduplication key.
6. Run manually and check Health → Nutrition before enabling a daily personal automation. Fetching yesterday avoids importing an unfinished current day. Ensure the source browser has synced after the last meal and Finish day action.

**Corrections and partial failures:** Shortcuts writes additive Health samples. This backend cannot observe, replace, roll back or deduplicate Health writes on its own. If the log changes or only some of the four writes succeeded, reconcile that date's samples created by this Shortcut in Health before deleting its receipt and rerunning. Do not delete other apps' samples. Refreshing the backend does not modify previously imported Health samples. Reading JSON successfully is not proof of a Health import.

This bridge has automated route/format tests; final Health write permissions and the Shortcut must be verified on a physical iPhone. A future native HealthKit client could provide reliable sample identifiers and update handling.

## Architecture

- `shared/coach.ts`: multi-intent schema, prompting, proposal validation and isolated sample experience.
- `shared/nutrition.ts`: deterministic starting targets; macro energy reconciles to the calorie target within rounding.
- `shared/providers.ts`: provider transports, image payloads, schema validation, timeouts, readable errors.
- `shared/research.ts`: provider-hosted web search, citation validation and source schemas.
- `shared/progress.ts`: transparent progress calculations shared by the dashboard and AI context.
- `shared/state-schema.ts`: validated persisted data and backups, with migration defaults for existing data.
- `src/lib/data.ts`: pure atomic transactions; `store.ts`: persistence and undo; `actions.ts`: explicit deterministic actions; `draft.ts`: validated tab draft recovery.
- `src/lib/health.ts`: streaming Apple Health parser and per-metric daily aggregation.
- `src/components/Composer.tsx`: the single text, voice and photo entry point.
- `src/screens/Workspace.tsx`: Today, Plan and Progress; `BodyTrends.tsx`: body measurement charts.
- `server/index.ts`: optional Hono API. `/api/coach` serves the new interface; older `/api/plan` and `/api/log` routes remain compatible.
- `tests/`: proposal, persistence, nutrition, import and provider contract coverage.

## Design and progress rationale

The visual redesign draws on [Linear's calmer hierarchy](https://linear.app/now/behind-the-latest-design-refresh), [Oura's distinction between daily focus and long-term health](https://ouraring.com/blog/new-app-design/), and [Apple's purposeful motion guidance](https://developer.apple.com/design/human-interface-guidelines/motion). [Duolingo's feedback design](https://blog.duolingo.com/streak-milestone-design-animation/) informs the immediacy of saving and visible progress, without streak loss, deficit rewards or weight-loss celebrations.

The progress check-in follows the [CDC's track–review–adjust approach](https://www.cdc.gov/healthy-weight-growth/losing-weight/). Its two seven-day windows, minimum three readings per window, 0.1 kg/week steady label and next-step thresholds are transparent product heuristics, not clinical diagnostic thresholds. Current-plan dates bound weight comparisons. After calorie or macro targets change, complete-day food averages restart from the change date; earlier food is not compared with the new targets. The original starting weight is preserved across new plan revisions. This is a current-target boundary, not a full target-history timeline. It needs a reading within three days to describe a current trend. Intake averages use only days explicitly marked complete. Smart-scale fat and lean-mass observations remain separate from weight-goal completion; no automatic target adjustment occurs.

`/api/coach` supports newline-delimited progress events when requested with `Accept: application/x-ndjson`. Static hosting runs the same pipeline directly with stage callbacks. Loading labels reflect real pipeline stages, not timers or fabricated search results.


## Product review — 15 October 2026

The core product promise is a short, dependable daily loop: understand today's position, record food with little effort, and know one useful next step. The single composer is for unstructured input. It does not require routing deterministic controls through AI.

| Area | Review finding | Current response / remaining work |
| --- | --- | --- |
| Daily use | Supporting coaching displaced the food journal; the dock consumed too much space. | Intake → meals → support on mobile, compact expanding input, readable labels and larger controls. |
| Routine actions | Completion and practice needed prompt, send, review and save. | One explicit action with immediate feedback and Undo. Repeated meals reuse the same portions; edits remain available in the composer. |
| Recovery | Refresh discarded drafts/reviews; long AI requests had no exit. | Validated tab recovery, genuine request cancellation, visible errors and retained retry input. |
| Time context | A meal entered on an earlier journal day could land on today. | Selected food date is explicit and survives draft recovery. User-stated dates override it. |
| Progress | Next steps were buried in explanations; target changes could distort comparisons. | Next step appears before the detailed breakdown. Original starting weight is retained, current-target food windows are separate, and empty completed days are excluded. |
| First use | API-key acquisition is still a substantial prerequisite. | Connect/sample actions now precede the explanation; connection feedback is beside the key and links directly into personal setup. A managed, optional connection is a future product decision. |
| Nutrition trust | Source links establish provenance, not independently verified numerical accuracy. | Region/portion/nutrient evidence is visible. Real text, photo and restaurant orders still need evaluation against official sources with a configured DeepSeek key. |
| Continuity | Records are device/browser-local; no automatic cloud backup or multi-device synchronization. | Export/restore remain available. Encrypted recovery, conflict-safe multi-tab/device persistence and an offline app shell remain release priorities. |

Interaction choices draw on [Apple's data-entry guidance](https://developer.apple.com/design/human-interface-guidelines/entering-data), [NN/g's user-control and undo guidance](https://www.nngroup.com/articles/user-control-and-freedom/), [Oura's focus on a few clear destinations](https://ouraring.com/blog/new-oura-app-experience/), and [Linear's calmer hierarchy](https://linear.app/now/behind-the-latest-design-refresh). These are design references, not evidence that this app improves health outcomes.

Before calling the product ready for a broad audience:

1. Evaluate real DeepSeek outputs: goal setup, ambiguous portions, restaurant markets, mixed text/photo input, corrections, and search outages. Track nutrient errors and unsupported source claims, along with latency and cost. A valid key check alone does not validate these capabilities.
2. Observe target users completing first-plan setup, meal logging, a correction, a return after a gap, and a weekly review on physical phones. Measure time to a first useful plan, taps to repeat/correct a meal, task completion and recovery from errors. Treat a sub-20-second familiar-meal visit as a design target, not an achieved study result.
3. Strengthen continuity and delivery: recoverable storage with conflict handling, optional secure sync, tested offline behavior, and real iPhone keyboard/dictation/accessibility checks. Keep HealthKit/native work separate until it is intentionally resumed.
4. Consolidate legacy screens and accumulated style overrides before adding more UI. Motion should confirm the actual action—saved food, changed totals, completed practice—and respect reduced motion. Retention should come from usefulness and supportive return paths, without penalties for missed days or rewards for eating less.

Verification in this review includes automated proposal/data/provider tests, desktop and 320/390px browser walkthroughs, reload recovery, historical logging, deterministic actions and Undo. An isolated local streaming fixture checks Stop, failed requests and successful retry without contacting an AI provider. This does not substitute for live-model accuracy tests, a physical iPhone test or a user study.
