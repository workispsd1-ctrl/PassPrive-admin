# Home Sections CMS — shared contract

This is the contract between **PassPrive-admin** (editing UI) and the
**PassPrive** mobile app (renderer). Both code against the same two tables.

## Tables

### `session_sorting` — screens
| column | type | notes |
| --- | --- | --- |
| `id` | bigint (identity) | PK |
| `name` | text | matched by the app, e.g. `"Home Screen"` (id 4) |

### `session_sorting_titles` — one row per section on a screen
| column | type | who | meaning |
| --- | --- | --- | --- |
| `id` | bigint (identity) | — | PK |
| `screen_id` | bigint | both | FK → `session_sorting.id` |
| `sort_order` | int | both | position; ascending. Lower = higher on screen |
| `title` | text | both | heading shown in the app (editable) |
| `section_key` | text | both | identity of a **native** section (see registry). Set this OR `template` |
| `template` | text | both | a shipped **template** id for new sections (see registry) |
| `data_source` | text | both | template only — table/source it pulls from (e.g. `restaurants`) |
| `params` | jsonb | both | template only — config, e.g. `{ "limit": 12, "city": "Mumbai", "cuisine": "Italian" }` |
| `style_variant` | text | both | optional predefined style preset name |
| `title_color` | text | both | optional heading colour override (e.g. `#383838`) |
| `background` | text | both | optional section background override |
| `enabled` | bool | both | `false` hides the section without deleting |

A row is **either** native (`section_key` set, `template` null) **or** a
template (`template` set, `section_key` null).

## App registries (keep admin dropdowns in sync)

Defined in `PassPrive/components/Home/HomeContent.jsx`:

**Native `section_key`s** (the 8 shipped sections):
`foodie-frontrow`, `more-with-passprive`, `shop-this-weekend`, `family-feast`,
`new-kick-in-stores`, `plan-your-salon-visit`, `now-trending`, `whats-hot`.

> `more-with-passprive` is a tile grid with **no heading**, so `title` is ignored for it.

**Templates** (for new sections):
- `restaurant_rail` — horizontal rail of restaurant cards.
  `data_source`: `restaurants` (only source wired today).
  `params`: `{ limit?: number, city?: string, area?: string, cuisine?: string }`.
  Component: `PassPrive/components/Home/templates/GenericRestaurantRail.jsx`.

Adding a new template id requires an **app release** (new renderer); the admin
dropdown should only offer template ids the shipped app knows.

## How the app reads it

`useSectionOrder("Home Screen")` (`PassPrive/src/hooks/useStores.js`):
selects the screen by `name`, then its `session_sorting_titles` rows
`where enabled = true order by sort_order`. For each row it renders the native
component by `section_key`, or the template by `template`, passing
`title` / `title_color` / `background` / `data_source` / `params`.

**Fallbacks (never break Home):**
- Table empty/unreachable, or the user is logged out → the app renders the 8
  native sections in their default order with their built-in headings.
- An unknown `section_key`/`template` row is skipped.
- Cached ~2 min (react-query), so edits appear on next load / after cache expiry.

## RLS note

`session_sorting*` currently grant **all** access to role `authenticated` only
(policies `*_admin_all`). So:
- Logged-out app users get the fallback order (no custom config).
- Any authenticated user can currently read **and write** these tables — tighten
  to admin-only before relying on this in production.

## Admin UI

`PassPrive-admin/app/dashboard/sorting-module/` ("Session Sorting") — pick a
screen, then its `[id]` page lists the titles with edit / delete and an
Add/Edit dialog (native section vs template, title, order, `section_key`,
style overrides, params, visibility). Writes directly via `supabaseBrowser`.
