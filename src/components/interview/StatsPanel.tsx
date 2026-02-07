'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle, CheckCircle2, MessageSquare } from 'lucide-react';

interface StatsPanelProps {
  interviewId: number;
  startedAt: string | null;
  status: string;
}

interface Stats {
  redFlagCount: number;
  greenFlagCount: number;
  suggestionCount: number;
  topicsCovered: string[];
}

export function StatsPanel({ interviewId, startedAt, status }: StatsPanelProps) {
  const [stats, setStats] = useState<Stats>({
    redFlagCount: 0,
    greenFlagCount: 0,
    suggestionCount: 0,
    topicsCovered: [],
  });
  const [duration, setDuration] = useState(0);

  // Live duration counter
  useEffect(() => {
    if (status !== 'live' || !startedAt) return;

    const startTime = new Date(startedAt).getTime();
    
    const updateDuration = () => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [status, startedAt]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/interviews/${interviewId}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [interviewId]);

  useEffect(() => {
    fetchStats();

    if (status !== 'live') return;

    // Poll for stats updates
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [interviewId, status, fetchStats]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const statCards = [
    {
      icon: Clock,
      label: 'Duración',
      value: formatDuration(duration),
      color: 'blue',
    },
    {
      icon: AlertTriangle,
      label: 'Red Flags',
      value: stats.redFlagCount,
      color: 'red',
    },
    {
      icon: CheckCircle2,
      label: 'Green Flags',
      value: stats.greenFlagCount,
      color: 'green',
    },
    {
      icon: MessageSquare,
      label: 'Sugerencias',
      value: stats.suggestionCount,
      color: 'yellow',
    },
  ];

  const colorClasses = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-600',
    red: 'from-red-500/10 to-red-600/5 border-red-500/20 text-red-600',
    green: 'from-green-500/10 to-green-600/5 border-green-500/20 text-green-600',
    yellow: 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/20 text-yellow-600',
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        const colors = colorClasses[stat.color as keyof typeof colorClasses];

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-xl border bg-gradient-to-br ${colors}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium text-muted-foreground">
                {stat.label}
              </span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
