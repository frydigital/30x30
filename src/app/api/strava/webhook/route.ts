import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActivity, refreshAccessToken } from "@/lib/strava/api";
import { updateDailyActivity } from "@/lib/activities/utils";

const VERIFY_TOKEN = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;

// Strava verification handshake
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && challenge && token === VERIFY_TOKEN) {
    return NextResponse.json({ "hub.challenge": challenge }, { status: 200 });
  }

  return NextResponse.json({ error: "Invalid verification" }, { status: 403 });
}

interface StravaWebhookEvent {
  object_type: string;
  object_id: number;
  aspect_type: string;
  updates?: Record<string, unknown>;
  owner_id: number; // Strava athlete id
  subscription_id: number;
  event_time: number;
}

export async function POST(request: NextRequest) {
  if (!VERIFY_TOKEN) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  let event: StravaWebhookEvent;
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // We only care about activity creation events
  if (event.object_type !== "activity" || event.aspect_type !== "create") {
    return NextResponse.json({ ignored: true });
  }

  const supabase = await createClient();

  // Find the user connection by Strava athlete id
  const { data: connection, error: connError } = await supabase
    .from("strava_connections")
    .select("*")
    .eq("strava_athlete_id", event.owner_id)
    .single();

  if (connError || !connection) {
    return NextResponse.json({ ignored: true });
  }

  let accessToken = connection.access_token as string;
  const now = Math.floor(Date.now() / 1000);

  // Refresh token if expired
  if (connection.expires_at <= now) {
    try {
      const newTokens = await refreshAccessToken(connection.refresh_token);
      accessToken = newTokens.access_token;

      await supabase
        .from("strava_connections")
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          expires_at: newTokens.expires_at,
        })
        .eq("user_id", connection.user_id);
    } catch (err) {
      console.error("Webhook token refresh error", err);
      return NextResponse.json({ error: "Failed to refresh token" }, { status: 400 });
    }
  }

  try {
    // Fetch the single activity
    const activity = await getActivity(accessToken, event.object_id);

    const activityDate = activity.start_date_local.split("T")[0];
    const durationMinutes = Math.round(activity.moving_time / 60);

    const activityData = {
      user_id: connection.user_id,
      source: "strava" as const,
      external_activity_id: activity.id.toString(),
      activity_date: activityDate,
      duration_minutes: durationMinutes,
      activity_type: activity.type,
      activity_name: activity.name,
    };

    // Check for existing activity to avoid duplicates
    const { data: existing } = await supabase
      .from("activities")
      .select("id")
      .eq("user_id", connection.user_id)
      .eq("source", "strava")
      .eq("external_activity_id", activity.id.toString())
      .maybeSingle();

    if (!existing) {
      const { error: insertError } = await supabase
        .from("activities")
        .insert(activityData);

      if (insertError) {
        console.error("Webhook insert error", insertError);
        return NextResponse.json({ error: "Failed to save activity" }, { status: 500 });
      }
    }

    // Update daily total for that day and streaks
    await updateDailyActivity(supabase, connection.user_id, activityDate);
    await supabase.rpc("update_user_streak", { p_user_id: connection.user_id });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook sync error", err);
    return NextResponse.json({ error: "Failed to process activity" }, { status: 500 });
  }
}
