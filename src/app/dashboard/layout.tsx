import Link from 'next/link';
import { Home, FileText, Sparkles, LayoutDashboard, Settings, Users } from 'lucide-react';
import { DashboardNav } from '@/components/DashboardNav';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: 'Home' },
  { href: '/dashboard/interviews', label: 'Interviews', icon: 'FileText' },
  { href: '/dashboard/candidates', label: 'Candidates', icon: 'Users' },
  { href: '/dashboard/profiles', label: 'Profiles', icon: 'Sparkles' },
  { href: '/dashboard/hud', label: 'HUD', icon: 'LayoutDashboard' },
  { href: '/dashboard/settings/team', label: 'Team', icon: 'Settings' },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, FileText, Users, Sparkles, LayoutDashboard, Settings,
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top Navigation — fixed, never scrolls */}
      <nav className="shrink-0 border-b border-border bg-card z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-lg font-bold text-foreground">
                Interview Companion
              </Link>
              <div className="flex gap-1">
                {navItems.map((item) => {
                  const Icon = iconMap[item.icon];
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right side: Org Switcher + User (client component) */}
            <DashboardNav />
          </div>
        </div>
      </nav>

      {/* Page Content — scrolls independently */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
