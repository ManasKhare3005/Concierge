# AI Tools Used

## Groq

Groq is the live inference provider in the current implementation. It is used for:

- document summarization
- contextual document Q&A
- question classification
- sentiment analysis
- readiness reasoning
- voice bot script generation
- prep brief generation

Important note: the original product spec named Anthropic Claude. The implementation was switched to Groq later at the user's request, so Groq is the live provider in this codebase.

## ElevenLabs

ElevenLabs is used for one-way synthesized bot audio during the simulated call flow. If the API key is missing or generation fails, the app still proceeds with a visible fallback voice state and transcript-first interaction.

## Codex

Codex was used to scaffold and implement the project across:

- monorepo setup
- backend routes and services
- Prisma schema and seeding
- frontend pages, hooks, and components
- documentation and verification

## Cursor

Cursor is listed in the original deliverables as part of the broader AI-assisted build workflow. This repository does not contain any runtime dependency on Cursor, but it may be used as a development environment during iteration.
