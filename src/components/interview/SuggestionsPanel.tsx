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

function extractReadableContent(item: Suggestion): string {
  const raw = item.suggestion || item.content || '';
  
  // Try to parse as JSON and extract meaningful text
  try {
    let cleaned = raw.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();
    
    const parsed = JSON.parse(cleaned);
    
    // Handle various JSON structures from tier1/tier2 analyzers
    if (parsed.recommended_questions && Array.isArray(parsed.recommended_questions)) {
      return parsed.recommended_questions.join('\n');
    }
    if (parsed.question) return parsed.question;
    if (parsed.text) return parsed.text;
    if (parsed.suggestion) return parsed.suggestion;
    if (parsed.content) return parsed.content;
    if (typeof parsed === 'string') return parsed;
    
    // If it's an array of strings
    if (Array.isArray(parsed)) {
      return parsed.filter((s: unknown) => typeof s === 'string').join('\n');
    }
    
    return raw;
  } catch {
    return raw;
  }
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
    const pollInterval = setInterval(fetchSuggestions, 5000);
    return () => clearInterval(pollInterval);
  }, [interviewId, isLive, fetchSuggestions]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="rounded-xl border border-yellow-500/20 bg-[#111118] p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="rounded-lg bg-yellow-500/15 p-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Sugerencias
            <Sparkles className="h-4 w-4 text-yellow-500" />
          </h2>
          <p className="text-xs text-gray-400">
            Preguntas recomendadas por AI
          </p>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-yellow-500 border-t-transparent rounded-full" />
            </div>
          ) : suggestions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <Lightbulb className="h-10 w-10 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">No hay sugerencias todavía</p>
              <p className="text-sm text-gray-500">Aparecerán durante la entrevista</p>
            </motion.div>
          ) : (
            suggestions.map((suggestion, index) => {
              const content = extractReadableContent(suggestion);
              const lines = content.split('\n').filter((l: string) => l.trim());
              const isMultiLine = lines.length > 1;

              return (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 rounded-lg border transition-all ${
                    suggestion.used
                      ? 'bg-green-900/20 border-green-500/20 opacity-60'
                      : 'bg-gray-800/40 border-yellow-500/20 hover:border-yellow-500/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {suggestion.topic && (
                        <span className="inline-block text-[10px] font-medium text-yellow-400 bg-yellow-500/15 px-2 py-0.5 rounded-full mb-2">
                          {suggestion.topic}
                        </span>
                      )}
                      {isMultiLine ? (
                        <ul className="space-y-1.5">
                          {lines.map((line: string, i: number) => (
                            <li key={i} className="text-sm text-gray-100 leading-relaxed flex gap-2">
                              <span className="text-yellow-500 shrink-0">•</span>
                              <span>{line.replace(/^[-•*]\s*/, '')}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-100 leading-relaxed">
                          {content}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-500 mt-2">
                        {formatTime(suggestion.timestamp)}
                      </p>
                    </div>
                    
                    {!suggestion.used && (
                      <button
                        onClick={() => markAsUsed(suggestion.id)}
                        className="shrink-0 p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors"
                        title="Marcar como usada"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    
                    {suggestion.used && (
                      <div className="shrink-0 p-2 text-green-400">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
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
