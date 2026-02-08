'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, FileText, User, Mic } from 'lucide-react';

interface TranscriptEntry {
  id: number;
  speaker: string | null;
  text: string;
  timestamp: string;
}

interface TranscriptPanelProps {
  interviewId: number;
  isLive: boolean;
}

export function TranscriptPanel({ interviewId, isLive }: TranscriptPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<number | null>(null);
  const initialLoadDone = useRef(false);

  const fetchTranscript = useCallback(async () => {
    try {
      const afterId = initialLoadDone.current ? lastIdRef.current : null;
      const url = afterId
        ? `/api/interviews/${interviewId}/transcript?after=${afterId}`
        : `/api/interviews/${interviewId}/transcript`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const entries: TranscriptEntry[] = data.entries || data;
        if (entries.length > 0) {
          lastIdRef.current = entries[entries.length - 1].id;
        }
        if (afterId && Array.isArray(entries)) {
          setTranscript(prev => [...prev, ...entries]);
        } else {
          setTranscript(entries);
        }
        initialLoadDone.current = true;
      }
    } catch (error) {
      console.error('Error fetching transcript:', error);
    } finally {
      setLoading(false);
    }
  }, [interviewId]);

  useEffect(() => {
    fetchTranscript();

    if (!isLive) return;

    // Poll for new transcript entries
    const interval = setInterval(fetchTranscript, 3000);
    return () => clearInterval(interval);
  }, [interviewId, isLive, fetchTranscript]);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (isExpanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, isExpanded]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getSpeakerConfig = (speaker: string | null) => {
    if (speaker === 'interviewer') {
      return {
        icon: Mic,
        label: 'Entrevistador',
        bgColor: 'bg-blue-500/10',
        textColor: 'text-blue-600',
      };
    }
    return {
      icon: User,
      label: 'Candidato',
      bgColor: 'bg-purple-500/10',
      textColor: 'text-purple-600',
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden"
    >
      {/* Header - Clickable to expand */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gray-500/10 p-2">
            <FileText className="h-5 w-5 text-gray-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold">Transcript</h3>
            <p className="text-sm text-muted-foreground">
              {transcript.length} entradas
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {/* Collapsible Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              ref={scrollRef}
              className="max-h-[400px] overflow-y-auto p-4 pt-0 space-y-3"
            >
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-gray-500 border-t-transparent rounded-full" />
                </div>
              ) : transcript.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No hay transcript todavía</p>
                </div>
              ) : (
                transcript.map((entry) => {
                  const config = getSpeakerConfig(entry.speaker);
                  const Icon = config.icon;

                  return (
                    <div
                      key={entry.id}
                      className="flex gap-3 p-3 rounded-lg bg-muted/30"
                    >
                      <div className={`shrink-0 p-1.5 rounded-full ${config.bgColor}`}>
                        <Icon className={`h-3 w-3 ${config.textColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium ${config.textColor}`}>
                            {config.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(entry.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{entry.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
