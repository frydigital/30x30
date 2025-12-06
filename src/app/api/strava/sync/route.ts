import { createClient } from "@/lib/supabase/server";
import { getActivities, refreshAccessToken } from "@/lib/strava/api";
import { recalculateDailyActivities } from "@/lib/activities/utils";
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

    console.log(`Fetched ${activities.length} activities from Strava`);

    // Process and store activities
    const activitiesToUpsert = activities.map(activity => {
      const activityDate = activity.start_date_local.split("T")[0];
      const durationMinutes = Math.round(activity.moving_time / 60);

      return {
        user_id: user.id,
        source: "strava" as const,
        external_activity_id: activity.id.toString(),
        activity_date: activityDate,
        duration_minutes: durationMinutes,
        activity_type: activity.type,
        activity_name: activity.name,
      };
    });

    console.log(`Prepared ${activitiesToUpsert.length} activities to upsert`);

    // Insert activities, handling duplicates
    if (activitiesToUpsert.length > 0) {
      // Get existing activity IDs
      const externalIds = activitiesToUpsert.map(a => a.external_activity_id);
      const { data: existing } = await supabase
        .from("activities")
        .select("external_activity_id")
        .eq("user_id", user.id)
        .eq("source", "strava")
        .in("external_activity_id", externalIds);

      const existingIds = new Set(existing?.map(a => a.external_activity_id) || []);
      
      // Filter out existing activities
      const newActivities = activitiesToUpsert.filter(
        a => !existingIds.has(a.external_activity_id)
      );

      console.log(`${newActivities.length} new activities to insert`);

      if (newActivities.length > 0) {
        const { error: insertError } = await supabase
          .from("activities")
          .insert(newActivities);

        if (insertError) {
          console.error("Insert error:", insertError);
          return NextResponse.json({ error: `Failed to save activities: ${insertError.message}` }, { status: 500 });
        }
      }

      console.log(`Successfully inserted ${newActivities.length} activities`);
    }

    // Recalculate daily totals from all sources
    await recalculateDailyActivities(supabase, user.id);

    // Update streak - call database function
    await supabase.rpc("update_user_streak", { p_user_id: user.id });

    return NextResponse.json({ 
      success: true, 
      synced: activities.length,
    });
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json({ error: "Failed to sync activities" }, { status: 500 });
  }
}
