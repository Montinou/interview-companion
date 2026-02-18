'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { FileText, User, Mic } from 'lucide-react';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

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
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[600px] sm:w-[600px] flex flex-col">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted/50 p-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <SheetTitle>Transcript</SheetTitle>
              <SheetDescription>
                {transcript.length} entradas
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 mt-6" ref={scrollRef}>
          <div className="space-y-3 pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-muted border-t-transparent rounded-full" />
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
                        <Badge variant="secondary" className={`text-xs ${config.textColor}`}>
                          {config.label}
                        </Badge>
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
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
