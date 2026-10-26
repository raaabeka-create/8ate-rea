# 8ATE Ghana

8ATE is a React + TypeScript prototype for a Ghana-focused social and community app. The current interface includes Chats, anonymous Regional Walls, Ghana Hubs listings, Discover posts, profiles, notifications, reports/blocking, and fictional demo accounts.

> **Prototype warning:** This repository is not production-ready. Data is stored in the browser and can be inspected or modified by anyone with access to that browser profile. Do not enter real phone numbers, passwords, private messages, or other sensitive information. There is no production OTP authentication, shared backend, end-to-end encryption, push notification service, real media upload, real voice-note recording/playback, or live voice/video calling.

## Requirements

- Node.js 20 or newer
- npm

## Run locally

```bash
npm install
npm run dev
```

Vite starts on port `3000` and binds to `0.0.0.0`. Open the local URL shown in the terminal.

## Validate changes

Run the same core checks used by CI:

```bash
npm run lint
npm test
npm run build
npm audit --audit-level=high
```

- `npm run lint` runs TypeScript's no-emit check.
- `npm test` runs the Vitest repository guardrail tests.
- `npm run build` creates the production bundle in `dist/`.
- CI also prints a dependency audit summary and fails on high/critical vulnerabilities.

## Architecture

- `src/components/`: React screens and UI.
- `src/context/`: authentication, calls, and report modal state.
- `src/services/`: application-level service APIs.
- `src/repositories/interfaces.ts`: repository contracts intended to separate UI/services from persistence.
- `src/repositories/localStorageRepository.ts`: current browser-local prototype persistence and validation.
- `src/repositories/localStorageRepository.test.ts`: regression tests for session isolation, validation, blocking, message editing/deletion, receipts, reports, and storage failures.
- `src/types/index.ts`: shared domain types.
- `src/data/seedData.ts`: fictional demo users and sample records.

The repository interfaces are a useful migration seam, but they do **not** mean a remote backend is already connected. The current implementation uses browser `localStorage`; different users and devices do not share a durable source of truth.

## Current behavior and explicit limits

| Area | Current prototype behavior | Not implemented |
| --- | --- | --- |
| Sign-in | Fictional demo accounts and local session marker | Verified phone ownership, OTP, secure production sessions |
| Chats | Browser-local messages, sender edit window, delete tombstones, local per-recipient receipt simulation | Server persistence, cross-device sync, real network delivery/read receipts |
| Media | Sample HTTPS image URLs | File picker/upload, private object storage, real audio blobs |
| Calls | Simulated call screen and local call history | WebRTC signaling, live audio/video, call permissions and network handling |
| Walls | Anonymous public DTOs with separate local moderation metadata | Server-side anonymity guarantees or protected moderation records |
| Safety | Local blocking/reporting validation and blocked-content filtering | Server-enforced authorization, durable moderation workflow, abuse-rate limits |
| Notifications | Local records and per-user read state | Push delivery and server-side event generation |

The UI intentionally labels simulated receipts, media, calls, and verification. Do not remove those labels until the underlying behavior is real and tested.

## Before production

1. Connect a real authentication provider with verified phone ownership and session lifecycle controls.
2. Add a shared database and enforce authorization on the server (for example, PostgreSQL row-level security); never rely on browser-side checks as the security boundary.
3. Move private media to authenticated object storage with upload limits, MIME/type validation, and access policies.
4. Implement realtime delivery and per-recipient receipts from authoritative server events.
5. Implement real audio capture/playback and WebRTC calling, including permissions, signaling, reconnects, and failure handling.
6. Add server-side abuse prevention, moderation tooling, audit logs, backups, retention/deletion policies, and privacy review.
7. Add end-to-end encryption only with a reviewed protocol and correct key management; a UI label is not encryption.
8. Test migrations, concurrency, multiple devices, and the existing Chats, Walls, Hubs, Discover, profile, report, and blocking flows before deployment.

## Contribution rule

Prefer small, reviewable changes. Preserve existing features, add regression tests for behavior changes, and require the CI type-check, test suite, dependency audit, and production build to pass before merging.
