'use client';

import { NavMainItem } from '@/components/navigation/nav-main';
import { NavUser } from '@/components/navigation/nav-user';
import { NavTeam } from '@/components/navigation/team-switcher';
import { extractSubdomain } from '@/lib/organizations/subdomain';
import { createClient } from '@/lib/supabase/client';
import { isSuperadmin } from '@/lib/superadmin';
import type { Organization, OrganizationRole } from '@/lib/types';
import { LayoutDashboard, Origami, PlusCircle, ShieldUser } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

export interface NavigationData {
  navMain: NavMainItem[];
  user: NavUser;
  teams: NavTeam[];
  organization: Organization | null;
  userRole: OrganizationRole | null;
  isSuper: boolean;
  loading: boolean;
}

interface NavigationContextType extends NavigationData {
  /**
   * Get the currently active nav item based on pathname
   */
  getActiveItem: () => NavMainItem | undefined;
  
  /**
   * Check if a specific path is currently active
   */
  isPathActive: (path: string) => boolean;
  
  /**
   * Get breadcrumb data for current path
   */
  getBreadcrumbs: () => { title: string; url: string }[];
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavDataProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<OrganizationRole | null>(null);
  const [userName, setUserName] = useState<string | undefined>();
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [isSuper, setIsSuper] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const loadNavigationData = async () => {
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
        console.error('Error loading navigation data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadNavigationData();
  }, [mounted]);

  // Generate navigation data based on context and permissions
  const navigationData = useMemo(() => {
    const navMain = [] as NavMainItem[];
    const user: NavUser = {
      name: userName || 'User',
      email: userEmail || '',
      avatar: userAvatarUrl || '',
      items: []
    };
    const teams = [] as NavTeam[];
    const orgSlug = organization?.slug;

    // Dashboard section
    if (orgSlug) {
      navMain.push({
        title: 'Dashboard',
        url: `/org/leaderboard?org=${orgSlug}`,
        icon: LayoutDashboard,
        isActive: pathname?.startsWith('/org/leaderboard') || pathname?.startsWith('/org/activity'),
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
        icon: LayoutDashboard,
        isActive: pathname === '/dashboard',
      });
    }

    navMain.push({
      title: 'Record Activity',
      url: '/activity/record',
      icon: PlusCircle,
      isActive: pathname === '/activity/record',
    });

    navMain.push({
      title: 'Create Challenge',
      url: '/create-organization',
      icon: Origami,
      isActive: pathname === '/create-organization',
    });

    // Organization Admin section (admin and owner only)
    if (orgSlug && (userRole === 'admin' || userRole === 'owner')) {
      navMain.push({
        title: 'Organization',
        url: `/org/admin?org=${orgSlug}`,
        isActive: pathname?.startsWith('/org/admin') || pathname?.startsWith('/org/settings'),
        icon: ShieldUser,
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
        isActive: pathname?.startsWith('/superadmin'),
        icon: ShieldUser,
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
    user.items!.push(
      {
        title: 'Profile',
        url: '/settings',
      },
      {
        title: 'Connections',
        url: '/settings/connections',
      }
    );

    return { navMain, user, teams };
  }, [organization?.slug, userRole, isSuper, pathname, userName, userEmail, userAvatarUrl]);

  // Helper functions
  const getActiveItem = () => {
    return navigationData.navMain.find(item => item.isActive);
  };

  const isPathActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path);
  };

  const getBreadcrumbs = () => {
    const breadcrumbs: { title: string; url: string }[] = [];
    
    // Find active main item
    const activeMain = navigationData.navMain.find(item => item.isActive);
    if (activeMain) {
      breadcrumbs.push({ title: activeMain.title, url: activeMain.url });
      
      // Check for active sub-item
      if (activeMain.items) {
        const activeSub = activeMain.items.find(subItem => pathname === subItem.url);
        if (activeSub) {
          breadcrumbs.push({ title: activeSub.title, url: activeSub.url });
        }
      }
    }
    
    return breadcrumbs;
  };

  const value: NavigationContextType = {
    ...navigationData,
    organization,
    userRole,
    isSuper,
    loading,
    getActiveItem,
    isPathActive,
    getBreadcrumbs,
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

/**
 * Hook to access navigation data and utilities
 * 
 * @example
 * ```tsx
 * const { navMain, isPathActive, getBreadcrumbs } = useNavigation();
 * ```
 */
export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavDataProvider');
  }
  return context;
}
