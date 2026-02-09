'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Check, Sparkles } from 'lucide-react';

interface Suggestion {
  id: number;
  content: string;
  suggestion: string | null;
  topic: string | null;
  timestamp: string;
  used: boolean;
}

interface SuggestionsPanelProps {
  interviewId: number;
  isLive: boolean;
}

export function SuggestionsPanel({ interviewId, isLive }: SuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch(`/api/interview-data?id=${interviewId}&type=insights&filter=suggestion`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  }, [interviewId]);

  const markAsUsed = async (id: number) => {
    try {
      await fetch(`/api/interview-data?id=${interviewId}&type=used&insightId=${id}`, {
        method: 'POST',
      });
      setSuggestions(prev =>
        prev.map(s => (s.id === id ? { ...s, used: true } : s))
      );
    } catch (error) {
      console.error('Error marking suggestion as used:', error);
    }
  };

  useEffect(() => {
    fetchSuggestions();

    if (!isLive) return;

    // Polling (SSE disabled due to Vercel dynamic route issue)
    const pollInterval = setInterval(fetchSuggestions, 5000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [interviewId, isLive, fetchSuggestions]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-xl border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-amber-500/5 p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-lg bg-yellow-500/10 p-2.5">
          <Lightbulb className="h-6 w-6 text-yellow-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            Sugerencias
            <Sparkles className="h-4 w-4 text-yellow-500" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Preguntas recomendadas por AI
          </p>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-yellow-500 border-t-transparent rounded-full" />
            </div>
          ) : suggestions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-muted-foreground"
            >
              <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No hay sugerencias todavía</p>
              <p className="text-sm">Aparecerán durante la entrevista</p>
            </motion.div>
          ) : (
            suggestions.map((suggestion, index) => (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-lg border transition-all ${
                  suggestion.used
                    ? 'bg-green-500/5 border-green-500/20 opacity-60'
                    : 'bg-white/50 dark:bg-gray-900/50 border-yellow-500/20 hover:border-yellow-500/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    {suggestion.topic && (
                      <span className="inline-block text-xs font-medium text-yellow-600 bg-yellow-500/10 px-2 py-0.5 rounded-full mb-2">
                        {suggestion.topic}
                      </span>
                    )}
                    <p className="font-medium text-sm leading-relaxed">
                      {suggestion.suggestion || suggestion.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatTime(suggestion.timestamp)}
                    </p>
                  </div>
                  
                  {!suggestion.used && (
                    <button
                      onClick={() => markAsUsed(suggestion.id)}
                      className="shrink-0 p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-600 transition-colors"
                      title="Marcar como usada"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  
                  {suggestion.used && (
                    <div className="shrink-0 p-2 text-green-500">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
