import { supabase } from "@/lib/supabase";

export async function getSessionUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  return data.user;
}

export async function getMyProfile() {
  const user = await getSessionUser();
  if (!user) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("profiles")
    .select("id,name,role")
    .eq("id", user.id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}