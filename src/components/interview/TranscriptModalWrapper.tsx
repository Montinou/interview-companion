'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { TranscriptPanel } from './TranscriptPanel';

interface TranscriptModalWrapperProps {
  interviewId: number;
  isLive: boolean;
}

export function TranscriptModalWrapper({ interviewId, isLive }: TranscriptModalWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all hover:scale-105 z-30 group"
        aria-label="Open transcript"
      >
        <FileText className="h-6 w-6" />
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Ver Transcript
        </span>
      </button>

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
