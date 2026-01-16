'use client';

import { extractSubdomain } from '@/lib/organizations/subdomain';
import { createClient } from '@/lib/supabase/client';
import { isSuperadmin } from '@/lib/superadmin';
import type { Organization, OrganizationRole } from '@/lib/types';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AppSidebar, type SidebarData } from './app-sidebar';
import { NavMainItem } from './nav-main';
import { NavProject } from './nav-projects';
import { NavUser } from './nav-user';
import { NavTeam } from './team-switcher';

export function ClientAppHeader() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<OrganizationRole | null>(null);
  const [userName, setUserName] = useState<string | undefined>();
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [isSuper, setIsSuper] = useState(false);
  const pathname = usePathname();

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

        // Check superadmin status
        const isSuperUser = await isSuperadmin(supabase);
        setIsSuper(isSuperUser);

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

  // Generate navigation data based on context and permissions
  const navigationData: SidebarData = useMemo(() => {
    const navMain = [] as NavMainItem[];
    const user: NavUser = {
      name: userName || 'User',
      email: userEmail || '',
      avatar: userAvatarUrl || '',
    };
    const teams = [] as NavTeam[]
    const projects = [] as NavProject[]
    const orgSlug = organization?.slug;

    // Dashboard section
    if (orgSlug) {
      navMain.push({
        title: 'Dashboard',
        url: `/org/leaderboard?org=${orgSlug}`,
        items: [
          {
            title: 'Leaderboard',
            url: `/org/leaderboard?org=${orgSlug}`,

          },
          {
            title: 'My Activity',
            url: `/org/activity?org=${orgSlug}`,

          },
        ],
      });
    } else {
      navMain.push({
        title: 'Dashboard',
        url: '/dashboard',
        isActive: pathname === '/dashboard',
        items: [
          {
            title: 'Overview',
            url: '/dashboard',
          },
        ],
      });
    }

    // Organization Admin section (admin and owner only)
    if (orgSlug && (userRole === 'admin' || userRole === 'owner')) {
      navMain.push({
        title: 'Organization',
        url: `/org/admin?org=${orgSlug}`,
        isActive: pathname?.startsWith('/org/admin'),

        items: [
          {
            title: 'Members',
            url: `/org/admin?org=${orgSlug}`,
          },
          {
            title: 'Settings',
            url: `/org/settings?org=${orgSlug}`,

          },
        ],
      });
    }

    // Superadmin section (only on root domain)
    if (isSuper && !orgSlug) {
      navMain.push({
        title: 'Superadmin',
        url: '/superadmin',
        isActive: pathname === '/superadmin',

        items: [
          {
            title: 'Dashboard',
            url: '/superadmin',
          },
          {
            title: 'Organizations',
            url: '/superadmin/organizations',

          },
          {
            title: 'Subscriptions',
            url: '/superadmin/subscriptions',

          },
        ],
      });
    }

    // Settings section (personal)
    navMain.push({
      title: 'Settings',
      url: '/settings',
      isActive: pathname?.startsWith('/settings'),
      items: [
        {
          title: 'Profile',
          url: '/settings',
        },
        {
          title: 'Connections',
          url: '/settings/connections',

        },
      ],
    });


    return { user, teams, navMain, projects };
  }, [organization?.slug, userRole, isSuper, pathname, userName, userEmail, userAvatarUrl]);

  return (
    <AppSidebar
      organizationName={organization?.name}
      data={navigationData}
    />
  );
}
