"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@supabase/supabase-js";
import { Profile, Streak, DailyActivity, Activity } from "@/lib/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Loader2, 
  RefreshCw, 
  LogOut, 
  Flame, 
  Trophy, 
  Calendar,
  Link2,
  Link2Off,
  Check,
  Plus,
  Edit3,
  Trash2
} from "lucide-react";

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
  user,
  profile,
  stravaConnected,
  stravaConfigured,
  streak,
  dailyActivities,
  activities,
}: DashboardClientProps) {
  const router = useRouter();
  const [username, setUsername] = useState(profile?.username || "");
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Manual entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualDuration, setManualDuration] = useState("");
  const [manualType, setManualType] = useState("Workout");
  const [manualName, setManualName] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [addingManual, setAddingManual] = useState(false);
  const [deletingActivity, setDeletingActivity] = useState<string | null>(null);

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        username: username || null,
        is_public: isPublic,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Profile updated!" });
    }
    setSaving(false);
  };

  const handleSyncStrava = async () => {
    setSyncing(true);
    setMessage(null);

    try {
      const response = await fetch("/api/strava/sync", {
        method: "POST",
      });
      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: `Synced ${data.synced} activities!` });
        router.refresh();
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to sync activities" });
    }
    setSyncing(false);
  };

  const handleDisconnectStrava = async () => {
    if (!confirm("Are you sure you want to disconnect Strava?")) return;
    
    setDisconnecting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/strava/disconnect", {
        method: "POST",
      });
      
      if (response.ok) {
        setMessage({ type: "success", text: "Strava disconnected" });
        router.refresh();
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to disconnect Strava" });
    }
    setDisconnecting(false);
  };


  const handleAddManualActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingManual(true);
    setMessage(null);

    try {
      const response = await fetch("/api/activities/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_date: manualDate,
          duration_minutes: parseInt(manualDuration),
          activity_type: manualType,
          activity_name: manualName || `${manualType} - ${manualDate}`,
          notes: manualNotes,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "Activity added!" });
        setShowManualEntry(false);
        setManualDuration("");
        setManualName("");
        setManualNotes("");
        router.refresh();
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to add activity" });
    }
    setAddingManual(false);
  };

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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  // Activity type options
  const activityTypes = [
    "Run", "Ride", "Swim", "Walk", "Hike", "Workout", 
    "Yoga", "CrossFit", "WeightTraining", "Other"
  ];

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">
            30x30
          </Link>
          <div className="flex items-center gap-4">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback>
                {(profile?.username || user.email || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
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
                  className={`aspect-square rounded flex flex-col items-center justify-center text-xs ${
                    day.isValid
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

        {/* Data Sources Section */}
        <Card>
          <CardHeader>
            <CardTitle>Data Sources</CardTitle>
            <CardDescription>
              Connect fitness platforms or add activities manually
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Strava Connection */}
            <div className="border-b pb-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                </svg>
                Strava
              </h3>
              {stravaConnected ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <Link2 className="w-5 h-5" />
                    <span>Connected</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSyncStrava} disabled={syncing}>
                      {syncing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Sync
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDisconnectStrava}
                      disabled={disconnecting}
                    >
                      {disconnecting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Link2Off className="w-4 h-4 mr-2" />
                      )}
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <X className="w-5 h-5" />
                    <span>Not connected</span>
                  </div>
                  <Button size="sm" asChild disabled={!stravaConfigured}>
                    <a href="/api/strava/connect">
                      <Link2 className="w-4 h-4 mr-2" />
                      Connect Strava
                    </a>
                  </Button>
                  {!stravaConfigured && (
                    <p className="text-xs text-muted-foreground">
                      Strava API credentials not configured
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Manual Entry */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                Manual Entry
              </h3>
              {!showManualEntry ? (
                <Button size="sm" onClick={() => setShowManualEntry(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Activity Manually
                </Button>
              ) : (
                <form onSubmit={handleAddManualActivity} className="space-y-4 max-w-md">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manualDate">Date</Label>
                      <Input
                        id="manualDate"
                        type="date"
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
                        max={new Date().toISOString().split("T")[0]}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manualDuration">Duration (minutes)</Label>
                      <Input
                        id="manualDuration"
                        type="number"
                        placeholder="30"
                        value={manualDuration}
                        onChange={(e) => setManualDuration(e.target.value)}
                        min="1"
                        max="1440"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manualType">Activity Type</Label>
                      <select
                        id="manualType"
                        value={manualType}
                        onChange={(e) => setManualType(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {activityTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manualName">Activity Name</Label>
                      <Input
                        id="manualName"
                        type="text"
                        placeholder="Morning run"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manualNotes">Notes (optional)</Label>
                    <Input
                      id="manualNotes"
                      type="text"
                      placeholder="Add any notes..."
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={addingManual || !manualDuration}>
                      {addingManual && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Add Activity
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowManualEntry(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
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
                      <div className={`w-2 h-2 rounded-full ${
                        activity.source === 'strava' ? 'bg-orange-500' :
                        activity.source === 'garmin' ? 'bg-blue-500' : 'bg-gray-500'
                      }`} />
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

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              Manage your display name and privacy settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Display Name</Label>
              <Input
                id="username"
                type="text"
                placeholder="Choose a display name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This will be shown on the public leaderboard
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="visibility">Public Profile</Label>
                <p className="text-sm text-muted-foreground">
                  Show your profile on the public leaderboard
                </p>
              </div>
              <Switch
                id="visibility"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>

            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
