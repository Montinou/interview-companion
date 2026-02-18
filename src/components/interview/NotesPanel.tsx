'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface NotesPanelProps {
  interviewId: number;
}

interface NoteEntry {
  id: string;
  text: string;
  timestamp: string;
  aiResponse?: string;
  loading?: boolean;
}

export function NotesPanel({ interviewId }: NotesPanelProps) {
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const lastAiResponseId = useRef(0);

  // Realtime subscription for AI responses
  useSupabaseRealtime<{ id: number; content: string; timestamp: string; type: string }>({
    table: 'ai_insights',
    filter: `interview_id=eq.${interviewId}`,
    event: 'INSERT',
    enabled: true,
    onInsert: (newInsight) => {
      // Only handle AI response insights
      if (newInsight.type === 'ai-response' && newInsight.id > lastAiResponseId.current) {
        lastAiResponseId.current = newInsight.id;
        setNotes(prev => {
          // Find a loading note to attach to, or add standalone
          const loadingIdx = prev.findIndex(n => n.loading);
          if (loadingIdx >= 0) {
            return prev.map((n, i) => 
              i === loadingIdx ? { ...n, loading: false, aiResponse: newInsight.content } : n
            );
          }
          return [...prev, { 
            id: `ai-${newInsight.id}`, 
            text: '', 
            timestamp: new Date(newInsight.timestamp).toLocaleTimeString('es-AR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }), 
            aiResponse: newInsight.content 
          }];
        });
        setTimeout(() => 
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 
          100
        );
      }
    },
  });

  const sendNote = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const noteId = Date.now().toString();
    const entry: NoteEntry = {
      id: noteId,
      text,
      timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      loading: true,
    };

    setNotes(prev => [...prev, entry]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch(`/api/interview-data?id=${interviewId}&type=notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, requestAI: true }),
      });

      if (!res.ok) {
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, loading: false } : n));
      }
      // Don't clear loading — the poll will clear it when AI responds
    } catch {
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, loading: false } : n));
    } finally {
      setSending(false);
    }
  }, [input, interviewId, sending]);

  return (
    <Card className="border-border bg-card flex flex-col h-full">
      <CardHeader className="py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
          <CardTitle className="text-xs font-semibold uppercase tracking-wider">
            Notas & AI Chat
          </CardTitle>
          <span className="text-[10px] text-muted-foreground ml-auto">{notes.length}</span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 flex flex-col p-0">
        {/* Notes list */}
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2 py-2">
            {notes.length === 0 && (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-xs">
                Escribí notas o preguntas para la IA...
              </div>
            )}
            {notes.map(note => (
              <div key={note.id} className="space-y-1">
                {/* User note */}
                <div className="flex gap-2">
                  <span className="text-[10px] text-muted-foreground shrink-0 pt-0.5">{note.timestamp}</span>
                  <p className="text-xs bg-muted/50 rounded px-2 py-1 flex-1">
                    {note.text}
                  </p>
                </div>
                {/* AI response */}
                {note.loading && (
                  <div className="flex gap-2 pl-12">
                    <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                    <span className="text-[10px] text-muted-foreground">Pensando...</span>
                  </div>
                )}
                {note.aiResponse && (
                  <div className="flex gap-2 pl-4">
                    <span className="text-[10px] text-indigo-400 shrink-0 pt-0.5">🤖</span>
                    <p className="text-xs text-indigo-100 bg-indigo-500/15 rounded px-2 py-1 flex-1 border border-indigo-500/20 whitespace-pre-line">
                      {note.aiResponse}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t border-border p-2">
          <div className="flex gap-2">
            <Input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendNote()}
              placeholder="Nota o pregunta para la IA..."
              className="flex-1 text-xs"
            />
            <Button
              onClick={sendNote}
              disabled={!input.trim() || sending}
              size="sm"
              className="px-3 bg-indigo-600 hover:bg-indigo-700"
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
