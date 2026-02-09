'use client';
import { useEffect, useRef } from 'react';
import type { InsightEntry } from '../page';

type Props = { insights: InsightEntry[] };

function tryParseContent(ins: InsightEntry) {
  const p = ins.parsed;
  if (p && Object.keys(p).length > 0) return p;
  // Try to parse analysis as JSON (may have markdown wrapping)
  try {
    let raw = ins.analysis || '';
    if (raw.startsWith('```json')) raw = raw.slice(7);
    else if (raw.startsWith('```')) raw = raw.slice(3);
    if (raw.endsWith('```')) raw = raw.slice(0, -3);
    return JSON.parse(raw.trim());
  } catch { return null; }
}

export default function SuggestionsPanel({ insights }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = 0; }, [insights]);

  const sorted = [...insights].reverse();

  return (
    <div className="bg-[#111118] rounded-lg border border-gray-800/60 flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-800/60 shrink-0">
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">💡 AI Suggestions</h3>
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {!sorted.length ? (
          <div className="text-gray-500 text-center py-4 text-sm">Esperando análisis...</div>
        ) : sorted.map((ins, i) => {
          const p = tryParseContent(ins);
          const followUp = p?.follow_up;
          const maturity = p?.maturity;
          const flag = p?.flag;
          const insight = p?.insight;
          const pivot = p?.pivot;
          const sentiment = p?.sentiment;
          const content = ins.parsed?.follow_up || ins.parsed?.insight || ins.parsed?.flag || ins.trigger || '';

          const tierLabel = ins.tier === 1 ? 'T1 · Fast' : 'T2 · Deep';
          const tierColor = ins.tier === 1 ? 'text-cyan-400' : 'text-purple-400';

          return (
            <div key={i} className="bg-gray-900/60 border border-gray-700/40 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold ${tierColor}`}>{tierLabel}</span>
                <span className="text-gray-400 text-[10px]">{ins.time}</span>
              </div>
              {followUp && <p className="text-gray-100 text-sm leading-snug mb-1.5">❓ {followUp}</p>}
              {content && !followUp && <p className="text-gray-200 text-sm leading-snug mb-1.5">{content}</p>}
              <div className="flex flex-wrap gap-1 mt-1">
                {maturity && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-900/40 text-yellow-200 border border-yellow-700/40">
                    🧠 {maturity}
                  </span>
                )}
                {flag && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-900/40 text-orange-200 border border-orange-700/40">
                    ⚠️ {flag}
                  </span>
                )}
                {insight && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-200 border border-emerald-700/40">
                    💡 {insight}
                  </span>
                )}
                {pivot && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-200 border border-blue-700/40">
                    🔄 {pivot}
                  </span>
                )}
                {sentiment && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-900/40 text-pink-200 border border-pink-700/40">
                    💭 {sentiment}
                  </span>
                )}
              </div>
              {!followUp && !content && !p && (
                <p className="text-gray-300 text-xs">{ins.analysis?.substring(0, 200)}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
