'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  FileText,
  Users,
  Sparkles,
  LayoutDashboard,
  Settings,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DashboardNav } from '@/components/DashboardNav';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home, exact: true },
  { href: '/dashboard/interviews', label: 'Interviews', icon: FileText },
  { href: '/dashboard/candidates', label: 'Candidates', icon: Users },
  { href: '/dashboard/profiles', label: 'Profiles', icon: Sparkles },
  { href: '/dashboard/hud', label: 'HUD', icon: LayoutDashboard },
  { href: '/dashboard/settings/team', label: 'Team', icon: Settings },
];

const COLLAPSED_KEY = 'sidebar-collapsed';

export function DashboardSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // HUD pages get full viewport — no sidebar
  const isFullscreen = pathname.startsWith('/dashboard/live-interview') || pathname.startsWith('/dashboard/hud');
  if (isFullscreen) {
    return <>{children}</>;
  }

  // Hydrate collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored === 'true') setCollapsed(true);
    setMounted(true);
  }, []);

  // Persist collapsed state
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSED_KEY, String(next));
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile menu on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  // Prevent flash of wrong state
  const sidebarCollapsed = mounted ? collapsed : false;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-screen flex bg-background overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className={cn(
          'hidden md:flex flex-col border-r border-border bg-card transition-all duration-200 shrink-0',
          sidebarCollapsed ? 'w-14' : 'w-56',
        )}>
          {/* Header: Logo + Collapse toggle */}
          <div className={cn(
            'flex items-center h-14 border-b border-border shrink-0',
            sidebarCollapsed ? 'justify-center px-1' : 'justify-between px-3'
          )}>
            {!sidebarCollapsed && (
              <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm font-bold text-foreground truncate">
                  IC
                </span>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={toggleCollapsed}
              title={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
            {navItems.map((item) => {
              const active = isActive(item);
              const linkContent = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                    sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );

              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }
              return <div key={item.href}>{linkContent}</div>;
            })}
          </nav>

          {/* Bottom: Org Switcher + User */}
          <div className={cn(
            'border-t border-border p-2 shrink-0',
            sidebarCollapsed && 'flex justify-center'
          )}>
            <DashboardNav />
          </div>
        </aside>

        {/* Mobile: Top bar with hamburger */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-border bg-card shrink-0 z-40">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <Link href="/dashboard" className="text-sm font-bold text-foreground">
                Interview Companion
              </Link>
            </div>
            <DashboardNav />
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>

        {/* Mobile Overlay */}
        {mobileOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 bg-black/60 z-50"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="md:hidden fixed inset-y-0 left-0 w-64 bg-card border-r border-border z-50 flex flex-col animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between px-4 h-14 border-b border-border">
                <span className="text-sm font-bold text-foreground">Menu</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
                {navItems.map((item) => {
                  const active = isActive(item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
