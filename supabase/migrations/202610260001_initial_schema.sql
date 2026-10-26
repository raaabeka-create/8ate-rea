-- 8ATE initial Supabase foundation
-- Private phone numbers remain in Supabase Auth; do not duplicate them in public profiles.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username = lower(username) and username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  avatar_url text,
  bio text not null default '' check (char_length(bio) <= 500),
  region text not null check (region in (
    'Greater Accra', 'Ashanti', 'Northern', 'Eastern', 'Western', 'Central',
    'Volta', 'Bono', 'Bono East', 'Ahafo', 'Upper East', 'Upper West',
    'Oti', 'Savannah', 'North East', 'Western North'
  )),
  city text not null check (char_length(trim(city)) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  name text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint group_name_required check (not is_group or (name is not null and char_length(trim(name)) between 1 and 100))
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  pinned_at timestamptz,
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete restrict,
  message_type text not null default 'text' check (message_type in ('text', 'image', 'audio')),
  content text not null default '' check (char_length(content) <= 10000),
  media_path text,
  audio_duration_seconds integer check (audio_duration_seconds is null or audio_duration_seconds between 1 and 3600),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_for_everyone boolean not null default false,
  constraint media_message_has_path check (
    (message_type = 'text') or media_path is not null
  )
);

create index messages_conversation_created_idx on public.messages (conversation_id, created_at desc);
create index conversation_members_user_idx on public.conversation_members (user_id, conversation_id);
create index conversations_updated_idx on public.conversations (updated_at desc);

create table public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 32),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

-- SECURITY DEFINER prevents RLS policies on conversation_members from recursively
-- querying themselves. The function only answers membership for the supplied user.
create or replace function public.is_conversation_member(p_conversation_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = p_user_id
  );
$$;

revoke all on function public.is_conversation_member(uuid, uuid) from public;
grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;

-- Automatically make the creator the first conversation member.
create or replace function public.add_conversation_creator_as_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.conversation_members (conversation_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger conversations_add_creator
after insert on public.conversations
for each row execute function public.add_conversation_creator_as_member();

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;

-- Profiles are discoverable to signed-in users; phone numbers are not stored here.
create policy "Authenticated users can read profiles"
on public.profiles for select to authenticated
using (true);

create policy "Users can create their own profile"
on public.profiles for insert to authenticated
with check (id = auth.uid());

create policy "Users can update their own profile"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Members can read their conversations"
on public.conversations for select to authenticated
using (public.is_conversation_member(id));

create policy "Authenticated users can create conversations as themselves"
on public.conversations for insert to authenticated
with check (created_by = auth.uid());

create policy "Conversation owners can update conversation details"
on public.conversations for update to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "Members can read conversation membership"
on public.conversation_members for select to authenticated
using (public.is_conversation_member(conversation_id));

create policy "Conversation creators can add members"
on public.conversation_members for insert to authenticated
with check (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.created_by = auth.uid()
  )
);

create policy "Conversation creators can remove members"
on public.conversation_members for delete to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.created_by = auth.uid()
  )
  and user_id <> auth.uid()
);

create policy "Members can read messages"
on public.messages for select to authenticated
using (public.is_conversation_member(conversation_id));

create policy "Members can send messages as themselves"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and public.is_conversation_member(conversation_id)
);

create policy "Senders can edit their own messages"
on public.messages for update to authenticated
using (
  sender_id = auth.uid()
  and public.is_conversation_member(conversation_id)
)
with check (
  sender_id = auth.uid()
  and public.is_conversation_member(conversation_id)
);

create policy "Senders can delete their own messages"
on public.messages for delete to authenticated
using (
  sender_id = auth.uid()
  and public.is_conversation_member(conversation_id)
);

create policy "Members can read message reactions"
on public.message_reactions for select to authenticated
using (
  exists (
    select 1 from public.messages m
    where m.id = message_id and public.is_conversation_member(m.conversation_id)
  )
);

create policy "Users can add their own reactions"
on public.message_reactions for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.messages m
    where m.id = message_id and public.is_conversation_member(m.conversation_id)
  )
);

create policy "Users can remove their own reactions"
on public.message_reactions for delete to authenticated
using (user_id = auth.uid());

-- Private bucket for message media. Store files at: <user-uuid>/<conversation-uuid>/<filename>
insert into storage.buckets (id, name, public)
values ('8ate-chat-media', '8ate-chat-media', false)
on conflict (id) do nothing;

create policy "Conversation members can view message media"
on storage.objects for select to authenticated
using (
  bucket_id = '8ate-chat-media'
  and public.is_conversation_member(((storage.foldername(name))[2])::uuid)
);

create policy "Users can upload media to conversations they belong to"
on storage.objects for insert to authenticated
with check (
  bucket_id = '8ate-chat-media'
  and ((storage.foldername(name))[1])::uuid = auth.uid()
  and public.is_conversation_member(((storage.foldername(name))[2])::uuid)
);

create policy "Uploaders can delete their own conversation media"
on storage.objects for delete to authenticated
using (
  bucket_id = '8ate-chat-media'
  and ((storage.foldername(name))[1])::uuid = auth.uid()
  and public.is_conversation_member(((storage.foldername(name))[2])::uuid)
);
