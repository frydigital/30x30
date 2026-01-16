'use client';

import { createClient } from '@/lib/supabase/client';
import { isSuperadmin } from '@/lib/superadmin';
import { BarChart3, LayoutDashboard, Shield, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SidebarGroup, SidebarMenuButton, SidebarMenuItem } from '../ui/sidebar';
import type { SidebarData } from './app-sidebar';

interface AppHeaderProps {
  organizationSlug?: string;
  organizationName?: string;
  userRole?: 'member' | 'admin' | 'owner';
  userName?: string;
  userEmail?: string;
  userAvatarUrl?: string;
  navigationData: SidebarData;
}

export function AppHeader({
  organizationSlug,
  organizationName,
  userRole,
  userName,
  userEmail,
  userAvatarUrl,
  navigationData,
}: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSuper, setIsSuper] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSuperadmin = async () => {
      const supabase = createClient();
      const isSuperUser = await isSuperadmin(supabase);
      setIsSuper(isSuperUser);
      setIsLoading(false);
    };
    checkSuperadmin();
  }, []);



  // Build navigation items based on context and permissions
  const navItems = [];

  // Superadmin routes (only visible on root domain)
  if (isSuper && !organizationSlug) {
    navItems.push({
      href: '/superadmin',
      label: 'Superadmin',
      icon: Shield,
      active: pathname?.startsWith('/superadmin'),
    });
  }

  // Organization routes (only visible when in org context)
  if (organizationSlug) {
    // Dashboard - all roles
    navItems.push({
      href: `/org/leaderboard?org=${organizationSlug}`,
      label: 'Leaderboard',
      icon: BarChart3,
      active: pathname?.startsWith('/org/leaderboard'),
    });

    // Admin routes - admin and owner only
    if (userRole === 'admin' || userRole === 'owner') {
      navItems.push({
        href: `/org/admin?org=${organizationSlug}`,
        label: 'Admin',
        icon: Users,
        active: pathname?.startsWith('/org/admin'),
      });
    }
  }

  // Dashboard link (root domain or org dashboard)
  if (!organizationSlug) {
    navItems.push({
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    });
  }

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link href={organizationSlug ? `/org/leaderboard?org=${organizationSlug}` : '/'} className="text-xl font-bold">
              30x30 {organizationName && <span className="text-muted-foreground">| {organizationName}</span>}
            </Link>

            {/* Navigation */}
            {!isLoading && (
              <SidebarGroup>
                <nav className="hidden md:flex items-center gap-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton
                          asChild
                          tooltip={item.label}>
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${item.active
                                ? 'bg-accent text-accent-foreground'
                                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                              }`}
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </nav>
              </SidebarGroup>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
