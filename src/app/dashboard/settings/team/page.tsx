'use client';

import { OrganizationProfile } from '@clerk/nextjs';

export default function TeamPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          👥 Team Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization, invite interviewers, and assign roles
        </p>
      </div>

      <div className="rounded-xl overflow-hidden">
        <OrganizationProfile
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'bg-card border border-border shadow-none',
              navbar: 'bg-background border-r border-border',
              navbarButton: 'text-muted-foreground hover:text-foreground',
              navbarButtonActive: 'text-foreground bg-accent',
              pageScrollBox: 'bg-card',
              headerTitle: 'text-foreground',
              headerSubtitle: 'text-muted-foreground',
              profileSectionTitle: 'text-foreground',
              profileSectionContent: 'text-foreground/80',
              formFieldLabel: 'text-foreground/80',
              formFieldInput: 'bg-input border-border text-foreground',
              formButtonPrimary: 'bg-primary hover:bg-primary/90',
              membersPageInviteButton: 'bg-primary hover:bg-primary/90',
              tableHead: 'text-muted-foreground',
              tableBody: 'text-foreground/80',
            },
          }}
        />
      </div>
    </div>
  );
}
