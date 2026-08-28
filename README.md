# Orbis

**Enter the world. Speak the language.**

Orbis is an AI language-immersion app. You step into everyday situations — a bakery, a landlord call, a city office — and talk to characters in your target language. Speak or type. The character replies in that language, at your CEFR level.

The point is not drills. The point is to **learn by living**.

## What you can do

- Choose a language, then a level from **A1 to C1**
- Play missions in housing, city life, work, and everyday scenes
- Speak or type in the same conversation
- Get a pre-send check for spelling and grammar (typed messages)
- Complete a session when the required objectives are actually done
- See scores, streaks, weak areas, and spaced reviews
- Sign in with Google (optional). Progress is still tied to a learner id

Pages: **Dashboard**, **Missions**, **Progress**, **Completed**, **Reviews**.

## Stack

| Piece | What Orbis uses |
| --- | --- |
| App | Next.js 16 (App Router), React 19, TypeScript |
| UI | Tailwind CSS 4 |
| Validation | Zod |
| Conversation & evaluation | Anthropic Claude (official SDK, server-only) |
| Background jobs | Inngest (session evaluation). If publish fails, evaluation can run inline |
| Auth | Auth.js (NextAuth v5) with Google |
| Data | JSON files locally; **Postgres on Vercel** (`postgres` + Neon / Vercel Postgres) |
| Tests | Vitest |
| Native (optional) | Tauri 2 Android / desktop WebView — same UI, remote `/api` |

Claude keys, Inngest keys, Google secrets, and the database URL stay on the server. Never use `NEXT_PUBLIC_` for those.

```
Browser  →  Next.js UI  →  /api  →  Next.js server  →  Claude, Postgres, Inngest
```

Android/Tauri uses the same client, pointed at a deployed backend via `NEXT_PUBLIC_API_BASE_URL`. Do not put the Next.js server, Claude SDK, or Inngest inside the APK.

## Run locally

```bash
npm install
cp .env.example .env.local
```

Set `ANTHROPIC_API_KEY` in `.env.local`. Leave `DATABASE_URL` empty to store data as JSON under `./data`.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

In a second terminal (needed for queued evaluation; complete-session still works if this is down):

```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

`npm run build` builds the **full** Next.js server, including `/api`. It is not a static export.

## Deploy on Vercel

Local JSON files **do not work** on Vercel (read-only disk). Mission clicks fail with a 500 until Postgres is set.

1. Deploy the Next.js app.
2. Add a **Neon** or **Vercel Postgres** database.
3. Set environment variables (Production):

| Variable | Required |
| --- | --- |
| `ANTHROPIC_API_KEY` | Yes |
| `DATABASE_URL` or `POSTGRES_URL` | Yes on Vercel |
| `AUTH_SECRET` | Yes if Google sign-in is used |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Yes if Google sign-in is used |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | For Inngest Cloud |

The app reads a database URL in this order: `POSTGRES_URL`, then `DATABASE_URL`, then `POSTGRES_PRISMA_URL`. Vercel Postgres usually sets `POSTGRES_URL`.

Add the production site to the Google OAuth callback list, for example:

`https://your-app.vercel.app/api/auth/callback/google`

Hobby plans cap serverless functions at about 10 seconds. Opening a scene calls Claude; a Pro plan (or longer `maxDuration`) is more reliable.

## Environment variables

Copy from `.env.example`. Server secrets must never go to the browser, Tauri, or Android.

### Server

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude. Required to start a mission. |
| `ANTHROPIC_MODEL` | Optional model id. |
| `DATABASE_URL` | Postgres. Required on Vercel. |
| `POSTGRES_URL` | Same as above; used first if set. |
| `ORBIS_DATA_DIR` | Local JSON root (default `./data`). Ignored when a database URL is set. |
| `INNGEST_EVENT_KEY` | Inngest events. |
| `INNGEST_SIGNING_KEY` | Inngest signing. |
| `INNGEST_DEV` | `1` for the local Inngest Dev Server. |
| `AUTH_SECRET` | Auth.js secret. |
| `AUTH_GOOGLE_ID` | Google OAuth client id. |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret. |
| `ORBIS_CORS_ORIGINS` | Extra allowed origins for `/api` (Tauri / custom hosts). |

Do not create `NEXT_PUBLIC_ANTHROPIC_API_KEY` or public Inngest keys.

### Client / Tauri

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Backend origin. Empty on web means same-origin `/api`. |

Web: leave it empty.

Tauri production: set it to the HTTPS origin, for example `https://orbis.example`. Do not hardcode that URL in source.

Android emulator: `localhost` inside the emulator is not your laptop. Use `http://10.0.2.2:3000` or `adb reverse tcp:3000 tcp:3000` then `http://127.0.0.1:3000`.

## Persistence

- **Local:** JSON under `data/learners/`, `data/sessions/`, `data/evaluations/`, and `data/reviews/`.
- **Vercel / production:** Postgres table `orbis_records` (created on first use).

