'use client';

import { AppHeader } from './app-header';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { extractSubdomain } from '@/lib/organizations/subdomain';
import type { OrganizationRole, Organization } from '@/lib/types';

export function ClientAppHeader() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<OrganizationRole | null>(null);
  const [userName, setUserName] = useState<string | undefined>();
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHeaderData = async () => {
      const supabase = createClient();
      
      try {
        // Get authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Get organization slug from subdomain or query param
        const hostname = window.location.hostname;
        const slug = extractSubdomain(hostname) || new URLSearchParams(window.location.search).get('org');

        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, email, avatar_url')
          .eq('id', user.id)
          .single();

        setUserName(profile?.username || undefined);
        setUserEmail(profile?.email || user.email || undefined);
        setUserAvatarUrl(profile?.avatar_url || undefined);

        // If in organization context, load org data and role
        if (slug) {
          const { data: org } = await supabase
            .from('organizations')
            .select('*')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

          if (org) {
            setOrganization(org);

            const { data: membership } = await supabase
              .from('organization_members')
              .select('role')
              .eq('organization_id', org.id)
              .eq('user_id', user.id)
              .single();

            if (membership) {
              setUserRole(membership.role);
            }
          }
        }
      } catch (err) {
        console.error('Error loading header data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHeaderData();
  }, []);

  if (loading) {
    return (
      <header className="border-b bg-background">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="text-xl font-bold">30x30</div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <AppHeader
      organizationSlug={organization?.slug}
      organizationName={organization?.name}
      userRole={userRole || undefined}
      userName={userName}
      userEmail={userEmail}
      userAvatarUrl={userAvatarUrl}
    />
  );
}
