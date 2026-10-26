# 8ATE Ghana

8ATE is a React + TypeScript + Vite prototype for Ghana-focused community conversations, regional Walls, Ghana Hubs, Discover, profiles, notifications, reporting, blocking, and call UI.

## Current implementation status

**This repository is a prototype, not a production messaging service.** Its default repositories store data in browser `localStorage`. Data is local to a browser profile, can be edited by the browser user, and is not shared reliably across devices or users. The current phone lookup and user switching are development simulations. The local repository now rejects several accidental cross-user actions (for example, reading another user's chat through the repository API, deleting another user's message, or clearing another user's call history), but these checks are not a security boundary because browser storage and client code are user-controlled.

The chat, media, voice-note, and call screens include demonstration behavior. In particular:

- Messages are not protected by server-side authorization or row-level security.
- The application does not implement end-to-end encryption.
- Message checkmarks do not prove real delivery or reading by another device.
- The voice-note UI does not currently capture and upload actual audio.
- The call UI does not currently establish a WebRTC media connection.
- Images shown in the chat attachment menu are sample URLs, not uploaded private attachments.
- Anonymous Wall owner data stored in browser storage is not secure moderation storage.
- Reports are saved only in local browser storage; no moderation team or service receives them. Blocking is enforced only by the local demo repository.
- Seeded verification badges are demo flags, not proof of real-world identity verification.

Do not use the prototype to store sensitive information or represent these demo behaviors as production security guarantees.

## Development

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run lint
npm test
npm audit --audit-level=high
npm run build
npm run dev
```

The `lint` script runs TypeScript checking (`tsc --noEmit`), `test` runs repository guardrail tests with Vitest, and `build` produces the Vite production bundle.

## Architecture

- `src/components/`: React screens and UI.
- `src/context/`: authentication, calls, and reporting state.
- `src/services/`: feature-level business operations.
- `src/repositories/interfaces.ts`: data access contracts.
- `src/repositories/localStorageRepository.ts`: prototype-only browser persistence.
- `src/types/index.ts`: shared domain models.
- `src/data/seedData.ts`: fictional/demo seed content.

Feature services use repository interfaces, which provide a migration seam for a server-backed implementation. A production migration must introduce real authentication, server-enforced access policies, database migrations, realtime event handling, secure media storage, and regression tests. UI checks alone are not authorization. See [the Supabase migration plan](docs/supabase-migration-plan.md) for the proposed data model, RLS invariants, transactional RPCs, and acceptance tests.

## Safe implementation order

1. Establish Supabase project configuration, migrations, and row-level security before wiring production data.
2. Implement authenticated profiles and membership-controlled conversations.
3. Persist messages and per-recipient delivery/read receipts; subscribe to authorized realtime changes.
4. Enforce message editing/deletion and reaction permissions on the server.
5. Add private media storage and real voice recording/playback.
6. Implement WebRTC signaling and connection lifecycle separately from call UI.
7. Verify Walls anonymity/moderation, Hubs, Discover, blocking/reporting, and notifications with multi-user tests.

Until those steps are complete, keep the app clearly marked as a prototype.
