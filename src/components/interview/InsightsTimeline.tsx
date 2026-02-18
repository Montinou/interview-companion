'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Lightbulb, FileText, Clock } from 'lucide-react';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface Insight {
  id: number;
  type: string;
  severity: string | null;
  content: string;
  topic: string | null;
  timestamp: string;
}

interface InsightsTimelineProps {
  interviewId: number;
  isLive: boolean;
}

const typeConfig = {
  'red-flag': {
    icon: AlertTriangle,
    label: 'Alerta',
    bgColor: 'bg-red-950/40',
    borderColor: 'border-l-red-500',
    iconBg: 'bg-red-900/60',
    iconColor: 'text-red-400',
    badgeColor: 'bg-red-500/20 text-red-300',
  },
  'green-flag': {
    icon: CheckCircle2,
    label: 'Positivo',
    bgColor: 'bg-emerald-950/40',
    borderColor: 'border-l-emerald-500',
    iconBg: 'bg-emerald-900/60',
    iconColor: 'text-emerald-400',
    badgeColor: 'bg-emerald-500/20 text-emerald-300',
  },
  'suggestion': {
    icon: Lightbulb,
    label: 'Sugerencia',
    bgColor: 'bg-blue-950/40',
    borderColor: 'border-l-blue-500',
    iconBg: 'bg-blue-900/60',
    iconColor: 'text-blue-400',
    badgeColor: 'bg-blue-500/20 text-blue-300',
  },
  'note': {
    icon: FileText,
    label: 'Nota',
    bgColor: 'bg-gray-800/40',
    borderColor: 'border-l-gray-500',
    iconBg: 'bg-gray-700/60',
    iconColor: 'text-gray-400',
    badgeColor: 'bg-gray-500/20 text-gray-300',
  },
};

export function InsightsTimeline({ interviewId, isLive }: InsightsTimelineProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    try {
      const url = filter 
        ? `/api/interview-data?id=${interviewId}&type=insights&filter=${filter}`
        : `/api/interview-data?id=${interviewId}&type=insights`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setInsights(data.filter((i: Insight) => i.type !== 'suggestion'));
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  }, [interviewId, filter]);

  // Initial fetch on mount
  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // Realtime subscription for live updates (INSERT only, filter out suggestions client-side)
  useSupabaseRealtime<Insight>({
    table: 'ai_insights',
    filter: `interview_id=eq.${interviewId}`,
    event: 'INSERT',
    enabled: isLive,
    onInsert: (newInsight) => {
      // Filter out suggestions (they go to SuggestionsPanel)
      if (newInsight.type !== 'suggestion') {
        setInsights(prev => [...prev, newInsight]);
      }
    },
  });

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const filteredInsights = filter
    ? insights.filter(i => i.type === filter)
    : insights;

  const counts = {
    'red-flag': insights.filter(i => i.type === 'red-flag').length,
    'green-flag': insights.filter(i => i.type === 'green-flag').length,
    'note': insights.filter(i => i.type === 'note').length,
  };

  return (
    <Card className="bg-card h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/15 p-2">
              <Clock className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold">Insights</h2>
              <p className="text-xs text-muted-foreground">Timeline de observaciones</p>
            </div>
          </div>

          {/* Filter Badges */}
          <div className="flex gap-2">
            <Button
              onClick={() => setFilter(null)}
              variant={filter === null ? 'default' : 'outline'}
              size="sm"
              className="text-xs"
            >
              Todos
            </Button>
            <Badge
              variant={filter === 'red-flag' ? 'default' : 'outline'}
              className={`cursor-pointer px-3 py-1 text-xs ${
                filter === 'red-flag'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-red-500/15 text-red-300 hover:bg-red-500/25'
              }`}
              onClick={() => setFilter('red-flag')}
            >
              🔴 {counts['red-flag']}
            </Badge>
            <Badge
              variant={filter === 'green-flag' ? 'default' : 'outline'}
              className={`cursor-pointer px-3 py-1 text-xs ${
                filter === 'green-flag'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
              }`}
              onClick={() => setFilter('green-flag')}
            >
              🟢 {counts['green-flag']}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full" />
                </div>
              ) : filteredInsights.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-muted-foreground"
                >
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No hay observaciones todavía</p>
                  <p className="text-sm text-muted-foreground">Se generarán durante la entrevista</p>
                </motion.div>
              ) : (
                filteredInsights.map((insight, index) => {
                  const config = typeConfig[insight.type as keyof typeof typeConfig] || typeConfig.note;
                  const Icon = config.icon;

                  return (
                    <motion.div
                      key={insight.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.03 }}
                      className={`p-3 rounded-lg border-l-4 ${config.bgColor} ${config.borderColor}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`shrink-0 p-1.5 rounded-lg ${config.iconBg}`}>
                          <Icon className={`h-4 w-4 ${config.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className={`text-[10px] ${config.badgeColor}`}>
                              {config.label}
                            </Badge>
                            {insight.topic && (
                              <span className="text-[10px] text-muted-foreground">
                                • {insight.topic}
                              </span>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed">{insight.content}</p>
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            {formatTime(insight.timestamp)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
