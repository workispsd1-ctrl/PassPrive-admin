-- Support Inbox schema
-- IMPORTANT: chat_conversations already exists in the DB.
-- This file creates support_tickets + chat_messages, then patches realtime
-- and RLS on the pre-existing chat_conversations table.
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- touch_updated_at (no-op if already exists from help-center.sql)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- support_tickets
-- (chat_conversations.ticket_id already FKs to this table, so create it first)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.support_tickets (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        references public.users(id) on delete set null,
  status          text        not null default 'OPEN'
                              check (status in ('OPEN','IN_PROGRESS','WAITING_USER','RESOLVED','CLOSED')),
  priority        text        not null default 'NORMAL'
                              check (priority in ('LOW','NORMAL','HIGH','URGENT')),
  subject         text,
  summary         text,
  assigned_to     uuid        references public.users(id) on delete set null,
  last_message_at timestamptz,
  unread_count    integer     not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists support_tickets_status_updated_idx
  on public.support_tickets (status, updated_at desc);
create index if not exists support_tickets_user_id_idx
  on public.support_tickets (user_id);
create index if not exists support_tickets_assigned_to_idx
  on public.support_tickets (assigned_to);
create index if not exists support_tickets_last_message_at_idx
  on public.support_tickets (last_message_at desc);

drop trigger if exists set_support_tickets_updated_at on public.support_tickets;
create trigger set_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- chat_messages  (messages within a conversation)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.chat_messages (
  id              uuid        primary key default gen_random_uuid(),
  conversation_id uuid        not null references public.chat_conversations(id) on delete cascade,
  role            text        not null check (role in ('user','assistant','system')),
  message         text        not null,
  message_type    text        not null default 'text',
  sender_type     text        check (sender_type in ('user','agent','bot')),
  created_at      timestamptz not null default now(),
  constraint chat_messages_message_not_empty check (length(trim(message)) > 0)
);

create index if not exists chat_messages_conversation_created_idx
  on public.chat_messages (conversation_id, created_at asc);

-- ─────────────────────────────────────────────────────────────────────────────
-- REPLICA IDENTITY — needed for realtime filtered subscriptions
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.chat_conversations  replica identity full;
alter table public.support_tickets     replica identity full;
alter table public.chat_messages       replica identity full;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.support_tickets enable row level security;
alter table public.chat_messages   enable row level security;

-- Admin full access to support_tickets
drop policy if exists support_tickets_admin_all on public.support_tickets;
create policy support_tickets_admin_all
  on public.support_tickets for all to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid()
            and lower(coalesce(u.role,'')) in ('admin','superadmin'))
  )
  with check (
    exists (select 1 from public.users u where u.id = auth.uid()
            and lower(coalesce(u.role,'')) in ('admin','superadmin'))
  );

-- App users can read their own tickets
drop policy if exists support_tickets_user_read on public.support_tickets;
create policy support_tickets_user_read
  on public.support_tickets for select to authenticated
  using (user_id = auth.uid());

-- Admin full access to chat_messages
drop policy if exists chat_messages_admin_all on public.chat_messages;
create policy chat_messages_admin_all
  on public.chat_messages for all to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid()
            and lower(coalesce(u.role,'')) in ('admin','superadmin'))
  )
  with check (
    exists (select 1 from public.users u where u.id = auth.uid()
            and lower(coalesce(u.role,'')) in ('admin','superadmin'))
  );

-- Users can access messages in their own conversations
drop policy if exists chat_messages_user_own on public.chat_messages;
create policy chat_messages_user_own
  on public.chat_messages for all to authenticated
  using (
    exists (select 1 from public.chat_conversations c
            where c.id = conversation_id
              and (c.user_id = auth.uid()))
  )
  with check (
    exists (select 1 from public.chat_conversations c
            where c.id = conversation_id
              and (c.user_id = auth.uid()))
  );

-- Admin access to the pre-existing chat_conversations table
-- (add policy if not already present)
drop policy if exists chat_conversations_admin_all on public.chat_conversations;
create policy chat_conversations_admin_all
  on public.chat_conversations for all to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid()
            and lower(coalesce(u.role,'')) in ('admin','superadmin'))
  )
  with check (
    exists (select 1 from public.users u where u.id = auth.uid()
            and lower(coalesce(u.role,'')) in ('admin','superadmin'))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME PUBLICATION
-- ─────────────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.support_tickets;
alter publication supabase_realtime add table public.chat_messages;
-- chat_conversations may already be in the publication; add only if not:
alter publication supabase_realtime add table public.chat_conversations;

comment on table public.support_tickets is 'Helpdesk tickets created when a chatbot conversation is handed off to a human agent.';
comment on table public.chat_messages   is 'Individual messages (user, bot, agent) within a chat conversation.';
