// lib/supabaseAdminSecond.ts
// Server-side client for the second Supabase instance.
// Uses SUPABASE_second_SERVICE_ROLE_KEY when set (bypasses RLS — required for deletes).
// Falls back to the anon key only if the service-role key is not configured.
import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_second_URL ?? "";
// Strip any trailing /rest/v1 path so the JS SDK builds its own REST URL.
const secondUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");

// Prefer the service-role key so server-side ops bypass RLS.
const secondKey =
  process.env.SUPABASE_second_SERVICE_ROLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_second_ANON_KEY?.trim() ||
  "";

if (!process.env.SUPABASE_second_SERVICE_ROLE_KEY?.trim()) {
  console.warn(
    "[supabaseAdminSecond] SUPABASE_second_SERVICE_ROLE_KEY is not set. " +
    "Falling back to anon key — delete operations may fail if RLS is enabled on the second database."
  );
}

export const supabaseAdminSecond = createClient(secondUrl, secondKey, {
  auth: { persistSession: false },
});
