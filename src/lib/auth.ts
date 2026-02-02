import { getSupabase } from "@/lib/supabase";

export type Profile = { id: string; name: string | null; role: string | null };

function mustSupabase() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not available on the server.");
  return sb;
}

export async function getSessionUser() {
  const supabase = mustSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  return data.user;
}

export async function getMyProfile(): Promise<Profile> {
  const supabase = mustSupabase();
  const user = await getSessionUser();
  if (!user) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("profiles")
    .select("id,name,role")
    .eq("id", user.id)
    .single();

  if (error) throw new Error(error.message);
  return data as Profile;
}