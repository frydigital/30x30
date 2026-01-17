import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getPlatformStatistics, isSuperadmin } from "@/lib/superadmin";
import { Activity, Building2, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SuperadminDashboard() {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect("/login?error=unauthorized");
  }

  // Check superadmin status
  const isSuper = await isSuperadmin(supabase, user.id);
  
  if (!isSuper) {
    // Debug: Check if user exists in superadmins table
    const { data: superadminCheck } = await supabase
      .from('superadmins')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    console.log('Superadmin check failed for user:', user.id);
    console.log('Superadmin table entry:', superadminCheck);
    
    redirect("/dashboard?error=unauthorized");
  }

  // Get platform statistics
  const { data: stats } = await getPlatformStatistics(supabase);

  return (
    <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Organizations
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_organizations || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.active_organizations || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Users
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.active_users_30d || 0} active (30d)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Activities (30d)
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_activities_30d || 0}</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Growth
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+12%</div>
              <p className="text-xs text-muted-foreground">
                vs. last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Subscriptions by Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Subscriptions by Plan</CardTitle>
            <CardDescription>Active subscriptions breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.subscriptions_by_plan.map((plan) => (
                <div key={plan.plan_name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-medium">{plan.plan_name}</span>
                  </div>
                  <span className="text-muted-foreground">{plan.count} orgs</span>
                </div>
              ))}
              {(!stats?.subscriptions_by_plan || stats.subscriptions_by_plan.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No subscription data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <Link href="/superadmin/organizations">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Manage Organizations
                </CardTitle>
                <CardDescription>
                  View and manage all organizations
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <Link href="/superadmin/subscriptions">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Manage Subscriptions
                </CardTitle>
                <CardDescription>
                  View plans and billing
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <Link href="/superadmin/users">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Manage Users
                </CardTitle>
                <CardDescription>
                  View and manage user accounts
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>
      </>
  );
}
