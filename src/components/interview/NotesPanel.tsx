'use client';

import { useState, useCallback, useRef } from 'react';
import { Send, Loader2, MessageSquare } from 'lucide-react';

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
      // Save note to DB and optionally get AI enrichment
      const res = await fetch(`/api/interview-data?id=${interviewId}&type=notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, requestAI: true }),
      });

      if (res.ok) {
        const data = await res.json();
        setNotes(prev => prev.map(n =>
          n.id === noteId
            ? { ...n, loading: false, aiResponse: data.aiResponse || undefined }
            : n
        ));
      } else {
        setNotes(prev => prev.map(n =>
          n.id === noteId ? { ...n, loading: false } : n
        ));
      }
    } catch {
      setNotes(prev => prev.map(n =>
        n.id === noteId ? { ...n, loading: false } : n
      ));
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 100);
    }
  }, [input, interviewId, sending]);

  return (
    <div className="rounded-lg border border-gray-800 bg-[#111118] flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
        <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Notas & AI Chat
        </h3>
        <span className="text-[10px] text-gray-600 ml-auto">{notes.length}</span>
      </div>

      {/* Notes list */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {notes.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-600 text-xs">
            Escribí notas o preguntas para la IA...
          </div>
        )}
        {notes.map(note => (
          <div key={note.id} className="space-y-1">
            {/* User note */}
            <div className="flex gap-2">
              <span className="text-[10px] text-gray-600 shrink-0 pt-0.5">{note.timestamp}</span>
              <p className="text-xs text-gray-200 bg-gray-800/50 rounded px-2 py-1 flex-1">
                {note.text}
              </p>
            </div>
            {/* AI response */}
            {note.loading && (
              <div className="flex gap-2 pl-12">
                <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                <span className="text-[10px] text-gray-500">Pensando...</span>
              </div>
            )}
            {note.aiResponse && (
              <div className="flex gap-2 pl-4">
                <span className="text-[10px] text-indigo-400 shrink-0 pt-0.5">🤖</span>
                <p className="text-xs text-indigo-200/80 bg-indigo-500/10 rounded px-2 py-1 flex-1 border border-indigo-500/20">
                  {note.aiResponse}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 p-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendNote()}
            placeholder="Nota o pregunta para la IA..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
          />
          <button
            onClick={sendNote}
            disabled={!input.trim() || sending}
            className="px-3 py-1.5 rounded bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
