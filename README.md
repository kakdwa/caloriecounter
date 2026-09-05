# Calorie Tracker

An AI-native calorie and macro tracker for your phone. You describe yourself and your goal in a sentence, the app turns it into a plan. You say what you ate, it turns that into calories and macros. No forms.

## Run it

```bash
npm install
cp .env.example .env   # add a DeepSeek or Anthropic key
npm run dev
```

Open http://localhost:5173 on your phone (same Wi-Fi: run `npx vite --host` and use your computer's IP) or in a desktop browser at phone width. Add it to your home screen for a full-screen app.

Without a key the app runs in **demo mode** with sample answers, so you can click through everything before paying for a model.

## Choosing the AI

Two providers are supported. Tap the gear on the first screen, the **Demo** tag on Today, or **Your plan → AI settings** to pick one and paste your key. **Check** verifies the key without spending tokens.

| Provider | Model | Key |
|---|---|---|
| DeepSeek (default) | `deepseek-chat` | `DEEPSEEK_API_KEY` |
| Claude | `claude-opus-5` | `ANTHROPIC_API_KEY` |

Keys entered in the app stay in the browser's local storage and are only ever sent to your own server. Alternatively put them in `.env` on the server so every device shares them; a key entered in the app overrides the server's. `AI_PROVIDER=anthropic` in `.env` changes the server default.

## How it works

- **Plan.** The model extracts a profile (age, height, weight, activity, goal, target date, preferences) from your text. The numbers are then computed deterministically: Mifflin-St Jeor for resting burn, an activity multiplier, a rate of change clamped to a safe range, protein by goal, fat as a floor, carbs as the remainder. The model only writes the explanatory copy, so it can never invent a calorie target.
- **Log.** Your sentence becomes a list of items with estimates and stated assumptions. Correcting is another sentence ("half the salad"). Weigh-ins go in the same box ("181.2 this morning").
- **Progress.** This week's intake against your goal, your weight trend, and a projection from the trend once there are three weigh-ins.

All data is stored in the browser's local storage. Nothing leaves your device except the text you send to the model.

## Production

```bash
npm run build
npm start        # serves dist/ and the API on API_PORT (default 8787)
```

## Layout

- `server/` Hono API: `/api/plan`, `/api/log`, `/api/providers`. `ai.ts` holds the provider adapters, `nutrition.ts` the math.
- `shared/types.ts` types shared by client and server.
- `src/` React app: `screens/` one file per screen, `lib/` storage, API client, speech, formatting.
- `design/` the original design canvas and the script that generates it.
