import { createClient } from "@/lib/supabase/server";
import { getActivities } from "@/lib/garmin/api";
import { recalculateDailyActivities } from "@/lib/activities/utils";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get Garmin connection
  const { data: connection, error: connError } = await supabase
    .from("garmin_connections")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (connError || !connection) {
    return NextResponse.json({ error: "Garmin not connected" }, { status: 400 });
  }

  try {
    // Get activities from the last 30 days
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    const activities = await getActivities(
      connection.access_token,
      connection.access_token_secret,
      thirtyDaysAgo
    );

    // Process and store activities
    for (const activity of activities) {
      const activityDate = activity.startTimeLocal.split("T")[0];
      const durationMinutes = Math.round(activity.duration / 60);

      // Upsert activity
      await supabase
        .from("activities")
        .upsert({
          user_id: user.id,
          source: "garmin",
          external_activity_id: activity.activityId.toString(),
          activity_date: activityDate,
          duration_minutes: durationMinutes,
          activity_type: activity.activityType,
          activity_name: activity.activityName,
        }, {
          onConflict: "source,external_activity_id",
        });
    }

    // Recalculate daily totals
    await recalculateDailyActivities(supabase, user.id);

    // Update streak
    await supabase.rpc("update_user_streak", { p_user_id: user.id });

    return NextResponse.json({ 
      success: true, 
      synced: activities.length,
    });
  } catch (err) {
    console.error("Garmin sync error:", err);
    return NextResponse.json({ error: "Failed to sync activities" }, { status: 500 });
  }
}
