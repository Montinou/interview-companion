'use client';

import { useEffect, useState, useCallback } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Scorecard {
  attitude: number | null;
  communication: number | null;
  technical: number | null;
  strategic: number | null;
  leadership: number | null;
  english: number | null;
  notes: string | null;
  recommendation: string | null;
}

interface ScorecardPanelProps {
  interviewId: number;
}

const CATEGORIES = [
  { key: 'attitude', label: 'Actitud', emoji: '💪', description: 'Proactividad, motivación, fit cultural' },
  { key: 'communication', label: 'Comunicación', emoji: '🗣️', description: 'Claridad, estructura, escucha activa' },
  { key: 'technical', label: 'Técnico', emoji: '⚙️', description: 'Conocimientos de QA, herramientas, frameworks' },
  { key: 'strategic', label: 'Estratégico', emoji: '🎯', description: 'Visión de negocio, ROI, priorización' },
  { key: 'leadership', label: 'Liderazgo', emoji: '👥', description: 'Mentoría, ownership, mejora de procesos' },
  { key: 'english', label: 'Inglés', emoji: '🌐', description: 'Fluidez, vocabulario técnico, comprensión' },
] as const;

const RECOMMENDATIONS = [
  { value: 'strong_hire', label: 'Strong Hire', color: 'bg-green-500', emoji: '🟢' },
  { value: 'hire', label: 'Hire', color: 'bg-green-400', emoji: '✅' },
  { value: 'maybe', label: 'Maybe', color: 'bg-yellow-400', emoji: '🟡' },
  { value: 'no_hire', label: 'No Hire', color: 'bg-red-400', emoji: '🔴' },
  { value: 'strong_no_hire', label: 'Strong No', color: 'bg-red-600', emoji: '⛔' },
];

export function ScorecardPanel({ interviewId }: ScorecardPanelProps) {
  const [scorecard, setScorecard] = useState<Scorecard>({
    attitude: null,
    communication: null,
    technical: null,
    strategic: null,
    leadership: null,
    english: null,
    notes: null,
    recommendation: null,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/interview-data?id=${interviewId}&type=scorecard`)
      .then(res => res.json())
      .then(data => {
        if (data) setScorecard(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [interviewId]);

  const save = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/interview-data?id=${interviewId}&type=scorecard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scorecard),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving scorecard:', error);
    } finally {
      setSaving(false);
    }
  }, [interviewId, scorecard]);

  const setScore = (key: string, value: number) => {
    setScorecard(prev => ({ ...prev, [key]: value }));
  };

  const filledCount = CATEGORIES.filter(
    c => scorecard[c.key as keyof Scorecard] !== null
  ).length;

  const average = (() => {
    const scores = CATEGORIES
      .map(c => scorecard[c.key as keyof Scorecard] as number | null)
      .filter((s): s is number => s !== null);
    if (scores.length === 0) return null;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  })();

  if (!loaded) return null;

  return (
    <div className="space-y-6">
      {/* Header with save */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filledCount}/{CATEGORIES.length} evaluados
          {average && ` · Promedio: ${average}/10`}
        </p>
        <Button
          onClick={save}
          disabled={saving}
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            '✓ Guardado'
          ) : (
            <>
              <Save className="h-4 w-4" />
              Guardar
            </>
          )}
        </Button>
      </div>

      {/* Score Categories */}
      <div className="space-y-4">
        {CATEGORIES.map(category => {
          const value = scorecard[category.key as keyof Scorecard] as number | null;
          return (
            <div key={category.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">
                    {category.emoji} {category.label}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {category.description}
                  </span>
                </div>
                <span className="text-sm font-bold tabular-nums w-8 text-right">
                  {value ?? '–'}
                </span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(score => (
                  <button
                    key={score}
                    onClick={() => setScore(category.key, score)}
                    className={`flex-1 h-8 rounded-md text-xs font-medium transition-all ${
                      value !== null && score <= value
                        ? score <= 3
                          ? 'bg-red-500 text-white'
                          : score <= 5
                          ? 'bg-yellow-500 text-white'
                          : score <= 7
                          ? 'bg-green-400 text-white'
                          : 'bg-green-600 text-white'
                        : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

          {/* Recommendation */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Recomendación</p>
            <div className="flex gap-2 flex-wrap">
              {RECOMMENDATIONS.map(rec => (
                <Badge
                  key={rec.value}
                  variant={scorecard.recommendation === rec.value ? 'default' : 'outline'}
                  onClick={() => setScorecard(prev => ({ ...prev, recommendation: rec.value }))}
                  className={`cursor-pointer px-4 py-2 text-sm font-medium transition-all ${
                    scorecard.recommendation === rec.value
                      ? `${rec.color} text-white scale-105 shadow-md`
                      : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {rec.emoji} {rec.label}
                </Badge>
              ))}
            </div>
          </div>

      {/* Notes */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Notas</p>
        <Textarea
          value={scorecard.notes || ''}
          onChange={e => setScorecard(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Observaciones generales, contexto adicional, decisión final..."
          className="h-32 resize-none"
        />
      </div>
    </div>
  );
}
