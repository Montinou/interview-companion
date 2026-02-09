'use client';
import { useEffect, useRef } from 'react';
import type { InsightEntry } from '../page';

type Props = { insights: InsightEntry[] };

export default function SuggestionsPanel({ insights }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = 0; }, [insights]);

  const sorted = [...insights].reverse();

  return (
    <div className="bg-[#111118] rounded-lg border border-gray-800 flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-800 shrink-0">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">💡 Sugerencias</h3>
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {!sorted.length ? (
          <div className="text-gray-600 text-center py-4 text-sm">Esperando análisis...</div>
        ) : sorted.map((ins, i) => {
          const p = ins.parsed;
          const followUp = p?.follow_up;
          const maturity = p?.maturity;
          const flag = p?.flag;
          const insight = p?.insight;

          return (
            <div key={i} className="bg-purple-950/20 border border-purple-800/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-purple-400 text-[10px] font-semibold">T1</span>
                <span className="text-gray-600 text-[10px]">{ins.time}</span>
              </div>
              {followUp && <p className="text-gray-200 text-sm leading-snug mb-1">{followUp}</p>}
              <div className="flex flex-wrap gap-1 mt-1">
                {maturity && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-900/30 text-yellow-300 border border-yellow-800/30">
                    🧠 {maturity}
                  </span>
                )}
                {flag && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-900/30 text-orange-300 border border-orange-800/30">
                    ⚠️ {flag}
                  </span>
                )}
                {insight && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-800/30">
                    💡 {insight}
                  </span>
                )}
              </div>
              {!followUp && !p && (
                <p className="text-gray-400 text-xs">{ins.analysis?.substring(0, 150)}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
