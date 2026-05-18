-- About Content schema
-- Run in Supabase SQL editor

create extension if not exists pgcrypto;

create table if not exists public.about_content (
  id uuid primary key default gen_random_uuid(),
  content_key text not null unique,
  title text not null default 'About PassPrive',
  content_html text not null default '<p></p>',
  is_published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint about_content_key_not_empty check (length(trim(content_key)) > 0),
  constraint about_title_not_empty check (length(trim(title)) > 0),
  constraint about_html_not_empty check (length(trim(content_html)) > 0)
);

create index if not exists about_content_updated_at_idx
  on public.about_content (updated_at desc);

create index if not exists about_content_publish_idx
  on public.about_content (is_published);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_about_content_updated_at on public.about_content;
create trigger set_about_content_updated_at
before update on public.about_content
for each row execute function public.touch_updated_at();

alter table public.about_content enable row level security;

-- Public app read access for published entries
drop policy if exists about_content_public_read on public.about_content;
create policy about_content_public_read
on public.about_content
for select
using (is_published = true);

-- Admin write access
drop policy if exists about_content_admin_write on public.about_content;
create policy about_content_admin_write
on public.about_content
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

comment on table public.about_content is 'Rich About page content managed from admin.';
