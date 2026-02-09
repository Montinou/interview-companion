'use client';
import { useState, useCallback } from 'react';

export default function NotesPanel() {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await fetch('/api/hud/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
    } catch (e) { console.error('Save failed:', e); }
    setSaving(false);
  }, [notes]);

  return (
    <div className="bg-[#111118] rounded-lg border border-gray-800 flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-800 shrink-0 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">📝 Notas</h3>
        <button onClick={save} disabled={saving}
          className="text-[10px] px-2 py-0.5 rounded bg-purple-600/50 text-purple-200 hover:bg-purple-600/70 disabled:opacity-50">
          {saving ? '...' : 'Guardar'}
        </button>
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Notas durante la entrevista..."
        className="flex-1 bg-transparent text-gray-200 text-sm p-2 resize-none focus:outline-none placeholder:text-gray-700 min-h-0"
        onBlur={save} />
    </div>
  );
}
