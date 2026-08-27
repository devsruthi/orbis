# Orbis

Enter the world. Speak the language.

Orbis is an AI-powered language immersion platform. Learners enter simulated
real-life situations and talk to AI characters in their target language.

The goal is not vocabulary drills. The goal is: **learn by living.**

## Current stage

**Stage 9** — Voice conversations.

The same React/Next.js client runs in a browser and in a Tauri Android app.
Voice is an interface on top of the existing conversation engine. Claude,
Inngest, persistence, and secrets stay on the Next.js server.

## Deployment model

```
WEB
Browser → Next.js frontend → same-origin /api → Next.js backend → Claude + Inngest

ANDROID
Tauri WebView → bundled Orbis client → NEXT_PUBLIC_API_BASE_URL → Next.js backend → Claude + Inngest
```

Production:

1. Deploy Next.js as the web app **and** API backend.
2. Build the Tauri Android client against that backend URL.
3. The APK talks to the deployed backend over HTTPS.

Do not package the Next.js server, Claude SDK, or Inngest into the APK.

## Environment variables

### Web server (never ship these to the client)

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude API key. Server-side only. |
| `ANTHROPIC_MODEL` | Claude model id. Server-side only. |
| `INNGEST_EVENT_KEY` | Inngest event key. Server-side only. |
| `INNGEST_SIGNING_KEY` | Inngest signing key. Server-side only. |
| `INNGEST_DEV` | Set to `1` for the local Inngest Dev Server. |
| `ORBIS_DATA_DIR` | JSON persistence root (defaults to `./data`). |
| `ORBIS_CORS_ORIGINS` | Extra allowed browser/Tauri origins for `/api`. |

Do **not** create `NEXT_PUBLIC_ANTHROPIC_API_KEY` or any public Inngest key.

### Client / Tauri

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Backend origin for the client. Empty on web means same-origin `/api`. |

Web: leave `NEXT_PUBLIC_API_BASE_URL` empty.

Tauri production: set it to the deployed HTTPS origin, for example
`https://orbis.example`. Do not hardcode that URL in application code.

Android emulator development: `localhost` inside the emulator is **not** the
developer machine. Use `http://10.0.2.2:3000` (Android emulator loopback to
the host) or `adb reverse tcp:3000 tcp:3000` and then `http://127.0.0.1:3000`.
Do not hardcode a LAN IP in source.

Physical-device development: point `NEXT_PUBLIC_API_BASE_URL` at a reachable
host for that session only (or use `adb reverse`). Tauri sets `TAURI_DEV_HOST`
when you run `tauri android dev` on a device.

## CORS

The backend allows a small origin list (not `Access-Control-Allow-Origin: *`):

- `tauri://localhost`
- `https://tauri.localhost`
- `http://tauri.localhost`
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://10.0.2.2:3000`
- plus any origins in `ORBIS_CORS_ORIGINS`

Same-origin web requests send no `Origin` and do not need CORS.

## Web development

```bash
npm install
```

Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY`. For local
Inngest, keep `INNGEST_DEV=1`.

```bash
npm run dev
```

In a second terminal:

```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

