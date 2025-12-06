import { createClient } from "@/lib/supabase/server";

export async function recalculateDailyActivities(
  supabase: Awaited<ReturnType<typeof createClient>>, 
  userId: string
) {
  // Get all activities for the user in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const { data: activities } = await supabase
    .from("activities")
    .select("activity_date, duration_minutes")
    .eq("user_id", userId)
    .gte("activity_date", thirtyDaysAgoStr);

  if (!activities) return;

  // Aggregate by date
  const dailyTotals: { [date: string]: number } = {};
  for (const activity of activities) {
    dailyTotals[activity.activity_date] = 
      (dailyTotals[activity.activity_date] || 0) + activity.duration_minutes;
  }

  // Upsert daily activities
  for (const [date, totalMinutes] of Object.entries(dailyTotals)) {
    await supabase
      .from("daily_activities")
      .upsert({
        user_id: userId,
        activity_date: date,
        total_duration_minutes: totalMinutes,
      }, {
        onConflict: "user_id,activity_date",
      });
  }
}

export async function updateDailyActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  activityDate: string
) {
  // Get total duration for the date
  const { data: activities } = await supabase
    .from("activities")
    .select("duration_minutes")
    .eq("user_id", userId)
    .eq("activity_date", activityDate);

  const totalMinutes = activities?.reduce((sum, a) => sum + a.duration_minutes, 0) || 0;

  if (totalMinutes > 0) {
    // Upsert daily activity
    await supabase
      .from("daily_activities")
      .upsert({
        user_id: userId,
        activity_date: activityDate,
        total_duration_minutes: totalMinutes,
      }, {
        onConflict: "user_id,activity_date",
      });
  } else {
    // Delete daily activity if no activities remain
    await supabase
      .from("daily_activities")
      .delete()
      .eq("user_id", userId)
      .eq("activity_date", activityDate);
  }
}
