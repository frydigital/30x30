import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { OrganizationLeaderboardEntry } from "@/lib/types";
import { Calendar, Flame, Trophy } from "lucide-react";
import { redirect } from "next/navigation";

export default async function OrganizationLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Get organization slug from query param (for development) or header (for subdomain)
  const orgSlug = params.org as string | undefined;

  if (!orgSlug) {
    redirect("/dashboard");
  }

  // Get organization
  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", orgSlug)
    .eq("is_active", true)
    .single();

  if (!organization) {
    redirect("/dashboard");
  }

  // Verify user is a member
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization.id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    redirect("/dashboard");
  }

  // Get organization leaderboard
  const { data: leaderboard } = await supabase
    .from("organization_leaderboard")
    .select("*")
    .eq("organization_id", organization.id)
    .order("current_streak", { ascending: false })
    .order("longest_streak", { ascending: false })
    .order("total_valid_days", { ascending: false }) as { data: OrganizationLeaderboardEntry[] | null };

  return (
    <>
      <div className="flex items-center gap-3 py-4">
        <h1 className="text-3xl font-bold">{organization?.name} Leaderboard</h1>
      </div>

      {leaderboard && leaderboard.length > 0 ? (
        <div className="grid gap-4">
          {leaderboard.map((entry, index) => (
            <Card key={entry.user_id} className={index < 3 ? "border-primary/50" : ""}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12">
                    {index === 0 && (
                      <div className="text-3xl">🥇</div>
                    )}
                    {index === 1 && (
                      <div className="text-3xl">🥈</div>
                    )}
                    {index === 2 && (
                      <div className="text-3xl">🥉</div>
                    )}
                    {index > 2 && (
                      <div className="text-2xl font-bold text-muted-foreground">
                        #{index + 1}
                      </div>
                    )}
                  </div>

                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                      {(entry.username || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <p className="font-semibold text-lg">
                      {entry.username || "Anonymous"}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {entry.member_role}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
                      <Flame className="w-5 h-5" />
                      <span className="text-2xl font-bold">{entry.current_streak}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Current Streak</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
                      <Trophy className="w-5 h-5" />
                      <span className="text-2xl font-bold">{entry.longest_streak}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Best Streak</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                      <Calendar className="w-5 h-5" />
                      <span className="text-2xl font-bold">{entry.total_valid_days}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Total Days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Activity Yet</CardTitle>
            <CardDescription>
              Be the first to log activities and start your streak!
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </>
  );
}
