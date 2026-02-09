'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Check, Sparkles, TrendingUp, Search } from 'lucide-react';

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

// Topics that should show in Suggestions panel (questions to ask)
const QUESTION_TOPICS = ['recommended-question', 'recommended_question'];
// Topics that should go to Insights panel instead
const INSIGHT_TOPICS = ['topic-change', 'topic_change', 'missing-angle', 'missing_angle'];

const TOPIC_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  'recommended-question': { label: 'Pregunta recomendada', icon: '❓', color: 'bg-indigo-500/15 text-indigo-300' },
  'recommended_question': { label: 'Pregunta recomendada', icon: '❓', color: 'bg-indigo-500/15 text-indigo-300' },
  'topic-change': { label: 'Cambio de tema', icon: '🔄', color: 'bg-amber-500/15 text-amber-300' },
  'topic_change': { label: 'Cambio de tema', icon: '🔄', color: 'bg-amber-500/15 text-amber-300' },
  'missing-angle': { label: 'Ángulo sin explorar', icon: '🔍', color: 'bg-cyan-500/15 text-cyan-300' },
  'missing_angle': { label: 'Ángulo sin explorar', icon: '🔍', color: 'bg-cyan-500/15 text-cyan-300' },
};

function tryParseJSON(raw: string): any {
  try {
    let cleaned = raw.trim();
    // Strip markdown code fences
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    return JSON.parse(cleaned.trim());
  } catch {
    return null;
  }
}

function extractReadableContent(item: Suggestion): string {
  // Try suggestion field first, then content
  const sources = [item.suggestion, item.content].filter(Boolean) as string[];
  
  for (const raw of sources) {
    const parsed = tryParseJSON(raw);
    if (!parsed || typeof parsed !== 'object') continue;
    
    // Extract recommended questions (array of strings or objects)
    if (parsed.recommended_questions && Array.isArray(parsed.recommended_questions)) {
      const questions = parsed.recommended_questions
        .map((q: any) => {
          if (typeof q === 'string') return q;
          if (q.question) return q.why ? `${q.question} (${q.why})` : q.question;
          if (q.text) return q.text;
          return null;
        })
        .filter(Boolean);
      if (questions.length > 0) return questions.join('\n');
    }
    
    // Extract missing angles
    if (parsed.missing_angles && Array.isArray(parsed.missing_angles)) {
      return parsed.missing_angles.filter((s: any) => typeof s === 'string').join('\n');
    }
    
    // Single question/text/suggestion
    if (parsed.question) return parsed.why ? `${parsed.question} (${parsed.why})` : parsed.question;
    if (parsed.pivot) return parsed.pivot;
    if (parsed.text) return parsed.text;
    if (typeof parsed.suggestion === 'string') return parsed.suggestion;
    if (typeof parsed.content === 'string') return parsed.content;
    if (typeof parsed.insight === 'string') return parsed.insight;
    if (typeof parsed.follow_up === 'string') return parsed.follow_up;
    
    // Array of strings
    if (Array.isArray(parsed)) {
      const strs = parsed.filter((s: any) => typeof s === 'string');
      if (strs.length > 0) return strs.join('\n');
    }
    
    // Last resort: collect all string values from top-level keys (skip arrays/objects)
    const readable = Object.entries(parsed)
      .filter(([k, v]) => typeof v === 'string' && !['type', 'tier', 'timestamp', 'topic'].includes(k))
      .map(([, v]) => v as string)
      .filter(s => s.length > 5);
    if (readable.length > 0) return readable.join(' — ');
  }
  
  // Nothing parsed — return raw but strip JSON artifacts
  const fallback = item.suggestion || item.content || '';
  // If it looks like JSON, don't show it raw
  if (fallback.trim().startsWith('{') || fallback.trim().startsWith('```')) {
    return '(análisis pendiente de formato)';
  }
  return fallback;
}

export function SuggestionsPanel({ interviewId, isLive }: SuggestionsPanelProps) {
  const [allSuggestions, setAllSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch(`/api/interview-data?id=${interviewId}&type=insights&filter=suggestion`);
      if (res.ok) {
        const data = await res.json();
        setAllSuggestions(data);
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
      setAllSuggestions(prev =>
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

  // Split: questions go here, other suggestion types (topic-change, missing-angle) 
  // also show here but visually differentiated
  const suggestions = allSuggestions;

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
            Preguntas y observaciones de la AI
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
              const topicInfo = suggestion.topic ? TOPIC_LABELS[suggestion.topic] : null;
              const isQuestion = QUESTION_TOPICS.includes(suggestion.topic || '');

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
                      : isQuestion
                        ? 'bg-indigo-900/15 border-indigo-500/20 hover:border-indigo-500/40'
                        : 'bg-gray-800/40 border-yellow-500/20 hover:border-yellow-500/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {topicInfo ? (
                        <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mb-2 ${topicInfo.color}`}>
                          {topicInfo.icon} {topicInfo.label}
                        </span>
                      ) : suggestion.topic && (
                        <span className="inline-block text-[10px] font-medium text-yellow-400 bg-yellow-500/15 px-2 py-0.5 rounded-full mb-2">
                          {suggestion.topic}
                        </span>
                      )}
                      {isMultiLine ? (
                        <ul className="space-y-1.5">
                          {lines.map((line: string, i: number) => (
                            <li key={i} className="text-sm text-gray-100 leading-relaxed flex gap-2">
                              <span className={`shrink-0 ${isQuestion ? 'text-indigo-400' : 'text-yellow-500'}`}>
                                {isQuestion ? '❓' : '•'}
                              </span>
                              <span>{line.replace(/^[-•*]\s*/, '')}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-100 leading-relaxed">
                          {isQuestion && <span className="text-indigo-400 mr-1">❓</span>}
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
