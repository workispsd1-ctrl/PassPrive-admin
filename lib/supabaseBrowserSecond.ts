// lib/supabaseBrowserSecond.ts
// Redirects secondary database requests to the primary browser Supabase client.
import { supabaseBrowser } from "./supabaseBrowser";

export const supabaseBrowserSecond = supabaseBrowser;
