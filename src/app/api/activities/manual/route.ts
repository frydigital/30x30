import { createClient } from "@/lib/supabase/server";
import { updateDailyActivity } from "@/lib/activities/utils";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { activity_date, duration_minutes, activity_type, activity_name, notes } = body;

    // Validate required fields
    if (!activity_date || !duration_minutes || !activity_type || !activity_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate duration
    if (duration_minutes <= 0 || duration_minutes > 1440) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }

    // Validate date (not in future, not more than 30 days ago)
    const activityDateObj = new Date(activity_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    if (activityDateObj > today) {
      return NextResponse.json({ error: "Cannot log future activities" }, { status: 400 });
    }
    if (activityDateObj < thirtyDaysAgo) {
      return NextResponse.json({ error: "Cannot log activities older than 30 days" }, { status: 400 });
    }

    // Insert manual activity
    const { data: activity, error: insertError } = await supabase
      .from("activities")
      .insert({
        user_id: user.id,
        source: "manual",
        external_activity_id: null,
        activity_date: activity_date,
        duration_minutes: Math.round(duration_minutes),
        activity_type: activity_type,
        activity_name: activity_name,
        notes: notes || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting activity:", insertError);
      return NextResponse.json({ error: "Failed to add activity" }, { status: 500 });
    }

    // Update daily activities
    await updateDailyActivity(supabase, user.id, activity_date);

    // Update streak
    await supabase.rpc("update_user_streak", { p_user_id: user.id });

    return NextResponse.json({ success: true, activity });
  } catch (err) {
    console.error("Manual activity error:", err);
    return NextResponse.json({ error: "Failed to add activity" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get("id");

    if (!activityId) {
      return NextResponse.json({ error: "Activity ID required" }, { status: 400 });
    }

    // Get activity to check ownership and get date for recalculation
    const { data: activity, error: fetchError } = await supabase
      .from("activities")
      .select("*")
      .eq("id", activityId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    // Delete the activity
    const { error: deleteError } = await supabase
      .from("activities")
      .delete()
      .eq("id", activityId)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 });
    }

    // Update daily activities for that date
    await updateDailyActivity(supabase, user.id, activity.activity_date);

    // Update streak
    await supabase.rpc("update_user_streak", { p_user_id: user.id });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete activity error:", err);
    return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 });
  }
}