Learner ids live in `localStorage` (`orbis.learnerId`). Refreshing the tab does not wipe a chat. **Start over** / **Try again** deletes the active session for that scene and starts a new one. Completing a session keeps the record for scores and reviews.

## Identity

You can use Orbis without signing in. A learner id is created in the browser.

**Sign in with Google** (Auth.js) links that id to the Google account via `POST /api/auth/sync`. It is not a full multi-device account system yet. Do not treat the local id as a password or as proof of identity on the server beyond matching the stored learner.

## Voice

```
Speak → speech-to-text → POST /api/sessions/:id/turns → Claude → reply text → text-to-speech
```

Voice is only an input method. Missions, CEFR, evaluation, and Claude prompts stay the same. Optional `inputMode` (`text` | `voice`) is metadata. There is no separate voice API.

| | Web | Android APK |
| --- | --- | --- |
| Speech-to-text | Web Speech API (Chrome, Edge) | Android `SpeechRecognizer` |
| Speech-to-text fallback | Type instead | Type instead |
| Text-to-speech | `speechSynthesis` | `speechSynthesis` |

Orbis does **not** store raw audio — only the recognized text. Chrome and Android speech services typically send audio to the **device speech provider** (often Google). Orbis does not add its own speech vendor or speech API keys. Do not claim audio never leaves the device.

No pronunciation scoring.

Microphone permission is requested when you tap to speak, not at launch.

## How a mission works

1. Pick a language and level on the dashboard.
2. Open **Missions** and enter a scene.
3. Talk until the required objectives are done. Skipped points stay open until you actually say them.
4. **Complete session** runs evaluation (Inngest, or inline if the queue is unavailable).
5. Mistakes become review items. Scores and streak update on the dashboard.

The client cannot send simulation state or a homemade transcript to evaluate. The server loads the stored conversation.

## API (short)

| Method | Path | Role |
| --- | --- | --- |
| `POST` | `/api/sessions` | Start or restart a scene (Claude opening line) |
| `GET` | `/api/sessions/:id` | Load the public session |
| `POST` | `/api/sessions/:id/check-message` | Pre-send language check |
| `POST` | `/api/sessions/:id/turns` | Send a turn `{ message, inputMode? }` |
| `POST` | `/api/sessions/:id/complete` | Finish and evaluate |
| `GET` | `/api/sessions/:id/status` | `processing` / `evaluated` / … |
| `GET` | `/api/sessions/:id/evaluation` | Result when ready |
| `GET` | `/api/learners/:id/dashboard` | Home, missions, progress |
| `PATCH` | `/api/learners/:id` | Save language and level |
| `GET` | `/api/learners/:id/practice` | Due reviews |
| `GET` | `/api/reviews/:id?learnerId=` | One review exercise |
| `POST` | `/api/reviews/:id/answer` | Submit an answer |
| `GET` | `/api/worlds`, `/api/worlds/:id` | World catalog |
| `GET` | `/api/scenarios/:id` | Scenario catalog |
| `*` | `/api/auth/*` | Auth.js |
| `POST` | `/api/auth/sync` | Link Google user to learner id |
| `GET\|POST\|PUT` | `/api/inngest` | Inngest serve |

Review routes require a matching `learnerId` and do not expose another learner’s items. Network errors in the UI are short and human-readable (offline, timeout, not found, server unavailable) — not stack traces.

## CORS

Same-origin web requests do not need CORS. The API allows a small origin list (not `*`):

- `tauri://localhost`, `https://tauri.localhost`, `http://tauri.localhost`
- `http://localhost:3000`, `http://127.0.0.1:3000`, `http://10.0.2.2:3000`
- plus `ORBIS_CORS_ORIGINS`

## Tauri / Android (optional)

Same React client. Secrets stay on the Next.js server.

Needs: Rust (stable), Tauri 2 CLI (`npm run tauri`), JDK 17 or 21 (not 26), Android SDK, NDK, platform-tools. See [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/).

Desktop window (uses `next dev`):

```bash
npm run tauri dev
```

The production Tauri frontend is a static export (`out/`). `npm run build:tauri` temporarily moves server-only routes out of the tree so Next can export the client, then restores them.

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-orbis-backend.example npm run tauri android build
```

Production builds fail if `NEXT_PUBLIC_API_BASE_URL` is missing or is localhost / `10.0.2.2`. Debug builds may use those URLs.

App id: `com.orbis.language`. Display name: **Orbis**.

Permissions: internet, microphone, modify-audio-settings. No camera, location, contacts, or notifications.

```bash
# emulator + local Next
npm run dev
NEXT_PUBLIC_API_BASE_URL=http://10.0.2.2:3000 npm run android:dev

# debug APK
TAURI_DEBUG=1 NEXT_PUBLIC_API_BASE_URL=http://10.0.2.2:3000 npm run android:build
```
