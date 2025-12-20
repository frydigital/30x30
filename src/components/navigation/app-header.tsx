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

interface AppHeaderProps {
  organizationSlug?: string;
  organizationName?: string;
  userRole?: 'member' | 'admin' | 'owner';
  userName?: string;
  userEmail?: string;
  userAvatarUrl?: string;
}

export function AppHeader({
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

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const names = name.split(' ');
      return names.length > 1
        ? `${names[0][0]}${names[1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

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
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        item.active
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* User Menu */}
          {(userName || userEmail) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userAvatarUrl} alt={userName || userEmail} />
                    <AvatarFallback>{getInitials(userName, userEmail)}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userName || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
