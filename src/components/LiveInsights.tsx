'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Ear } from 'lucide-react';
import type { AIInsight } from '@/lib/db/schema';
import { InsightCard } from './InsightCard';
import { cn } from '@/lib/utils';

interface LiveInsightsProps {
  interviewId: number;
}

export function LiveInsights({ interviewId }: LiveInsightsProps) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Load initial insights
    fetch(`/api/interviews/${interviewId}/insights`)
      .then(res => res.json())
      .then(data => setInsights(data))
      .catch(console.error);

    // Connect to SSE stream
    const eventSource = new EventSource(`/api/interviews/${interviewId}/stream`);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'connected') {
        console.log('Connected to insights stream');
      } else {
        // New insight received
        setInsights(prev => [...prev, data]);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [interviewId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-2.5">
            <Ear className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">AI Insights</h2>
            <p className="text-sm text-muted-foreground">Real-time analysis from OpenClaw</p>
          </div>
        </motion.div>

        {/* Connection status */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            isConnected
              ? 'bg-green-500/10 text-green-600 border border-green-500/20'
              : 'bg-gray-500/10 text-gray-600 border border-gray-500/20'
          )}
        >
          <motion.div
            animate={isConnected ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {isConnected ? (
              <Wifi className="h-3.5 w-3.5" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}
          </motion.div>
          {isConnected ? 'Live' : 'Disconnected'}
        </motion.div>
      </div>

      {/* Insights list */}
      <AnimatePresence mode="popLayout">
        {insights.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center py-16 px-6 text-center border-2 border-dashed rounded-xl bg-gradient-to-br from-muted/30 to-muted/10"
          >
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="mb-4"
            >
              <Ear className="h-12 w-12 text-muted-foreground/50" />
            </motion.div>
            <h3 className="text-lg font-semibold mb-2">Listening...</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              AI insights will appear here as the interview progresses.
              The system analyzes in real-time and provides suggestions when relevant.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            <AnimatePresence mode="popLayout">
              {insights.map((insight, index) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>

      {/* Stats footer */}
      {insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 rounded-lg bg-muted/30 text-sm"
        >
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">
                {insights.filter(i => i.type === 'red-flag').length} Red Flags
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-muted-foreground">
                {insights.filter(i => i.type === 'suggestion').length} Suggestions
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">
                {insights.filter(i => i.type === 'observation').length} Observations
              </span>
            </div>
          </div>
          <span className="text-muted-foreground font-medium">
            {insights.length} total insights
          </span>
        </motion.div>
      )}
    </div>
  );
}
