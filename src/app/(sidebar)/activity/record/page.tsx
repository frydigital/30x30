import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ActivityClient from "./activity-client";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }


  // Get Strava connection
  const { data: stravaConnection } = await supabase
    .from("strava_connections")
    .select("strava_athlete_id, created_at")
    .eq("user_id", user.id)
    .single();



  // Check if API keys are configured
  const stravaConfigured = !!(
    process.env.STRAVA_CLIENT_ID &&
    process.env.STRAVA_CLIENT_SECRET &&
    process.env.STRAVA_CLIENT_ID !== 'your_strava_client_id'
  );

  return (
    <ActivityClient
      stravaConnected={!!stravaConnection}
      stravaConfigured={stravaConfigured}
    />
  );
}
