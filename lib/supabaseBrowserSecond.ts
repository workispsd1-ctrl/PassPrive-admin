// lib/supabaseBrowserSecond.ts
// Second Supabase instance (NEXT_PUBLIC_SUPABASE_second_URL / NEXT_PUBLIC_SUPABASE_second_ANON_KEY)
import { createClient } from "@supabase/supabase-js";

const secondUrl = process.env.NEXT_PUBLIC_SUPABASE_second_URL!.replace(/\/$/, "").replace(/\/rest\/v1$/, "");
const secondAnonKey = process.env.NEXT_PUBLIC_SUPABASE_second_ANON_KEY!;

export const supabaseBrowserSecond = createClient(secondUrl, secondAnonKey);
