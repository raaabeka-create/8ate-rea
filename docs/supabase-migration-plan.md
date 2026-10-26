# 8ATE Supabase migration plan

Status: design specification only. No Supabase project has been connected and no migration in this document has been applied.

## Why the existing repository interfaces are not a drop-in Supabase adapter

The current repository layer is local-storage based. Authentication lookup is synchronous, records use browser-generated string IDs, and the interfaces do not expose realtime subscriptions or server-side transactions. A production adapter therefore needs deliberate interface and model changes; replacing `localStorage` calls one-for-one would not provide correct authorization or realtime behavior.

## Data model

| Table | Purpose | Access rule |
| --- | --- | --- |
| `profiles` | Public display name, username, avatar, city, region, bio | Authenticated users can read public fields; a user can update only their own profile. Verification must be server/admin controlled. |
| `private_accounts` | E.164 phone number and private account settings | Only the owning authenticated user and trusted server functions can read/update it. Never expose this table through public profile queries. |
| `conversations` | Direct/group conversation metadata | Read only for members. Creation must record the authenticated creator. |
| `conversation_members` | Membership, admin role, last-read marker, per-user pin state | Read by members. Inserts/removals restricted to creator/admin policies or trusted RPCs. |
| `messages` | Text/media metadata, sender, sent/edited/deleted timestamps | Read by conversation members; insert only when `sender_id = auth.uid()` and the sender is a member; edit/delete only under explicit sender policy. |
| `message_receipts` | Per-message, per-recipient delivered/read timestamps | A recipient may update only their own receipt; message membership is checked on the server. |
| `message_reactions` | One reaction per user per message | Unique constraint on `(message_id, user_id)`; user may only create/update/delete their own reaction. |
| `user_blocks` | Blocker/blocked relationship | Only the blocker can create/remove/read their block list. Direct-message policies must check both block directions. |
| `wall_corridors` | Supported regional corridors | Read-only to clients; managed by trusted migrations/admin tooling. |
| `wall_posts` | Public alias, corridor, content, expiry | Public feed contains no real owner ID. Only active, non-expired posts are shown. Counts are derived from votes, not client supplied. |
| `wall_moderation` | Private post/reply owner mapping | No ordinary client SELECT policy. Trusted moderation role/functions only. Insert must bind owner to `auth.uid()`. |
| `wall_votes`, `wall_replies`, `wall_reply_votes` | Per-user Wall engagement | Vote key is unique per user/item; user may only cast/change their own vote; expired posts cannot be newly voted/replied to. |
| `hub_listings` | Marketplace listings and canonical seller ID | Public/authorized read; only authenticated seller can create/update/archive their listing. Seller profile is joined from `profiles`, never accepted as client-supplied identity data. |
| `hub_listing_saves` | Per-user saved listings | Only the owner can read or change their saves. |
| `discover_posts` | Public community posts | Authenticated author may create/update/delete their own post; server validates content, category, and media metadata. |
| `discover_likes`, `discover_bookmarks`, `discover_comments` | Per-user engagement and comments | Actor ID must equal `auth.uid()`; unique constraints prevent duplicate likes/bookmarks. |
| `reports` | Abuse/safety reports | Authenticated users may submit valid reports; reporters can read only their own submissions. Moderation access is a separate privileged policy. |
| `notifications` | User-targeted notification and read state | Recipient-only read/update; system-generated writes use trusted server functions. Broadcasts need per-user read receipts, not one shared boolean. |
| `call_records` | Call history | Each row has an explicit `owner_user_id`; only that user can read/delete it. The other participant is a foreign key, not a client-supplied profile object. |

## Required server-side invariants

1. **Identity comes from Supabase Auth.** Never trust a client-provided `sender_id`, `owner_user_id`, `reporter_id`, `seller_id`, or vote actor.
2. **Private phone data is separate.** Store normalized E.164 numbers only in `private_accounts`; add uniqueness constraints and verified-phone state only after a real SMS/OTP flow exists.
3. **Conversation membership gates every message operation.** Enforce membership for message reads, inserts, receipts, reactions, edits, deletes, and media access.
4. **Blocks are server enforced.** Direct-message insert checks both directions of the block relationship. Group behavior must be explicitly defined and tested separately.
5. **Wall anonymity is a database boundary.** Keep owner mappings in a table inaccessible to normal users. Do not rely on hiding a field in a React component.
6. **Counts are derived or server maintained.** Clients must not submit authoritative vote, like, unread, or saved counts.
7. **Media storage is private.** Use private Storage buckets and policies that authorize access by conversation membership/ownership. Store object paths and metadata, not public sample URLs.
8. **No end-to-end encryption claim without a protocol.** Supabase TLS/RLS protects transport/access but is not end-to-end encryption.
9. **Realtime subscriptions require authorization.** Subscribe only to rows the current user is allowed to read and unsubscribe on conversation/account changes.
10. **Admin/verification flags are privileged.** A profile update must never let a user self-assign a verified or moderator role.

## Transactional operations that should be RPCs

- Create a conversation and its initial members atomically; reject malformed direct/group membership.
- Create a Wall post and its private moderation mapping atomically.
- Cast/change/remove a Wall vote while updating or deriving counts consistently.
- Mark messages delivered/read for the authenticated recipient.
- Create a report after validating target type and target existence.
- Archive/delete a user account with defined handling for messages, moderation records, listings, and reports.

## Migration sequence

1. Add SQL migrations and enable RLS on every user-data table before exposing any client reads/writes.
2. Add generated database types and a typed Supabase client configured only from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never place a service-role key in frontend environment variables.
3. Replace the synchronous current-user contract with an async authenticated session contract and add explicit realtime subscription interfaces.
4. Implement and test profiles/private accounts first, then conversations/membership/messages, receipts/reactions, and media storage.
5. Migrate Walls, Hubs, Discover, reports/blocks, notifications, and call history in separate feature-sized changes.
6. Keep existing UI components and feature behavior where possible; use adapter-level mapping between database rows and the current domain types.
7. Do not remove the local demo adapter until multi-user backend tests pass.

## Acceptance tests before production

- User A cannot read or mutate User B's private account, conversations, saved items, notifications, call history, or block list by changing a request parameter.
- A non-member cannot read/send/react/edit/delete messages or retrieve conversation media.
- A blocked pair cannot create/send a direct message in either direction.
- A user cannot self-verify, impersonate a seller/sender, or assign themselves moderator privileges.
- A Wall public response never includes owner IDs, phone numbers, or moderation metadata; ordinary users cannot query the moderation table.
- Delivery/read receipts are per recipient; group receipts do not leak other recipients' private state.
- Media uploads reject oversized/unsupported files and unauthorized object paths.
- Realtime subscriptions close on logout/account switch and cannot leak events from a previous conversation.
- RLS tests run against a real local Supabase/Postgres instance with at least two authenticated users.
- Existing Regional Walls, Hubs, Discover, profiles, reports, blocking, and notifications pass regression tests after each migration step.

## Current limitations

This plan is not implemented backend code. The current app remains a browser-local prototype until a Supabase project, migrations, RLS policies, authenticated client, and integration tests are actually added and exercised.
