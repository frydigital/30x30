'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, User, Settings, LayoutDashboard, Users, Shield, BarChart3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEffect, useState } from 'react';
import { isSuperadmin } from '@/lib/superadmin';
import { SidebarGroup, SidebarMenuButton, SidebarMenuItem } from '../ui/sidebar';

interface AppHeaderProps {
  organizationSlug?: string;
  organizationName?: string;
  userRole?: 'member' | 'admin' | 'owner';
  userName?: string;
  userEmail?: string;
  userAvatarUrl?: string;
}

export function AppLogo({
  organizationSlug,
  organizationName,
  userRole,
  userName,
  userEmail,
  userAvatarUrl,
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

           
          </div>
        </div>
      </div>
    </header>
  );
}
