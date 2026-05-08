-- Help Center schema for FAQs + Help Topics
-- Run in Supabase SQL editor

create extension if not exists pgcrypto;

create table if not exists public.faq_entries (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  tags text[] not null default '{}',
  is_published boolean not null default true,
  display_order integer not null default 0,
  source text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint faq_question_not_empty check (length(trim(question)) > 0),
  constraint faq_answer_not_empty check (length(trim(answer)) > 0)
);

create table if not exists public.help_topics (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  content text not null,
  tags text[] not null default '{}',
  is_published boolean not null default true,
  display_order integer not null default 0,
  source text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint help_category_not_empty check (length(trim(category)) > 0),
  constraint help_title_not_empty check (length(trim(title)) > 0),
  constraint help_content_not_empty check (length(trim(content)) > 0)
);

create index if not exists faq_entries_updated_at_idx
  on public.faq_entries (updated_at desc);

create index if not exists faq_entries_is_published_idx
  on public.faq_entries (is_published, display_order);

create index if not exists faq_entries_tags_gin_idx
  on public.faq_entries using gin (tags);

create index if not exists help_topics_updated_at_idx
  on public.help_topics (updated_at desc);

create index if not exists help_topics_category_idx
  on public.help_topics (category, is_published, display_order);

create index if not exists help_topics_tags_gin_idx
  on public.help_topics using gin (tags);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_faq_entries_updated_at on public.faq_entries;
create trigger set_faq_entries_updated_at
before update on public.faq_entries
for each row execute function public.touch_updated_at();

drop trigger if exists set_help_topics_updated_at on public.help_topics;
create trigger set_help_topics_updated_at
before update on public.help_topics
for each row execute function public.touch_updated_at();

alter table public.faq_entries enable row level security;
alter table public.help_topics enable row level security;

-- Public/regular app read access for chatbot (published only)
drop policy if exists faq_public_read on public.faq_entries;
create policy faq_public_read
on public.faq_entries
for select
using (is_published = true);

drop policy if exists help_topics_public_read on public.help_topics;
create policy help_topics_public_read
on public.help_topics
for select
using (is_published = true);

-- Admin write access (customize role logic as needed)
drop policy if exists faq_admin_write on public.faq_entries;
create policy faq_admin_write
on public.faq_entries
for all
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and lower(coalesce(u.role, '')) in ('admin', 'superadmin')
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and lower(coalesce(u.role, '')) in ('admin', 'superadmin')
  )
);

drop policy if exists help_topics_admin_write on public.help_topics;
create policy help_topics_admin_write
on public.help_topics
for all
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and lower(coalesce(u.role, '')) in ('admin', 'superadmin')
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and lower(coalesce(u.role, '')) in ('admin', 'superadmin')
  )
);

comment on table public.faq_entries is 'Structured FAQ answers for app help and chatbot retrieval.';
comment on table public.help_topics is 'Long-form help content grouped by category for support chatbot context.';
