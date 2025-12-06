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
import { Profile, Streak, DailyActivity } from "@/lib/types";
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
  X
} from "lucide-react";

interface DashboardClientProps {
  user: User;
  profile: Profile | null;
  stravaConnected: boolean;
  streak: Streak | null;
  activities: DailyActivity[];
}

export default function DashboardClient({
  user,
  profile,
  stravaConnected,
  streak,
  activities,
}: DashboardClientProps) {
  const router = useRouter();
  const [username, setUsername] = useState(profile?.username || "");
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  // Generate activity calendar for last 30 days
  const generateCalendar = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      
      const activity = activities.find(a => a.activity_date === dateStr);
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
                    {activities.filter(a => a.is_valid).length}
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

        {/* Strava Connection */}
        <Card>
          <CardHeader>
            <CardTitle>Strava Connection</CardTitle>
            <CardDescription>
              Connect your Strava account to automatically sync your activities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stravaConnected ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2 text-green-600">
                  <Link2 className="w-5 h-5" />
                  <span>Connected to Strava</span>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSyncStrava} disabled={syncing}>
                    {syncing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Sync Activities
                  </Button>
                  <Button
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
                <Button asChild>
                  <a href="/api/strava/connect">
                    <Link2 className="w-4 h-4 mr-2" />
                    Connect Strava
                  </a>
                </Button>
              </div>
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
