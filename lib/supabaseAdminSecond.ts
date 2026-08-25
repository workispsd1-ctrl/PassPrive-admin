// lib/supabaseAdminSecond.ts
// Redirects secondary database requests to the primary admin Supabase client.
import { supabaseAdmin } from "./supabaseAdmin";

export const supabaseAdminSecond = supabaseAdmin;
