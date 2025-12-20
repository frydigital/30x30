import { ReactNode } from "react";
import Link from "next/link";
import { Crown, Building2, CreditCard, Users, BarChart3 } from "lucide-react";

export default function SuperadminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const navItems = [
    {
      href: "/superadmin",
      label: "Dashboard",
      icon: BarChart3,
    },
    {
      href: "/superadmin/organizations",
      label: "Organizations",
      icon: Building2,
    },
    {
      href: "/superadmin/subscriptions",
      label: "Subscriptions",
      icon: CreditCard,
    },
    {
      href: "/superadmin/users",
      label: "Users",
      icon: Users,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="flex h-16 items-center px-6">
          <Link href="/superadmin" className="flex items-center gap-2 font-bold text-lg">
            <Crown className="w-6 h-6 text-yellow-500" />
            <span>Superadmin</span>
          </Link>
          
          <nav className="ml-8 flex gap-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Exit Superadmin
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6">
        {children}
      </main>
    </div>
  );
}
