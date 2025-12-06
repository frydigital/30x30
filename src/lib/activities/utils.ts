import { createClient } from "@/lib/supabase/server";

export async function recalculateDailyActivities(
  supabase: Awaited<ReturnType<typeof createClient>>, 
  userId: string
) {
  // Get all activities for the user in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const { data: activities, error: activitiesError } = await supabase
    .from("activities")
    .select("activity_date, duration_minutes")
    .eq("user_id", userId)
    .gte("activity_date", thirtyDaysAgoStr);

  if (activitiesError) {
    console.error("Error fetching activities:", activitiesError);
    return;
  }

  if (!activities || activities.length === 0) {
    console.log("No activities found for recalculation");
    return;
  }

  console.log(`Recalculating daily activities from ${activities.length} activities`);

  // Aggregate by date
  const dailyTotals: { [date: string]: number } = {};
  for (const activity of activities) {
    dailyTotals[activity.activity_date] = 
      (dailyTotals[activity.activity_date] || 0) + activity.duration_minutes;
  }

  console.log(`Aggregated into ${Object.keys(dailyTotals).length} days`);

  // Delete existing daily activities for this user in the date range
  await supabase
    .from("daily_activities")
    .delete()
    .eq("user_id", userId)
    .gte("activity_date", thirtyDaysAgoStr);

  // Insert all daily activities
  const dailyActivitiesToInsert = Object.entries(dailyTotals).map(([date, totalMinutes]) => ({
    user_id: userId,
    activity_date: date,
    total_duration_minutes: totalMinutes,
  }));

  if (dailyActivitiesToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("daily_activities")
      .insert(dailyActivitiesToInsert);

    if (insertError) {
      console.error("Error inserting daily activities:", insertError);
    } else {
      console.log(`Successfully inserted ${dailyActivitiesToInsert.length} daily activity records`);
    }
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

  // Delete existing daily activity for this date
  await supabase
    .from("daily_activities")
    .delete()
    .eq("user_id", userId)
    .eq("activity_date", activityDate);

  if (totalMinutes > 0) {
    // Insert new daily activity
    await supabase
      .from("daily_activities")
      .insert({
        user_id: userId,
        activity_date: activityDate,
        total_duration_minutes: totalMinutes,
      });
  }
}
