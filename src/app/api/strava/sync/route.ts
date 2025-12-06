import { createClient } from "@/lib/supabase/server";
import { getActivities, refreshAccessToken } from "@/lib/strava/api";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get Strava connection
  const { data: connection, error: connError } = await supabase
    .from("strava_connections")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (connError || !connection) {
    return NextResponse.json({ error: "Strava not connected" }, { status: 400 });
  }

  let accessToken = connection.access_token;
  const now = Math.floor(Date.now() / 1000);

  // Refresh token if expired
  if (connection.expires_at <= now) {
    try {
      const newTokens = await refreshAccessToken(connection.refresh_token);
      accessToken = newTokens.access_token;
      
      // Update stored tokens
      await supabase
        .from("strava_connections")
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          expires_at: newTokens.expires_at,
        })
        .eq("user_id", user.id);
    } catch {
      return NextResponse.json({ error: "Failed to refresh token" }, { status: 400 });
    }
  }

  try {
    // Get activities from the last 30 days
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    const activities = await getActivities(accessToken, thirtyDaysAgo);

    // Process and store activities
    for (const activity of activities) {
      const activityDate = activity.start_date_local.split("T")[0];
      const durationMinutes = Math.round(activity.moving_time / 60);

      // Upsert activity
      await supabase
        .from("activities")
        .upsert({
          user_id: user.id,
          strava_activity_id: activity.id,
          activity_date: activityDate,
          duration_minutes: durationMinutes,
          activity_type: activity.type,
          activity_name: activity.name,
        }, {
          onConflict: "strava_activity_id",
        });
    }

    // Aggregate daily activities
    const dailyTotals: { [date: string]: number } = {};
    for (const activity of activities) {
      const activityDate = activity.start_date_local.split("T")[0];
      const durationMinutes = Math.round(activity.moving_time / 60);
      dailyTotals[activityDate] = (dailyTotals[activityDate] || 0) + durationMinutes;
    }

    // Upsert daily activities
    for (const [date, totalMinutes] of Object.entries(dailyTotals)) {
      await supabase
        .from("daily_activities")
        .upsert({
          user_id: user.id,
          activity_date: date,
          total_duration_minutes: totalMinutes,
        }, {
          onConflict: "user_id,activity_date",
        });
    }

    // Update streak - call database function
    await supabase.rpc("update_user_streak", { p_user_id: user.id });

    return NextResponse.json({ 
      success: true, 
      synced: activities.length,
      days: Object.keys(dailyTotals).length 
    });
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json({ error: "Failed to sync activities" }, { status: 500 });
  }
}
