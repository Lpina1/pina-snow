import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Browser-only Supabase client getter.
 * Returns null on the server to avoid Next.js prerender/build crashes.
 */
export function getSupabase(): SupabaseClient | null {
  // During build/SSR/prerender there is no window — don't create the client.
  if (typeof window === "undefined") return null;

  if (_client) return _client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // In the browser, env must exist
  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing");
  if (!supabaseAnonKey) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing");

  _client = createClient(supabaseUrl, supabaseAnonKey);
  return _client;
}