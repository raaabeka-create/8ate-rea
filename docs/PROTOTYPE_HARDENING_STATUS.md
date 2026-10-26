# 8ATE prototype hardening status

Last reviewed: 2026-10-26

## Scope of this branch

This branch corrects the auth-loading binding, makes the UI honest about simulated features, adds local-repository membership and message-owner checks, and records remaining production blockers. It does not add a production backend or claim production-grade security.

## Fixed in this pass

- The root app now reads the actual `isLoading` field exposed by `AuthContext`.
- Authentication bootstrap clears the loading state if browser storage initialization throws.
- Chat and wall banners no longer claim end-to-end encryption, server-enforced anonymity, cross-device delivery, or real read receipts.
- Voice-note and call screens disclose that their timers and controls are demos and do not capture audio or connect live media.
- The local chat repository checks the active demo identity and conversation membership before listing conversations/messages, sending, reacting, marking read, and deleting.
- Message deletion is limited to messages authored by the active demo user, clears attachment metadata, and refreshes the conversation preview when needed.
- Message content is capped at 10,000 characters at the local repository boundary.
- Conversation creation requires the active demo user, distinct known participants, at least two participants, and a non-empty group name.

## Important limitation

These checks are defense-in-depth for a browser prototype, not a security boundary. Browser users can inspect or edit localStorage and bundled JavaScript. Anyone using the same browser profile can potentially access local data. No client-only implementation can guarantee anonymity, private phone numbers, access control, end-to-end encryption, or reliable delivery against a hostile client.

## Production blockers still open

1. **Backend and identity:** no Supabase client, schema, migrations, environment validation, Auth integration, or Row Level Security policies are present in the audited repository. Phone login is simulated and does not send or verify SMS OTP.
2. **Messaging consistency:** the local repository cannot synchronize across devices. Delivery/read states are not per recipient; unread counts and pinned state are conversation-wide rather than correctly scoped per user.
3. **Media:** images are sample URLs; there is no real upload pipeline. Voice notes have no recorded audio file and no actual audio playback.
4. **Calls:** the call UI is a simulation, not a WebRTC implementation. Real calls require signaling, ICE/STUN/TURN configuration, permissions, lifecycle handling, and real-device/network testing.
5. **Moderation and privacy:** wall ownership records and reports are stored client-side. Anonymity, block enforcement, report confidentiality, expiry, rate limits, and moderation actions must be enforced by a trusted backend.
6. **Testing and delivery:** the audited repository has no test suite or lockfile. Build/type-check results must be run in a real checkout or CI before merge.

## Required production acceptance checks

- User A cannot read or mutate conversations, messages, reports, private account records, or storage objects belonging to User B by changing client requests.
- Every table and private Storage bucket has deny-by-default RLS/policies; privileged keys never ship to the browser.
- Group membership changes and per-recipient receipts are correct under concurrent updates.
- Wall expiry, voting, blocking, and report submission are enforced server-side and tested with multiple accounts.
- No UI claims encryption, verified identity, delivery, read status, audio recording, or live calls unless the corresponding behavior is implemented and tested.
- Existing Ghana Walls, Hubs, Discover, profiles, notifications, and safety flows pass regression tests after each backend migration step.
