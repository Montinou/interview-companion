'use client';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

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
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border shrink-0 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">📝 Notas</h3>
        <Button 
          onClick={save} 
          disabled={saving}
          size="sm"
          variant="secondary"
          className="text-[10px] h-6"
        >
          {saving ? '...' : 'Guardar'}
        </Button>
      </div>
      <Textarea 
        value={notes} 
        onChange={e => setNotes(e.target.value)}
        placeholder="Notas durante la entrevista..."
        className="flex-1 resize-none rounded-none border-0 focus-visible:ring-0 min-h-0"
        onBlur={save} 
      />
    </div>
  );
}
