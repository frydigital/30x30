import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Flame, Trophy, Users, Building2, Target } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  
  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();

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
            your team!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <>
                <Button asChild size="lg" className="text-lg px-8">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="text-lg px-8">
                  <Link href="/create-organization">Create Organization</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg" className="text-lg px-8">
                  <Link href="/login">Join the Challenge</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="text-lg px-8">
                  <Link href="/create-organization">Create Organization</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg">
              Create your organization and start your team's fitness journey
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Create Your Organization</CardTitle>
                <CardDescription>
                  Set up your team, gym, or company's 30x30 challenge with custom start dates and goals
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
                  Invite members to join your organization and participate in the challenge together
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle>Track & Compete</CardTitle>
                <CardDescription>
                  Monitor progress on your team's leaderboard and stay motivated together
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Activity Tracking */}
      <section className="py-12 px-4 bg-muted/50">
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
                      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
                    </svg>
                  </div>
                  <h3 className="font-semibold mb-1">Strava</h3>
                  <p className="text-sm text-muted-foreground">Auto-sync activities</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#007CC3">
                      <path d="M12.5 2.5C7.27 2.5 3 6.77 3 12s4.27 9.5 9.5 9.5 9.5-4.27 9.5-9.5-4.27-9.5-9.5-9.5zM17 12c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1s1 .45 1 1v3h2c.55 0 1 .45 1 1z"/>
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
