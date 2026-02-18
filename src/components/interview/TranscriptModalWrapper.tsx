'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { TranscriptPanel } from './TranscriptPanel';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TranscriptModalWrapperProps {
  interviewId: number;
  isLive: boolean;
}

export function TranscriptModalWrapper({ interviewId, isLive }: TranscriptModalWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="fixed bottom-6 right-6 p-4 h-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all hover:scale-105 z-30"
              aria-label="Open transcript"
            >
              <FileText className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Ver Transcript</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Transcript Modal */}
      <TranscriptPanel
        interviewId={interviewId}
        isLive={isLive}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
