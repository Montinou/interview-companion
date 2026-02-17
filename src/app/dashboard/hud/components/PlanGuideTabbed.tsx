'use client';

import { useState } from 'react';
import { InterviewGuide } from '@/components/interview/InterviewGuide';
import { InterviewPlan } from '@/components/interview/InterviewPlan';
import NotesPanel from './NotesPanel';

type Tab = 'plan' | 'guide' | 'notes';

interface PlanGuideTabbedProps {
  interviewId: number | null;
  candidateName: string;
  candidateTitle?: string;
  jiraTicket?: string;
}

export default function PlanGuideTabbed({
  interviewId,
  candidateName,
  candidateTitle,
  jiraTicket,
}: PlanGuideTabbedProps) {
  const [activeTab, setActiveTab] = useState<Tab>('plan');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'plan', label: 'Plan', icon: '📋' },
    { id: 'guide', label: 'Guide', icon: '📖' },
    { id: 'notes', label: 'Notes', icon: '📝' },
  ];

  return (
    <div className="bg-[#111118] rounded-lg border border-gray-800 flex flex-col h-full">
      {/* Tab buttons */}
      <div className="flex border-b border-gray-800 shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === tab.id
                ? 'bg-gray-800 text-gray-200 border-b-2 border-indigo-500'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'plan' && interviewId && (
          <div className="h-full overflow-y-auto">
            <InterviewPlan interviewId={interviewId} />
          </div>
        )}
        {activeTab === 'plan' && !interviewId && (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            No interview selected
          </div>
        )}
        {activeTab === 'guide' && (
          <div className="h-full overflow-y-auto">
            <InterviewGuide
              candidateName={candidateName}
              candidateTitle={candidateTitle}
              jiraTicket={jiraTicket}
            />
          </div>
        )}
        {activeTab === 'notes' && (
          <div className="h-full">
            <NotesPanel />
          </div>
        )}
      </div>
    </div>
  );
}
