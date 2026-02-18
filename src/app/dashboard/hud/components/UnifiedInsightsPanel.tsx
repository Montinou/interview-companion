'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { InsightEntry } from '../page';

interface UnifiedInsightsPanelProps {
  insights: InsightEntry[];
}

export default function UnifiedInsightsPanel({ insights }: UnifiedInsightsPanelProps) {
  // Sort by time, newest first
  const sorted = [...insights].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <Card className="flex flex-col h-full">
      {/* Header */}
      <CardHeader className="px-3 py-2 shrink-0">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          💡 Insights & Suggestions
        </h3>
      </CardHeader>

      {/* Scrollable feed */}
      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-2">
            {sorted.length === 0 && (
              <div className="text-center text-muted-foreground text-sm mt-8">
                No insights yet...
              </div>
            )}
            {sorted.map((insight, idx) => (
              <InsightCard key={idx} insight={insight} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
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
          <span className="text-muted-foreground text-xs font-mono">{insight.time}</span>
          <Badge variant={insight.tier === 2 ? "default" : "secondary"} className="text-xs">
            T{insight.tier}
          </Badge>
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
          <div className="text-foreground">{parsed.insight}</div>
        )}
        {parsed.flag && (
          <div className="text-foreground font-medium">{parsed.flag}</div>
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
            <Badge variant="secondary" className="text-xs">
              {parsed.topic}
            </Badge>
          )}
          {parsed.sentiment && (
            <Badge variant="secondary" className="text-xs">
              {parsed.sentiment}
            </Badge>
          )}
          {parsed.evidence && (
            <Badge variant="secondary" className="text-xs">
              📎 evidence
            </Badge>
          )}
          {parsed.score !== undefined && (
            <Badge variant="secondary" className="text-xs">
              ⭐ {parsed.score}/10
            </Badge>
          )}
          {parsed.response_quality && (
            <Badge variant="secondary" className="text-xs">
              {parsed.response_quality}
            </Badge>
          )}
        </div>

        {/* Evidence detail */}
        {parsed.evidence && typeof parsed.evidence === 'string' && (
          <div className="text-xs text-muted-foreground italic mt-1 pl-2 border-l-2 border-border">
            {parsed.evidence}
          </div>
        )}
      </div>
    </div>
  );
}
