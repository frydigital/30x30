"use client";

import { AppPageHeader } from "@/components/navigation/app-pageheader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, DailyActivity, Profile, Streak } from "@/lib/types";
import { User } from "@supabase/supabase-js";
import {
  Calendar,
  Check,
  Flame,
  Loader2,
  Trash2,
  Trophy
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface DashboardClientProps {
  user: User;
  profile: Profile | null;
  stravaConnected: boolean;
  stravaConfigured: boolean;
  streak: Streak | null;
  dailyActivities: DailyActivity[];
  activities: Activity[];
}

export default function DashboardClient({
  streak,
  dailyActivities,
  activities,
}: DashboardClientProps) {
  const router = useRouter();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<string | null>(null);



  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm("Are you sure you want to delete this activity?")) return;

    setDeletingActivity(activityId);
    setMessage(null);

    try {
      const response = await fetch(`/api/activities/manual?id=${activityId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Activity deleted" });
        router.refresh();
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to delete activity" });
    }
    setDeletingActivity(null);
  };



  // Generate activity calendar for last 30 days
  const generateCalendar = () => {
    const days = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const activity = dailyActivities.find(a => a.activity_date === dateStr);
      days.push({
        date: dateStr,
        dayOfWeek: date.toLocaleDateString("en", { weekday: "short" }),
        dayOfMonth: date.getDate(),
        minutes: activity?.total_duration_minutes || 0,
        isValid: activity?.is_valid || false,
      });
    }

    return days;
  };

  const calendar = generateCalendar();

  return (
    <>
      <AppPageHeader />
      {message && (
        <div className={`p-4 rounded-lg ${message.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Streak</p>
                <p className="text-3xl font-bold">{streak?.current_streak || 0} days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                <Trophy className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Longest Streak</p>
                <p className="text-3xl font-bold">{streak?.longest_streak || 0} days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Calendar className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valid Days (30 days)</p>
                <p className="text-3xl font-bold">
                  {dailyActivities.filter(a => a.is_valid).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Calendar (Last 30 Days)</CardTitle>
          <CardDescription>
            Each day requires at least 30 minutes of activity to count
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 lg:grid-cols-15 gap-1">
            {calendar.map((day, i) => (
              <div
                key={i}
                className={`aspect-square rounded flex flex-col items-center justify-center text-xs ${day.isValid
                    ? "bg-green-500 text-white"
                    : day.minutes > 0
                      ? "bg-yellow-200 dark:bg-yellow-800"
                      : "bg-muted"
                  }`}
                title={`${day.date}: ${day.minutes} min`}
              >
                <span className="font-medium">{day.dayOfMonth}</span>
                {day.isValid && <Check className="w-3 h-3" />}
                {day.minutes > 0 && !day.isValid && <span className="text-[10px]">{day.minutes}m</span>}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>30+ min</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-200 dark:bg-yellow-800 rounded"></div>
              <span>&lt;30 min</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-muted rounded"></div>
              <span>No activity</span>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
          <CardDescription>
            Your activities from all sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length > 0 ? (
            <div className="space-y-2">
              {activities.slice(0, 10).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${activity.source === 'strava' ? 'bg-orange-500' : 'bg-gray-500'}`} />
                    <div>
                      <p className="font-medium">{activity.activity_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.activity_date} • {activity.duration_minutes} min • {activity.activity_type}
                        <span className="ml-2 capitalize text-xs bg-muted px-1.5 py-0.5 rounded">
                          {activity.source}
                        </span>
                      </p>
                    </div>
                  </div>
                  {activity.source === 'manual' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteActivity(activity.id)}
                      disabled={deletingActivity === activity.id}
                    >
                      {deletingActivity === activity.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-destructive" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No activities yet. Connect a fitness platform or add activities manually.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
