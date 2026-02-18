'use client';

import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';

/**
 * Client component for Clerk UI (org switcher + user button).
 * Isolated so if Clerk fails, the rest of the nav still renders.
 */
export function DashboardNav() {
  try {
    return (
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
    );
  } catch {
    // If Clerk components fail, show minimal fallback
    return (
      <div className="flex items-center gap-4">
        <a
          href="/"
          className="px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-sm"
        >
          Sign Out
        </a>
      </div>
    );
  }
}
