'use client';

import { OrganizationProfile } from '@clerk/nextjs';

export default function TeamPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          👥 Team Management
        </h1>
        <p className="text-gray-400 mt-1">
          Manage your organization, invite interviewers, and assign roles
        </p>
      </div>

      <div className="rounded-xl overflow-hidden">
        <OrganizationProfile
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'bg-[#111118] border border-gray-800 shadow-none',
              navbar: 'bg-[#0d0d14] border-r border-gray-800',
              navbarButton: 'text-gray-400 hover:text-white',
              navbarButtonActive: 'text-white bg-gray-800',
              pageScrollBox: 'bg-[#111118]',
              headerTitle: 'text-white',
              headerSubtitle: 'text-gray-400',
              profileSectionTitle: 'text-white',
              profileSectionContent: 'text-gray-300',
              formFieldLabel: 'text-gray-300',
              formFieldInput: 'bg-gray-800 border-gray-700 text-white',
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
              membersPageInviteButton: 'bg-blue-600 hover:bg-blue-700',
              tableHead: 'text-gray-400',
              tableBody: 'text-gray-300',
            },
          }}
        />
      </div>
    </div>
  );
}
