'use client';

import { InsightEntry } from '../page';

interface UnifiedInsightsPanelProps {
  insights: InsightEntry[];
}

export default function UnifiedInsightsPanel({ insights }: UnifiedInsightsPanelProps) {
  // Sort by time, newest first
  const sorted = [...insights].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="bg-[#111118] rounded-lg border border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-800 shrink-0">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          💡 Insights & Suggestions
        </h3>
      </div>

      {/* Scrollable feed */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {sorted.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-8">
            No insights yet...
          </div>
        )}
        {sorted.map((insight, idx) => (
          <InsightCard key={idx} insight={insight} />
        ))}
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: InsightEntry }) {
  const parsed = insight.parsed || {};

  // Determine type icon and color
  let icon = '💡';
  let typeLabel = 'Insight';
  let typeBg = 'bg-blue-500/10';
  let typeText = 'text-blue-400';
  let typeBorder = 'border-blue-500/30';

  if (parsed.red_flags && parsed.red_flags.length > 0) {
    icon = '🔴';
    typeLabel = 'Red Flag';
    typeBg = 'bg-red-500/10';
    typeText = 'text-red-400';
    typeBorder = 'border-red-500/30';
  } else if (parsed.green_flags && parsed.green_flags.length > 0) {
    icon = '🟢';
    typeLabel = 'Green Flag';
    typeBg = 'bg-green-500/10';
    typeText = 'text-green-400';
    typeBorder = 'border-green-500/30';
  } else if (parsed.flag && parsed.flag.startsWith('⚡')) {
    icon = '⚡';
    typeLabel = 'Contradiction';
    typeBg = 'bg-yellow-500/10';
    typeText = 'text-yellow-400';
    typeBorder = 'border-yellow-500/30';
  } else if (parsed.follow_up) {
    icon = '📌';
    typeLabel = 'Suggestion';
    typeBg = 'bg-purple-500/10';
    typeText = 'text-purple-400';
    typeBorder = 'border-purple-500/30';
  }

  return (
    <div className={`rounded-lg border ${typeBorder} ${typeBg} p-3 text-sm`}>
      {/* Header row: time, tier, type */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs font-mono">{insight.time}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${insight.tier === 2 ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300'}`}>
            T{insight.tier}
          </span>
        </div>
        <span className={`text-xs ${typeText} flex items-center gap-1`}>
          <span>{icon}</span>
          {typeLabel}
        </span>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {/* Main insight/flag text */}
        {parsed.insight && (
          <div className="text-gray-200">{parsed.insight}</div>
        )}
        {parsed.flag && (
          <div className="text-gray-200 font-medium">{parsed.flag}</div>
        )}
        {parsed.red_flags && parsed.red_flags.map((flag: string, i: number) => (
          <div key={i} className="text-red-300">{flag}</div>
        ))}
        {parsed.green_flags && parsed.green_flags.map((flag: string, i: number) => (
          <div key={i} className="text-green-300">{flag}</div>
        ))}

        {/* Follow-up/suggestion */}
        {parsed.follow_up && (
          <div className="text-purple-300 text-xs mt-1">
            💬 {parsed.follow_up}
          </div>
        )}

        {/* Tags row */}
        <div className="flex flex-wrap gap-1 mt-2">
          {parsed.topic && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-300">
              {parsed.topic}
            </span>
          )}
          {parsed.sentiment && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-300">
              {parsed.sentiment}
            </span>
          )}
          {parsed.evidence && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-300">
              📎 evidence
            </span>
          )}
          {parsed.score !== undefined && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-300">
              ⭐ {parsed.score}/10
            </span>
          )}
          {parsed.response_quality && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-300">
              {parsed.response_quality}
            </span>
          )}
        </div>

        {/* Evidence detail */}
        {parsed.evidence && typeof parsed.evidence === 'string' && (
          <div className="text-xs text-gray-400 italic mt-1 pl-2 border-l-2 border-gray-700">
            {parsed.evidence}
          </div>
        )}
      </div>
    </div>
  );
}
