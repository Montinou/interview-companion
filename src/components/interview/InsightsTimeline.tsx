'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Lightbulb, FileText, Clock } from 'lucide-react';

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
    label: 'Red Flag',
    bgColor: 'bg-red-950/40',
    borderColor: 'border-l-red-500',
    iconBg: 'bg-red-900/60',
    iconColor: 'text-red-400',
    badgeColor: 'bg-red-500/20 text-red-300',
  },
  'green-flag': {
    icon: CheckCircle2,
    label: 'Green Flag',
    bgColor: 'bg-emerald-950/40',
    borderColor: 'border-l-emerald-500',
    iconBg: 'bg-emerald-900/60',
    iconColor: 'text-emerald-400',
    badgeColor: 'bg-emerald-500/20 text-emerald-300',
  },
  'suggestion': {
    icon: Lightbulb,
    label: 'Tip',
    bgColor: 'bg-blue-950/40',
    borderColor: 'border-l-blue-500',
    iconBg: 'bg-blue-900/60',
    iconColor: 'text-blue-400',
    badgeColor: 'bg-blue-500/20 text-blue-300',
  },
  'note': {
    icon: FileText,
    label: 'Note',
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

  useEffect(() => {
    fetchInsights();
    if (!isLive) return;
    const pollInterval = setInterval(fetchInsights, 5000);
    return () => clearInterval(pollInterval);
  }, [interviewId, isLive, fetchInsights]);

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
    <div className="rounded-xl border border-gray-700/50 bg-[#111118] p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-500/15 p-2">
            <Clock className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Insights</h2>
            <p className="text-xs text-gray-400">Timeline de observaciones</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === null
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('red-flag')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === 'red-flag'
                ? 'bg-red-600 text-white'
                : 'bg-red-500/15 text-red-300 hover:bg-red-500/25'
            }`}
          >
            🔴 {counts['red-flag']}
          </button>
          <button
            onClick={() => setFilter('green-flag')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === 'green-flag'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
            }`}
          >
            🟢 {counts['green-flag']}
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredInsights.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-gray-500"
            >
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-gray-400">No hay insights todavía</p>
              <p className="text-sm text-gray-500">Se generarán durante la entrevista</p>
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
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${config.badgeColor}`}>
                          {config.label}
                        </span>
                        {insight.topic && (
                          <span className="text-[10px] text-gray-400">
                            • {insight.topic}
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed text-gray-100">{insight.content}</p>
                      <p className="text-[10px] text-gray-500 mt-1.5">
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
    </div>
  );
}
