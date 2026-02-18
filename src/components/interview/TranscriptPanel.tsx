'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, User, Mic, X } from 'lucide-react';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';

interface TranscriptEntry {
  id: number;
  speaker: string | null;
  text: string;
  timestamp: string;
}

interface TranscriptPanelProps {
  interviewId: number;
  isLive: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function TranscriptPanel({ interviewId, isLive, isOpen, onClose }: TranscriptPanelProps) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<number | null>(null);
  const initialLoadDone = useRef(false);

  const fetchTranscript = useCallback(async () => {
    try {
      const afterId = initialLoadDone.current ? lastIdRef.current : null;
      const url = afterId
        ? `/api/interview-data?id=${interviewId}&type=transcript&after=${afterId}`
        : `/api/interview-data?id=${interviewId}&type=transcript`;
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

  // Initial fetch when panel opens
  useEffect(() => {
    if (!isOpen) return;
    fetchTranscript();
  }, [isOpen, fetchTranscript]);

  // Realtime subscription for new transcript entries (only when live AND open)
  useSupabaseRealtime<TranscriptEntry>({
    table: 'transcripts',
    filter: `interview_id=eq.${interviewId}`,
    event: 'INSERT',
    enabled: isLive && isOpen,
    onInsert: (newEntry) => {
      setTranscript(prev => [...prev, newEntry]);
      lastIdRef.current = newEntry.id;
    },
  });

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, isOpen]);

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
        textColor: 'text-blue-400',
      };
    }
    return {
      icon: User,
      label: 'Candidato',
      bgColor: 'bg-purple-500/10',
      textColor: 'text-purple-400',
    };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Slide-over Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-[600px] bg-[#111118] border-l border-gray-800 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-800/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gray-500/10 p-2">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Transcript</h3>
                  <p className="text-sm text-gray-500">
                    {transcript.length} entradas
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-gray-500 border-t-transparent rounded-full" />
                </div>
              ) : transcript.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
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
                      className="flex gap-3 p-3 rounded-lg bg-gray-800/30"
                    >
                      <div className={`shrink-0 p-1.5 rounded-full ${config.bgColor}`}>
                        <Icon className={`h-3 w-3 ${config.textColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium ${config.textColor}`}>
                            {config.label}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTime(entry.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-100">{entry.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
