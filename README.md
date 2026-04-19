# Closing Day

Closing Day is a full-stack real estate AI companion built for Lofty GlobeHack 2026. It gives agents a live triage dashboard and gives buyers or sellers a client-safe document portal with plain-English summaries, contextual Q&A, emotional-readiness tracking, and simulated voice-bot follow-up.

The project is built as a strict TypeScript monorepo with React 18, Vite, Tailwind, Express, Prisma, SQLite, Server-Sent Events, Groq-backed AI services, and ElevenLabs voice synthesis.

## What It Does

- Agent login with a live triage board grouped by `needs_full_attention`, `needs_light_touch`, `clear`, and `booked`
- Client login by password or magic link, with a save-progress upgrade path
- PDF upload, extraction, categorization, summary generation, and authenticated document serving
- Question-aware document Q&A with fallback answers that vary by topic
- Sentiment analysis and readiness reclassification that update the agent view in real time
- Agent summary overrides that appear in the client portal immediately
- Simulated AI voice bot sessions with proposed slots, branching replies, audio generation, and prep briefs
- Repeat-client follow-up view with ROI framing and opportunity tiers
- Spanish-ready client UI flow for seeded demo users

## Architecture

```text
                  +----------------------+
                  |      React App       |
                  | Vite + Tailwind +    |
                  | Query + Zustand +    |
                  | Framer Motion        |
                  +----------+-----------+
                             |
              HTTP + SSE     |
                             v
                  +----------------------+
                  |     Express API      |
                  | Auth + Documents +   |
                  | Q&A + Triage + SSE + |
                  | Voice Bot Routes     |
                  +----+-----------+-----+
                       |           |
                       |           |
                       v           v
              +---------------+   +-------------------+
              | Prisma SQLite |   | In-Memory Event   |
              | Seeded demo   |   | Bus for SSE fanout|
              | transactions  |   +-------------------+
              +-------+-------+
                      |
          +-----------+------------+
          |                        |
          v                        v
  +---------------+       +------------------+
  | Groq AI layer |       | ElevenLabs voice |
  | summaries, Q&A|       | TTS for bot turn |
  | sentiment,    |       | audio, fallback  |
  | readiness     |       | transcript badge |
  +---------------+       +------------------+
```

## Monorepo Layout

```text
closing-day/
+-- backend/      Express API, Prisma schema, seed scripts, AI services, SSE
+-- frontend/     React app for agent and client experiences
+-- shared/       Shared TypeScript domain types
+-- docs/         Demo, rationale, and tooling docs
+-- scripts/      Workspace helpers such as Prisma runner
```

## Quickstart

### 1. Install dependencies

```bash
corepack pnpm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in the secrets you want to enable.

```bash
copy .env.example .env
```

Minimum local setup:

- `MAGIC_LINK_SECRET`
- `SESSION_SECRET`

Optional live integrations:

- `GROQ_API_KEY`
- `ELEVENLABS_API_KEY`
- `LOFTY_API_KEY`

### 3. Create the local database

```bash
corepack pnpm db:migrate
```

### 4. Seed the demo data

```bash
corepack pnpm db:seed
```

### 5. Start the frontend and backend together

```bash
corepack pnpm dev
```

App URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Health: `http://localhost:4000/api/diagnostics/health`

## Demo Credentials

Agent:

- `james@closingday.demo / demo123`

Clients:

- `sarah@closingday.demo / demo123`
- `marcus@closingday.demo / demo123`
- `maria@closingday.demo / demo123`
- `david@closingday.demo / demo123`

## Workspace Scripts

- `corepack pnpm dev` runs the frontend and backend together
- `corepack pnpm build` builds every workspace
- `corepack pnpm typecheck` runs strict TypeScript checks everywhere
- `corepack pnpm db:migrate` applies the Prisma migration locally
- `corepack pnpm db:seed` recreates the seeded demo state
- `corepack pnpm db:reset` resets the SQLite database and reseeds it

## Feature Notes

### Real-time flow

Closing Day uses native Server-Sent Events instead of polling as the primary live-update mechanism. Client actions such as document opens, questions, check-ins, agent overrides, and booked bot calls emit event-bus messages that invalidate the relevant React Query caches.

### AI transparency

Every AI response carries:

- `generatedBy`, which is either `groq` or `fallback`
- a transparency payload with `sources` and `note`

This makes it easy to prove live AI during a demo and to explain why a response appeared.

### Trust controls

Agents can override document summaries, and those edits propagate to the client portal in real time. The client experience also includes plain-language trust messaging and a save-progress path for first-time magic-link users.

## Environment Variables

### Required for local auth and app boot

- `PORT`
- `DATABASE_URL`
- `CLIENT_ORIGIN`
- `MAGIC_LINK_SECRET`
- `SESSION_SECRET`
- `VITE_API_URL`

### Required for live AI answers

- `GROQ_API_KEY`
- `GROQ_MODEL`

### Required for live voice audio

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `ELEVENLABS_MODEL_ID`

### Optional Lofty sync

- `LOFTY_API_BASE_URL`
- `LOFTY_API_KEY`
- `LOFTY_TIMEOUT_MS`

If any optional integration is missing, the app stays usable and reports fallback or demo status in diagnostics.

## Important Deviation From The Original Spec

The initial specification called for Anthropic Claude. On April 19, 2026, the implementation was intentionally switched to Groq at the user's request. The architecture, transparency contract, and fallback behavior remain the same, but all live AI calls now run through the Groq SDK instead of Anthropic.

## Docs

- [Design rationale](docs/DESIGN_RATIONALE.md)
- [Pitch script](docs/PITCH_SCRIPT.md)
- [AI tools used](docs/AI_TOOLS_USED.md)
