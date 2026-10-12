# Calorie — a little, every day

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
- Daily calories and macros, earlier-day meal history, corrections and removal through the same composer.
- Explicit complete-day marking; progress averages use only days the user marks complete. Missing logs are not interpreted as zero intake.
- Weight, BMI, body fat percentage, and lean body mass charts, using actual measurement dates. Body composition may be recorded independently of weight.
- Weekly reviews and reflections, practical adaptations, nonpunitive return after a gap, and practice recognition without deficit rewards or broken streaks.
- Local Apple Health XML import, preview, merge and undo; JSON backup and validated restore. API keys are excluded from backups.
- Sky-blue design, serif/sans typography, 8px spacing, accessible dialogs, and reduced-motion support.

## Apple Health and smart scales

In Health, open your profile → Export All Health Data. Unzip the download in Files, then choose `apple_health_export/export.xml` in Settings → Apple Health.

The importer streams the file locally and reads only BodyMass, BodyMassIndex, BodyFatPercentage, and LeanBodyMass. It keeps the latest reading for each metric on each recorded local date, converts pounds to kilograms, and converts HealthKit percentage fractions (`0.235`) to displayed percentages (`23.5%`). Body-only dates are retained. Imported values replace matching date/metric values; other records remain. The scale's app must first write these metrics to Apple Health.

**Automatic sync is not implemented in the browser app.** It requires a native iPhone app with HealthKit entitlements and user authorization. No HealthKit connection or permission is implied by importing a file.

Body fat and lean mass from consumer scales are estimates. The app does not infer them from photos, infer muscle gain from lean-mass fluctuations, or automatically adjust calorie targets based on a reading.

References: [Apple Health export](https://support.apple.com/en-ca/guide/iphone/iph5ede58c3d/ios), [HealthKit](https://developer.apple.com/documentation/healthkit), [Apple percent units](https://developer.apple.com/documentation/healthkit/hkunit/percent()), [NIH body-composition measurement discussion](https://www.ncbi.nlm.nih.gov/books/NBK233766/).

## Privacy and persistence

Records and API keys are saved in this browser's local storage. They are not encrypted by the app and do not sync automatically between devices. Export backups before clearing browser storage.

On GitHub Pages, requests go directly to the selected AI provider. With the optional local server, requests pass through that server. Requests include your current message, attached photos, plan, recent meals/measurements, and relevant coaching history. The full Health export is never uploaded; imported measurements may be included in later coaching context. Browser speech recognition may use the browser vendor's speech service.

Images are not saved to the journal or backups. AI responses are validated before review; nutrition estimates are not a verified food database. The initial targets are estimates, not clinical prescriptions. Under-18, underweight-loss, and declared medical-nutrition situations are routed to professional support rather than an automated calorie prescription.

## Development

```sh
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173. Optional server keys: `DEEPSEEK_API_KEY`, `ANTHROPIC_API_KEY`. A key entered in the app overrides the server key for that provider. DeepSeek is the default. `AI_PROVIDER` can override it on the server.

Provider models are centralized in `shared/catalog.ts`: `deepseek-flash` and `claude-sonnet-5-5`. The DeepSeek adapter uses JSON output and image content parts from the [official Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/). No paid live-model test is performed without a configured key; automated tests mock the provider transport.

```sh
npm test
npm run build
npm start
```

Every push to `main` runs tests and builds with the repository's Pages base path, then publishes through `.github/workflows/pages.yml`.

## Architecture

- `shared/coach.ts`: multi-intent schema, prompting, proposal validation and isolated sample experience.
- `shared/nutrition.ts`: deterministic starting targets; macro energy reconciles to the calorie target within rounding.
- `shared/providers.ts`: provider transports, image payloads, schema validation, timeouts, readable errors.
- `shared/state-schema.ts`: validated persisted data and backups, with migration defaults for existing data.
- `src/lib/data.ts`: pure atomic transactions; `store.ts`: persistence and undo.
- `src/lib/health.ts`: streaming Apple Health parser and per-metric daily aggregation.
- `src/components/Composer.tsx`: the single text, voice and photo entry point.
- `src/screens/Workspace.tsx`: Today, Plan and Progress; `BodyTrends.tsx`: body measurement charts.
- `server/index.ts`: optional Hono API. `/api/coach` serves the new interface; older `/api/plan` and `/api/log` routes remain compatible.
- `tests/`: proposal, persistence, nutrition, import and provider contract coverage.
