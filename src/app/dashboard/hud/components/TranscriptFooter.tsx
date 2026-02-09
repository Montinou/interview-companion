'use client';
import { useState } from 'react';
import type { TranscriptEntry } from '../page';

type Props = { transcripts: TranscriptEntry[] };

export default function TranscriptFooter({ transcripts }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const last = transcripts.slice(-3);

  if (collapsed) {
    return (
      <div className="h-6 bg-[#111118] border-t border-gray-800 flex items-center px-4 cursor-pointer shrink-0"
        onClick={() => setCollapsed(false)}>
        <span className="text-gray-600 text-xs">📜 Transcript (click to expand) · {transcripts.length} utterances</span>
      </div>
    );
  }

  return (
    <div className="h-16 bg-[#111118] border-t border-gray-800 shrink-0 relative mt-2">
      <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-[#111118] to-transparent z-10 pointer-events-none" />
      <button onClick={() => setCollapsed(true)}
        className="absolute top-1 right-2 text-gray-600 text-[10px] z-20 hover:text-gray-400">collapse</button>
      <div className="h-full overflow-hidden px-4 pt-4 pb-1 flex flex-col justify-end">
        {last.map((e, i) => (
          <div key={i} className={`text-xs leading-tight truncate ${i < last.length - 1 ? 'opacity-40' : 'opacity-90'}`}>
            <span className={`font-semibold ${e.speaker === 'Host' ? 'text-blue-400' : 'text-amber-400'}`}>{e.speaker}:</span>
            {' '}
            <span className="text-gray-300">{e.text}</span>
          </div>
        ))}
        {!last.length && <div className="text-gray-600 text-xs">Esperando transcript...</div>}
      </div>
    </div>
  );
}
