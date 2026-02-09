'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer,
} from 'recharts';

const DIMS = [
  { key: 'attitude', label: 'Actitud', esKey: 'actitud' },
  { key: 'communication', label: 'Comunic.', esKey: 'comunicacion' },
  { key: 'technical', label: 'Técnico', esKey: 'tecnico' },
  { key: 'strategic', label: 'Estratég.', esKey: 'estrategico' },
  { key: 'leadership', label: 'Liderazgo', esKey: 'liderazgo' },
  { key: 'english', label: 'Inglés', esKey: 'ingles' },
] as const;

const RECS = [
  { key: 'strong_hire', label: 'Strong Hire', color: 'bg-green-600' },
  { key: 'hire', label: 'Hire', color: 'bg-green-500/70' },
  { key: 'maybe', label: 'Maybe', color: 'bg-yellow-500/70' },
  { key: 'no_hire', label: 'No Hire', color: 'bg-orange-500/70' },
  { key: 'strong_no_hire', label: 'Strong No', color: 'bg-red-600' },
];

interface RadarScorecardProps {
  interviewId: number;
  isLive: boolean;
}

export function RadarScorecard({ interviewId, isLive }: RadarScorecardProps) {
  const [scorecard, setScorecard] = useState<Record<string, any> | null>(null);

  const fetchScorecard = useCallback(async () => {
    try {
      const res = await fetch(`/api/interview-data?id=${interviewId}&type=scorecard`);
      if (res.ok) {
        const data = await res.json();
        if (data) setScorecard(data);
      }
    } catch (e) { console.error('RadarScorecard fetch error:', e); }
  }, [interviewId]);

  useEffect(() => {
    fetchScorecard();
    if (isLive) {
      const iv = setInterval(fetchScorecard, 3000);
      return () => clearInterval(iv);
    }
  }, [fetchScorecard, isLive]);

  const data = DIMS.map(d => ({
    dim: d.label,
    value: scorecard ? (scorecard[d.key] || scorecard[d.esKey] || 0) : 0,
    fullMark: 10,
  }));

  const rec = scorecard?.recommendation || null;
  const hasScores = data.some(d => d.value > 0);

  return (
    <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-4 space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        📊 AI Scorecard
      </h3>
      <div className="h-[220px]">
        {hasScores ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis 
                dataKey="dim" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} 
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 10]} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }} 
                tickCount={6} 
              />
              <Radar 
                dataKey="value" 
                stroke="#8b5cf6" 
                fill="#8b5cf6" 
                fillOpacity={0.25} 
                dot={{ r: 3, fill: '#8b5cf6' }} 
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Esperando análisis AI...
          </div>
        )}
      </div>
      {/* Recommendation pills */}
      <div className="flex gap-1">
        {RECS.map(r => (
          <span
            key={r.key}
            className={`flex-1 py-1 rounded text-center text-[10px] font-medium transition-all ${
              rec === r.key
                ? `${r.color} text-white ring-1 ring-white/30`
                : 'bg-muted/30 text-muted-foreground/50'
            }`}
          >
            {r.label}
          </span>
        ))}
      </div>
      {scorecard?.justification && (
        <p className="text-xs text-muted-foreground italic border-t pt-2 mt-1">
          {scorecard.justification}
        </p>
      )}
    </div>
  );
}
