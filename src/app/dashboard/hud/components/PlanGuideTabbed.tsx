'use client';

import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { InterviewGuide } from '@/components/interview/InterviewGuide';
import { InterviewPlan } from '@/components/interview/InterviewPlan';
import NotesPanel from './NotesPanel';

interface PlanGuideTabbedProps {
  interviewId: number | null;
  candidateName: string;
  candidateTitle?: string;
  jiraTicket?: string;
  profile?: any;
}

export default function PlanGuideTabbed({
  interviewId,
  candidateName,
  candidateTitle,
  jiraTicket,
  profile,
}: PlanGuideTabbedProps) {
  return (
    <Card className="flex flex-col h-full p-0 overflow-hidden">
      <Tabs defaultValue="plan" className="flex flex-col h-full">
        <TabsList className="w-full rounded-none border-b border-border shrink-0 h-auto p-0 bg-transparent">
          <TabsTrigger 
            value="plan" 
            className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary text-xs font-semibold uppercase tracking-wider"
          >
            <span className="mr-1">📋</span>
            Plan
          </TabsTrigger>
          <TabsTrigger 
            value="guide" 
            className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary text-xs font-semibold uppercase tracking-wider"
          >
            <span className="mr-1">📖</span>
            Guide
          </TabsTrigger>
          <TabsTrigger 
            value="notes" 
            className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary text-xs font-semibold uppercase tracking-wider"
          >
            <span className="mr-1">📝</span>
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="flex-1 min-h-0 m-0 overflow-hidden">
          {interviewId ? (
            <div className="h-full overflow-y-auto">
              <InterviewPlan interviewId={interviewId} />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              No interview selected
            </div>
          )}
        </TabsContent>

        <TabsContent value="guide" className="flex-1 min-h-0 m-0 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <InterviewGuide
              candidateName={candidateName}
              candidateTitle={candidateTitle}
              jiraTicket={jiraTicket}
              profile={profile}
            />
          </div>
        </TabsContent>

        <TabsContent value="notes" className="flex-1 min-h-0 m-0 overflow-hidden">
          <div className="h-full">
            <NotesPanel />
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
