import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";

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

  // Get Strava connection
  const { data: stravaConnection } = await supabase
    .from("strava_connections")
    .select("strava_athlete_id, created_at")
    .eq("user_id", user.id)
    .single();

  // Get streak data
  const { data: streak } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Get recent activities
  const { data: activities } = await supabase
    .from("daily_activities")
    .select("*")
    .eq("user_id", user.id)
    .order("activity_date", { ascending: false })
    .limit(30);

  return (
    <DashboardClient
      user={user}
      profile={profile}
      stravaConnected={!!stravaConnection}
      streak={streak}
      activities={activities || []}
    />
  );
}