The app runs at [http://localhost:3000](http://localhost:3000).

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

`npm run build` produces the **full** Next.js server app, including `/api`.
It does not static-export the site.

## Tauri development

Requirements: Rust (stable), the Tauri 2 CLI (`npm run tauri`), JDK 17 or 21
(JDK 26 is too new for Tauri's current Gradle), Android SDK, NDK, and
platform-tools. See [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/).

Example environment for Homebrew on macOS (paths vary by machine):

```bash
export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export NDK_HOME="$ANDROID_HOME/ndk/$(ls -1 "$ANDROID_HOME/ndk" | tail -1)"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
```

Desktop WebView (optional, uses `next dev`):

```bash
npm run tauri dev
```

This starts Next.js on `http://localhost:3000` and loads it in a Tauri window.
API calls stay same-origin against that Next.js server.

The Tauri production frontend is a static export (`out/`). The build script
temporarily moves server-only routes (`src/app/api`, `src/proxy.ts`, and dynamic
play/review redirects) out of the tree so Next.js can export the client. Those
files are restored afterwards. Claude, Inngest, and persistence stay on the
server.

```bash
TAURI_DEBUG=1 NEXT_PUBLIC_API_BASE_URL=http://10.0.2.2:3000 npm run build:tauri
```

Production APK frontend:

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-orbis-backend.example npm run tauri android build
```

Production Tauri builds fail if `NEXT_PUBLIC_API_BASE_URL` is missing or is
localhost / `10.0.2.2`. Debug builds may use those development URLs.

## Android development

Initialize the Android project once (already done in this repo after Stage 8):

```bash
npm run android:init
```

Emulator + local Next.js:

1. Start the web backend: `npm run dev` (and Inngest if you need evaluation).
2. Set `NEXT_PUBLIC_API_BASE_URL=http://10.0.2.2:3000` in `.env.local` for
   packaged debug APKs, **or** run live reload:
   `npm run android:dev`
3. `tauri android dev` uses `http://10.0.2.2:3000` as the Android `devUrl`.
   `localhost` inside the emulator is the emulator itself.

Debug APK:

```bash
TAURI_DEBUG=1 NEXT_PUBLIC_API_BASE_URL=http://10.0.2.2:3000 npm run android:build
```

Install the generated APK on an emulator or device. The app id is
`com.orbis.language`. The display name is **Orbis**.

Release APK configuration exists via `tauri android build` without `--debug`.
Do not commit signing keys. Google Play publishing is out of scope.

Android permissions are internet, microphone recording, and modify-audio-settings
(required for WebView capture). Microphone access is requested only when the
learner taps **Tap to speak**, not at app launch. Camera, location, contacts,
and notifications are not requested.

## Voice mode

```
User speaks
 ↓
Speech-to-text
  web: Web Speech API
  Android/Tauri: platform SpeechRecognizer (WebView has no Web Speech STT)
 ↓
Existing POST /api/sessions/:id/turns
 ↓
Claude + simulation engine
 ↓
Text response
 ↓
Text-to-speech (Web Speech API / speechSynthesis)
 ↓
Character speaks
```

Voice does **not** change CEFR, missions, evaluation, or Claude prompts.
Spoken turns become the same `message` as typed turns. Optional `inputMode`
(`text` | `voice`) is metadata only. There is no `POST /api/voice/conversation`.

Stage 9 does **not** score pronunciation or accent.

### Supported platforms

- **Speech-to-text (web):** Chromium browsers (Chrome, Edge) via
  `SpeechRecognition` / `webkitSpeechRecognition`.
- **Speech-to-text (Android APK):** Android `SpeechRecognizer` through a
  WebView bridge. Android System WebView typically does not implement the
  Web Speech Recognition API.
- **Text-to-speech:** Most browsers and Android WebViews via
  `speechSynthesis`.
- **Firefox / Safari / some WebViews:** STT may be missing. The conversation
  stays usable with text. If TTS is missing, replies still appear as text.

### Microphone permission

The app explains why the microphone is needed and asks only when you tap to
speak. Android declares `RECORD_AUDIO` and `MODIFY_AUDIO_SETTINGS` but does
not prompt at startup. Tauri capabilities remain `core:default` only; no extra
native plugins are exposed.

### Privacy

Orbis does not store raw audio. Only the recognized text is saved as a
normal conversation turn. Chrome STT and Android `SpeechRecognizer` send
speech to the **device speech recognition service** (often Google) to convert
it to text. Orbis does not add a separate paid speech API or speech API keys.
Do not claim audio never leaves the device.

Replay uses the existing reply text; it does not call Claude again.

### Cost

No Orbis speech-provider keys or usage fees. Platform speech services may
apply their own terms.

### Fallback

If voice is unavailable: “Voice mode isn't available on this device.”
Continue with text. If TTS fails, the written reply remains.

## Identity and authentication

Learner identity still uses `getOrCreateLearnerId()` in local storage. That
works in the Tauri WebView. There is no multi-device sync yet. Production
sync across devices will need authentication later. Do not treat local
learner ids as an account system.

## Network failures

The client shows friendly errors for offline, timeout, 404, and 500
responses. It does not show stack traces or raw `fetch` failures.

## Technology

- Next.js
- TypeScript
- Tailwind CSS
- Zod
- Anthropic Claude API (official SDK, server-side)
- Inngest (server-side)
- Tauri 2 (Android client)

## Current functionality

- Germany world with reusable locations
- German A2
- Apartment viewing, Anmeldung / Bürgeramt, and Restaurant missions
- Scenario variants so repeats are not identical
- Condition-based events and lightweight branching
- Server-owned simulation state and mission outcomes
- Server-side Claude conversation API
- Async Claude evaluation via Inngest after a session is completed
- Review items created from detected mistakes
- Deterministic priority and spaced review dates
- Targeted fill-in-the-blank / short-answer reviews
- Next-practice scenario recommendations from learner weaknesses
- Learner home, explore, practice, and progress views
- First-run setup: choose a language, then a CEFR level. Only German A2
  is playable today; other languages and levels show as coming soon
- Derived dashboard: scores, streaks, weaknesses, and review counts
- Tauri 2 Android client using the same frontend
- Voice mode: speech-to-text, existing conversation API, text-to-speech
  (no pronunciation scoring)

## API

- `GET /api/worlds`
- `GET /api/worlds/germany`
- `GET /api/scenarios/apartment_viewing`
- `POST /api/sessions` — creates a session with a mission snapshot, variant, and simulation state, then generates the opening character line with Claude
- `GET /api/sessions/:id` — includes public mission/simulation context (not internal event ids)
- `POST /api/sessions/:id/turns` — body `{ "message": "...", "inputMode": "text" | "voice" }`; `inputMode` is optional metadata. Claude still receives only `message`. The client cannot send simulation state
- `POST /api/sessions/:id/complete` — marks the session processing and publishes `orbis/session.completed`
- `GET /api/sessions/:id/status` — `{ "status": "processing" | "evaluated" | ... }`
- `GET /api/sessions/:id/evaluation` — 404 until the workflow finishes
- `GET /api/learners/:id/dashboard` — home/progress/explore aggregation
- `PATCH /api/learners/:id` — body `{ "language": "de", "level": "A2" }`
- `GET /api/learners/:id/practice` — due reviews and a recommended scenario
- `GET /api/learners/:id/next-practice` — `{ scenarioId, reason, priorityConcepts }`
- `GET /api/reviews/:id?learnerId=` — pending review exercise when ready
- `POST /api/reviews/:id/answer` — body `{ "answer": "...", "learnerId": "..." }`
- `GET|POST|PUT /api/inngest` — Inngest serve endpoint

Session, evaluation, and review data are stored as JSON under `data/learners/`,
`data/sessions/`, `data/evaluations/`, and `data/reviews/`. Claude and Inngest
credentials stay on the server. The client cannot submit a transcript to
evaluate; the workflow loads the stored conversation. Review APIs require a
matching `learnerId` and do not expose another learner's items.
Dashboard values are derived from those records. Simulation values are derived
from the session snapshot, not from client input.
