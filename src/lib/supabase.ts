import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// IMPORTANT:
// During `next build`, Next may prerender pages on the server.
// We do NOT want to create the Supabase client there.
// So: only create the client in the browser.
export const supabase =
  typeof window === "undefined"
    ? (null as any)
    : createClient(supabaseUrl!, supabaseAnonKey!);