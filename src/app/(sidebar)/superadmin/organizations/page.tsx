"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Users, 
  Search, 
  MoreVertical, 
  Power, 
  PowerOff,
  ExternalLink,
  Settings
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OrganizationStatistics } from "@/lib/types";

export default function OrganizationsManagement() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrganizationStatistics[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<OrganizationStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    // Filter organizations based on search query
    if (searchQuery.trim() === "") {
      setFilteredOrgs(organizations);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredOrgs(
        organizations.filter(
          (org) =>
            org.name.toLowerCase().includes(query) ||
            org.slug.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, organizations]);

  const loadOrganizations = async () => {
    const supabase = createClient();
    
    try {
      setLoading(true);
      setError(null);

      // Load organization statistics
      const { data, error: fetchError } = await supabase
        .from("organization_statistics")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setOrganizations(data || []);
      setFilteredOrgs(data || []);
    } catch (err) {
      console.error("Error loading organizations:", err);
      setError("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (orgId: string, currentStatus: boolean) => {
    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ is_active: !currentStatus })
        .eq("id", orgId);

      if (error) throw error;

      // Reload organizations
      await loadOrganizations();
    } catch (err) {
      console.error("Error toggling organization status:", err);
      alert("Failed to update organization status");
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-600">Active</Badge>;
      case "trialing":
        return <Badge variant="secondary">Trial</Badge>;
      case "past_due":
        return <Badge variant="destructive">Past Due</Badge>;
      case "canceled":
        return <Badge variant="outline">Canceled</Badge>;
      default:
        return <Badge variant="outline">None</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Organizations</h2>
          <p className="text-muted-foreground">
            Manage all organizations on the platform
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Organizations List */}
      {error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive text-center">{error}</p>
          </CardContent>
        </Card>
      )}

      {filteredOrgs.length === 0 && !error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              {searchQuery ? "No organizations found" : "No organizations yet"}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {filteredOrgs.map((org) => (
          <Card key={org.id} className={!org.is_active ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-primary" />
                    <CardTitle>{org.name}</CardTitle>
                    {!org.is_active && (
                      <Badge variant="outline" className="text-red-600">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="mt-1">
                    {org.slug}.30x30.app • Created {new Date(org.created_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(org.subscription_status)}
                  {org.plan_name && (
                    <Badge variant="secondary">{org.plan_name}</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Members</p>
                  <p className="text-2xl font-bold">{org.member_count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Owners</p>
                  <p className="text-2xl font-bold">{org.owner_count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Admins</p>
                  <p className="text-2xl font-bold">{org.admin_count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active (30d)</p>
                  <p className="text-2xl font-bold">{org.active_users_30d}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Activities (30d)</p>
                  <p className="text-2xl font-bold">{org.total_activities_30d}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`https://${org.slug}.30x30.app`} target="_blank">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Visit Site
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/superadmin/organizations/${org.id}`}>
                    <Settings className="w-4 h-4 mr-2" />
                    Manage
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant={org.is_active ? "destructive" : "default"}
                  onClick={() => handleToggleActive(org.id, org.is_active)}
                >
                  {org.is_active ? (
                    <>
                      <PowerOff className="w-4 h-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4 mr-2" />
                      Activate
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
