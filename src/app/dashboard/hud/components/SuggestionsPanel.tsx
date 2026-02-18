'use client';
import { useEffect, useRef } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
    <Card className="flex flex-col h-full">
      <CardHeader className="px-3 py-2 shrink-0">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">💡 AI Suggestions</h3>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full">
          <div ref={ref} className="p-2 space-y-2">
            {!sorted.length ? (
              <div className="text-muted-foreground text-center py-4 text-sm">Esperando análisis...</div>
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
                <div key={i} className="bg-muted/60 border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge variant="outline" className={`text-[10px] font-bold ${tierColor}`}>{tierLabel}</Badge>
                    <span className="text-muted-foreground text-[10px]">{ins.time}</span>
                  </div>
                  {followUp && <p className="text-foreground text-sm leading-snug mb-1.5">❓ {followUp}</p>}
                  {content && !followUp && <p className="text-foreground text-sm leading-snug mb-1.5">{content}</p>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {maturity && (
                      <Badge variant="outline" className="text-[10px] bg-yellow-900/40 text-yellow-200 border-yellow-700/40">
                        🧠 {maturity}
                      </Badge>
                    )}
                    {flag && (
                      <Badge variant="outline" className="text-[10px] bg-orange-900/40 text-orange-200 border-orange-700/40">
                        ⚠️ {flag}
                      </Badge>
                    )}
                    {insight && (
                      <Badge variant="outline" className="text-[10px] bg-emerald-900/40 text-emerald-200 border-emerald-700/40">
                        💡 {insight}
                      </Badge>
                    )}
                    {pivot && (
                      <Badge variant="outline" className="text-[10px] bg-blue-900/40 text-blue-200 border-blue-700/40">
                        🔄 {pivot}
                      </Badge>
                    )}
                    {sentiment && (
                      <Badge variant="outline" className="text-[10px] bg-pink-900/40 text-pink-200 border-pink-700/40">
                        💭 {sentiment}
                      </Badge>
                    )}
                  </div>
                  {!followUp && !content && !p && (
                    <p className="text-muted-foreground text-xs">{ins.analysis?.substring(0, 200)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
