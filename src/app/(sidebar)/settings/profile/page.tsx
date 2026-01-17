import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileClient from "./profile-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect("/login");
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <ProfileClient
      user={user}
      profile={profile}
    />
  );
}
