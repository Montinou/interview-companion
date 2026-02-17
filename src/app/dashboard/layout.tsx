import Link from 'next/link';
import { Home, FileText, Sparkles, LayoutDashboard, Settings, Users } from 'lucide-react';
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navItems = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/dashboard/interviews', label: 'Interviews', icon: FileText },
    { href: '/dashboard/candidates', label: 'Candidates', icon: Users },
    { href: '/dashboard/profiles', label: 'Profiles', icon: Sparkles },
    { href: '/dashboard/hud', label: 'HUD', icon: LayoutDashboard },
    { href: '/dashboard/settings/team', label: 'Team', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Top Navigation */}
      <nav className="border-b border-gray-800 bg-[#111118]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-xl font-bold text-white">
                Interview Companion
              </Link>
              <div className="flex gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right side: Org Switcher + User */}
            <div className="flex items-center gap-4">
              <OrganizationSwitcher
                hidePersonal={false}
                afterCreateOrganizationUrl="/dashboard"
                afterSelectOrganizationUrl="/dashboard"
                afterLeaveOrganizationUrl="/dashboard"
                appearance={{
                  elements: {
                    rootBox: 'flex items-center',
                    organizationSwitcherTrigger:
                      'px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-sm',
                  },
                }}
              />
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: 'h-8 w-8',
                  },
                }}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main>{children}</main>
    </div>
  );
}
