'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Circle, Pause, CheckCircle2 } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type LanguageCode = 'es' | 'en' | 'multi';

interface LiveHeaderProps {
  candidateName: string;
  position?: string;
  status: string;
  startedAt: string | null;
  language?: LanguageCode;
  onLanguageChange?: (language: LanguageCode) => void;
}

export function LiveHeader({ candidateName, position, status, startedAt, language = 'es', onLanguageChange }: LiveHeaderProps) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (status !== 'live' || !startedAt) return;

    const startTime = new Date(startedAt).getTime();
    
    const updateDuration = () => {
      const now = Date.now();
      setDuration(Math.floor((now - startTime) / 1000));
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [status, startedAt]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const statusConfig = {
    live: {
      icon: Circle,
      label: 'Live',
      className: 'bg-red-500/10 text-red-600 border-red-500/20',
      iconClassName: 'text-red-500 fill-red-500 animate-pulse',
    },
    paused: {
      icon: Pause,
      label: 'Paused',
      className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      iconClassName: 'text-yellow-500',
    },
    completed: {
      icon: CheckCircle2,
      label: 'Ended',
      className: 'bg-green-500/10 text-green-600 border-green-500/20',
      iconClassName: 'text-green-500',
    },
    scheduled: {
      icon: Circle,
      label: 'Scheduled',
      className: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
      iconClassName: 'text-gray-400',
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between p-6">
          {/* Candidate Info */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl font-bold text-primary">
              {candidateName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{candidateName}</h1>
              {position && (
                <p className="text-muted-foreground">{position}</p>
              )}
            </div>
          </div>

          {/* Duration, Language & Status */}
          <div className="flex items-center gap-4">
            {/* Language Switcher — always visible so you can set it before starting */}
            <LanguageSwitcher
              value={language}
              onChange={onLanguageChange}
              compact={status === 'live'}
            />

            {status === 'live' && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-right"
              >
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-3xl font-mono font-bold tabular-nums">
                  {formatDuration(duration)}
                </p>
              </motion.div>
            )}

            <Badge variant={
              status === 'live' ? 'default' :
              status === 'completed' ? 'secondary' :
              'outline'
            } className={`flex items-center gap-2 px-4 py-2 ${
              status === 'live' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
              status === 'completed' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
              status === 'paused' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
              'bg-muted'
            }`}>
              <StatusIcon className={`h-4 w-4 ${config.iconClassName}`} />
              <span className="font-semibold">{config.label}</span>
            </Badge>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
