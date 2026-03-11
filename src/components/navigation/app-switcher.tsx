'use client';

import { createClient } from '@/lib/supabase/client';
import { isSuperadmin } from '@/lib/superadmin';
import { Shield } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AppSwitcherProps {
  organizationSlug?: string;
  organizationName?: string;
  userRole?: 'member' | 'admin' | 'owner';
  userName?: string;
  userEmail?: string;
  userAvatarUrl?: string;
}

export function AppSwitcher({
  organizationSlug,
  organizationName,
  userRole,

}: AppSwitcherProps) {
  const pathname = usePathname();
  const [isSuper, setIsSuper] = useState(false);

  useEffect(() => {
    const checkSuperadmin = async () => {
      const supabase = createClient();
      const isSuperUser = await isSuperadmin(supabase);
      setIsSuper(isSuperUser);
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

