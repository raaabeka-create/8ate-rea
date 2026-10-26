# Supabase setup for 8ATE

This repository is being connected to Supabase in stages. The existing local-storage demo is not replaced until the real auth/data paths are implemented and verified.

## 1. Create the Supabase project

- Project name: `8ATE`
- Choose a strong, unique database password and save it somewhere private.
- Choose a region close to Ghana; compare the available European regions and choose the closest available one.
- Wait until the project finishes provisioning.

## 2. Configure the app locally

- In Supabase, open **Project Settings → API** (or the project's API keys page).
- Copy the Project URL and the **publishable key** (older projects may label this the `anon` key).
- In the project root, create a file named `.env.local` by copying `.env.example`.
- Put those two values in `.env.local`.
- Do not commit `.env.local`. Never use the `service_role` or secret key in browser code.

## 3. Apply the database migration

- Open **SQL Editor** in the Supabase dashboard.
- Open `supabase/migrations/202610260001_initial_schema.sql` in GitHub and copy the full contents.
- Paste it into SQL Editor and click **Run**.
- If Supabase reports an error, stop and share the exact error instead of rerunning blindly.

## Included in the first migration

- Public user profiles without phone numbers.
- Conversations and per-user membership, read timestamps and pin timestamps.
- Messages and reactions.
- Row Level Security policies to limit conversations/messages to their members.
- A private Storage bucket for chat media.

## Important limitations

- This migration establishes the database foundation; it does not yet switch the current UI from demo/local storage to Supabase.
- Phone OTP delivery must be configured and tested separately in Supabase Auth.
- Supabase does not automatically provide end-to-end encryption or voice/video calling.
- Test policies with separate accounts before using real user data.
