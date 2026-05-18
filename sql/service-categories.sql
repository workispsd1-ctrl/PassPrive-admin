create table if not exists public.service_categories (
  id uuid not null default gen_random_uuid (),
  key text not null,
  slug text not null,
  title text not null,
  subtitle text null,
  description text null,
  badge_text text null,
  image_url text null,
  image_path text null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  selection_type text not null default 'MULTI'::text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint service_categories_pkey primary key (id),
  constraint service_categories_key_key unique (key),
  constraint service_categories_slug_key unique (slug),
  constraint service_categories_title_chk check (
    (
      length(
        trim(
          both
          from
            title
        )
      ) > 0
    )
  ),
  constraint service_categories_sort_order_chk check ((sort_order >= 0)),
  constraint service_categories_selection_type_chk check (
    (
      selection_type = any (array['SINGLE'::text, 'MULTI'::text])
    )
  )
) TABLESPACE pg_default;

create index if not exists service_categories_active_sort_idx on public.service_categories using btree (
  is_active,
  sort_order,
  title
) TABLESPACE pg_default;

create trigger trg_service_categories_set_updated_at before
update on service_categories for each row
execute function set_updated_at ();

insert into public.service_categories (key, slug, title, sort_order, is_active, selection_type)
values
  ('HAIR_CARE', 'hair-care', 'Hair Care', 10, true, 'MULTI'),
  ('HAIR_COLOR', 'hair-color', 'Hair Color', 20, true, 'MULTI'),
  ('NAIL_BAR', 'nail-bar', 'Nail Bar', 30, true, 'MULTI'),
  ('BARBERING', 'barbering', 'Barbering', 40, true, 'MULTI'),
  ('SPA_WELLNESS', 'spa-wellness', 'Spa & Wellness', 50, true, 'MULTI'),
  ('MASSAGE', 'massage', 'Massage', 60, true, 'MULTI'),
  ('MAKEUP', 'makeup', 'Makeup', 70, true, 'MULTI'),
  ('BROWS_LASHES', 'brows-lashes', 'Brows & Lashes', 80, true, 'MULTI')
on conflict (key) do update
set
  slug = excluded.slug,
  title = excluded.title,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  selection_type = excluded.selection_type;
