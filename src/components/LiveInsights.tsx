'use client';

import { useEffect, useState } from 'react';
import type { AIInsight } from '@/lib/db/schema';

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

  const getInsightStyle = (type: string) => {
    switch (type) {
      case 'red-flag':
        return 'border-l-4 border-red-500 bg-red-500/10';
      case 'suggestion':
        return 'border-l-4 border-yellow-500 bg-yellow-500/10';
      case 'observation':
        return 'border-l-4 border-blue-500 bg-blue-500/10';
      case 'scorecard-update':
        return 'border-l-4 border-green-500 bg-green-500/10';
      default:
        return 'border-l-4 border-gray-500 bg-gray-500/10';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'red-flag':
        return '🚩';
      case 'suggestion':
        return '💡';
      case 'observation':
        return '📝';
      case 'scorecard-update':
        return '📊';
      default:
        return '💬';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">🤖 AI Insights</h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
          }`} />
          <span className="text-xs text-muted-foreground">
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      {insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-xl">
          <div className="text-6xl mb-4">👂</div>
          <h3 className="text-lg font-semibold mb-2">Listening...</h3>
          <p className="text-sm text-muted-foreground">
            AI insights will appear here as the interview progresses
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`p-4 rounded-lg ${getInsightStyle(insight.type)}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getInsightIcon(insight.type)}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">
                      {new Date(insight.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-background/50">
                      {insight.type}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{insight.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
