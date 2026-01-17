"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Edit3,
  Link2,
  Link2Off,
  Loader2,
  Plus,
  RefreshCw,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ActivityClientProps {
  stravaConnected: boolean;
  stravaConfigured: boolean;
}

export default function ActivityClient({
  stravaConnected,
  stravaConfigured,

}: ActivityClientProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Manual entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualDuration, setManualDuration] = useState("");
  const [manualType, setManualType] = useState("Workout");
  const [manualName, setManualName] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [addingManual, setAddingManual] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);


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



  // Activity type options
  const activityTypes = [
    "Run", "Ride", "Swim", "Walk", "Hike", "Workout",
    "Yoga", "CrossFit", "WeightTraining", "Other"
  ];


  return (
    <>
      <div className="flex items-center gap-3 py-4">
        <h1 className="text-3xl font-bold">Record Activity</h1>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
          {message.text}
        </div>
      )}

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
    </>
  )
}