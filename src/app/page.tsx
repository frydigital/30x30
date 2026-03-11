import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { Building2, CalendarDays, Flame, Target, Users } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function buildOrganizationJoinUrl(slug: string): string {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (baseDomain && !appUrl.includes("localhost")) {
    return `https://${slug}.${baseDomain}/join`;
  }
  return `/join?org=${slug}`;
}

function formatChallengeDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRange(startDate: string | null, endDate: string | null): string | null {
  const start = formatChallengeDate(startDate);
  const end = formatChallengeDate(endDate);
  if (start && end) return `${start} – ${end}`;
  if (start) return `Starts ${start}`;
  if (end) return `Ends ${end}`;
  return null;
}

interface ActiveChallenge {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  challenge_start_date: string | null;
  challenge_end_date: string | null;
}

export default async function Home() {
  const supabase = await createClient();

  // Check if user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch active public challenges
  const { data: activeChallenges } = await supabase
    .from("organizations")
    .select("id, name, slug, description, challenge_start_date, challenge_end_date")
    .eq("is_active", true)
    .neq("public_signup", false)
    .order("created_at", { ascending: false });

  const challenges = (activeChallenges as ActiveChallenge[] | null) ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold">30x30 Challenge</span>
          </div>
          <nav className="flex items-center gap-4">
            {user ? (
              <Button asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link href="/login">Log In</Link>
                </Button>
                <Button asChild>
                  <Link href="/create-organization">Create Challenge</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-4 text-center bg-linear-to-b from-orange-50 to-background dark:from-orange-950/20">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            30 Days. 30 Minutes.
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Run a fitness challenge for your team or community. Members exercise
            for at least 30 minutes every day for 30 days, track their streaks,
            and compete on a shared leaderboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <>
                <Button asChild size="lg" className="text-lg px-8">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="text-lg px-8">
                  <Link href="/create-organization">Create Challenge</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg" className="text-lg px-8">
                  <Link href="/create-organization">Create a Challenge</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="text-lg px-8">
                  <Link href="/login">Log In</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Active Challenges */}
      {challenges.length > 0 && (
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Active Challenges</h2>
              <p className="text-muted-foreground">
                Join an ongoing challenge and start tracking today
              </p>
            </div>

            <div className="space-y-3">
              {challenges.map((challenge) => {
                const dateRange = formatDateRange(challenge.challenge_start_date, challenge.challenge_end_date);

                return (
                  <div
                    key={challenge.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{challenge.name}</p>
                        {challenge.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {challenge.description}
                          </p>
                        )}
                        {dateRange && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{dateRange}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <Badge variant="secondary" className="hidden sm:inline-flex">
                        Open
                      </Badge>
                      <Button asChild size="sm">
                        <Link href={buildOrganizationJoinUrl(challenge.slug)}>
                          Join
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className={`py-12 px-4${challenges.length === 0 ? "" : " bg-muted/50"}`}>
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg">
              Create a challenge for your team and start your fitness journey
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Create a Challenge</CardTitle>
                <CardDescription>
                  Set up a 30-day challenge for your team, gym, or company. Define
                  start dates, activity rules, and terms of participation.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Invite Your Team</CardTitle>
                <CardDescription>
                  Share your challenge link. Members sign up directly and join
                  the leaderboard automatically.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle>Track &amp; Compete</CardTitle>
                <CardDescription>
                  Monitor progress on the leaderboard, connect Strava or Garmin,
                  and keep everyone motivated throughout the challenge.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Activity Tracking */}
      <section className={`py-12 px-4${challenges.length === 0 ? " bg-muted/50" : ""}`}>
        <div className="container mx-auto max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                Multiple Ways to Track
              </CardTitle>
              <CardDescription>
                Connect your favorite fitness apps or log activities manually
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#FC4C02">
                      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                    </svg>
                  </div>
                  <h3 className="font-semibold mb-1">Strava</h3>
                  <p className="text-sm text-muted-foreground">Auto-sync activities</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#007CC3">
                      <path d="M12.5 2.5C7.27 2.5 3 6.77 3 12s4.27 9.5 9.5 9.5 9.5-4.27 9.5-9.5-4.27-9.5-9.5-9.5zM17 12c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1s1 .45 1 1v3h2c.55 0 1 .45 1 1z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold mb-1">Garmin</h3>
                  <p className="text-sm text-muted-foreground">Connect your device</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <Target className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-1">Manual Entry</h3>
                  <p className="text-sm text-muted-foreground">Log any workout</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 30x30 Challenge</p>
        </div>
      </footer>
    </div>
  );
}
