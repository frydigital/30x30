"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Building2, Settings, Users } from "lucide-react";
import { extractSubdomain } from "@/lib/organizations/subdomain";
import type { Organization, OrganizationRole } from "@/lib/types";

export function OrganizationHeader() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<OrganizationRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrganization = async () => {
      const supabase = createClient();
      
      // Get organization from subdomain
      const hostname = window.location.hostname;
      const slug = extractSubdomain(hostname) || new URLSearchParams(window.location.search).get('org');
      
      if (!slug) {
        setLoading(false);
        return;
      }

      try {
        // Load organization
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .single();

        if (org) {
          setOrganization(org);

          // Get user's role
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: member } = await supabase
              .from('organization_members')
              .select('role')
              .eq('organization_id', org.id)
              .eq('user_id', user.id)
              .single();

            setUserRole(member?.role || null);
          }
        }
      } catch (error) {
        console.error('Error loading organization:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrganization();
  }, []);

  if (loading || !organization) {
    return null;
  }

  const isAdmin = userRole === 'owner' || userRole === 'admin';

  return (
    <div className="border-b bg-card">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-semibold">{organization.name}</h2>
              <p className="text-xs text-muted-foreground">
                {organization.slug}.30x30.app
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/org/admin">
                  <Settings className="w-4 h-4 mr-2" />
                  Admin
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/org/leaderboard">
                <Users className="w-4 h-4 mr-2" />
                Team
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
