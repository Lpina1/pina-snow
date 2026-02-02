import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (typeof window === "undefined") {
    // IMPORTANT: never create the client on the server (build/prerender/SSR)
    throw new Error("Supabase client can only be used in the browser");
  }

  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing");
  if (!supabaseAnonKey) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing");

  client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}