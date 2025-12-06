import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Flame, Trophy, Medal, Award } from "lucide-react";
import { LeaderboardEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  
  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();

  // Get leaderboard data
  const { data: leaderboard } = await supabase
    .from("public_leaderboard")
    .select("*")
    .limit(50) as { data: LeaderboardEntry[] | null };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-muted-foreground">{rank}</span>;
    }
  };

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
              <Button asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-4 text-center bg-gradient-to-b from-orange-50 to-background dark:from-orange-950/20">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            30 Days. 30 Minutes.
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Build your fitness habit with the 30x30 challenge. Exercise for at least
            30 minutes every day for 30 days. Track your streak and compete with
            others!
          </p>
          {!user && (
            <Button asChild size="lg" className="text-lg px-8">
              <Link href="/login">Join the Challenge</Link>
            </Button>
          )}
        </div>
      </section>

      {/* Leaderboard */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Leaderboard
              </CardTitle>
              <CardDescription>
                Top participants ranked by current streak
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboard && leaderboard.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                    <div className="col-span-1">Rank</div>
                    <div className="col-span-5">User</div>
                    <div className="col-span-2 text-center">Current</div>
                    <div className="col-span-2 text-center">Best</div>
                    <div className="col-span-2 text-center">Days</div>
                  </div>
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.user_id}
                      className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-lg ${
                        index < 3 ? "bg-muted/50" : ""
                      }`}
                    >
                      <div className="col-span-1 flex items-center">
                        {getRankIcon(index + 1)}
                      </div>
                      <div className="col-span-5 flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={entry.avatar_url || undefined} />
                          <AvatarFallback>
                            {(entry.username || "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium truncate">
                          {entry.username || "Anonymous"}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center justify-center">
                        <div className="flex items-center gap-1">
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span className="font-bold">{entry.current_streak}</span>
                        </div>
                      </div>
                      <div className="col-span-2 flex items-center justify-center">
                        <span className="text-muted-foreground">{entry.longest_streak}</span>
                      </div>
                      <div className="col-span-2 flex items-center justify-center">
                        <span className="text-muted-foreground">{entry.total_valid_days}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    No participants yet. Be the first to join!
                  </p>
                  {!user && (
                    <Button asChild>
                      <Link href="/login">Get Started</Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* How it works */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-2">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <CardTitle>Connect Strava</CardTitle>
                <CardDescription>
                  Link your Strava account to automatically track your activities
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-2">
                  <span className="text-2xl font-bold text-green-600">2</span>
                </div>
                <CardTitle>Stay Active</CardTitle>
                <CardDescription>
                  Exercise for at least 30 minutes every day to maintain your streak
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center mb-2">
                  <span className="text-2xl font-bold text-orange-600">3</span>
                </div>
                <CardTitle>Track Progress</CardTitle>
                <CardDescription>
                  Watch your streak grow and compete with others on the leaderboard
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 30x30 Challenge. Built with Next.js, Shadcn UI, and Supabase.</p>
        </div>
      </footer>
    </div>
  );
}
