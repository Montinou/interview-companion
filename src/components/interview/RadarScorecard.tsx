'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Pencil } from 'lucide-react';
import { ScorecardPanel } from './ScorecardPanel';

const DIMS = [
  { key: 'attitude', label: 'Actitud', esKey: 'actitud' },
  { key: 'communication', label: 'Comunicación', esKey: 'comunicacion' },
  { key: 'technical', label: 'Técnico', esKey: 'tecnico' },
  { key: 'strategic', label: 'Estrategia', esKey: 'estrategico' },
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
  dimensions?: { key: string; label: string }[];
}

export function RadarScorecard({ interviewId, isLive, dimensions }: RadarScorecardProps) {
  const [scorecard, setScorecard] = useState<Record<string, any> | null>(null);
  const [editOpen, setEditOpen] = useState(false);

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

  // Refetch when dialog closes (user may have edited scores)
  useEffect(() => {
    if (!editOpen) {
      fetchScorecard();
    }
  }, [editOpen, fetchScorecard]);

  const activeDims = dimensions || DIMS;

  const data = activeDims.map(d => ({
    dim: d.label,
    value: scorecard ? (scorecard[d.key] || (d as any).esKey && scorecard[(d as any).esKey] || 0) : 0,
    fullMark: 10,
  }));

  const rec = scorecard?.recommendation || null;
  const hasScores = data.some(d => d.value > 0);

  const renderAxisTick = ({ payload, x, y, textAnchor, fill: _fill, stroke: _stroke, ...rest }: any) => {
    const item = data.find(d => d.dim === payload.value);
    const score = item?.value || 0;
    // Abbreviate long labels for compact display
    const label = payload.value.length > 8 ? payload.value.slice(0, 7) + '.' : payload.value;
    return (
      <g>
        <text
          x={x} y={y} textAnchor={textAnchor}
          fill="#e2e8f0"
          fontSize={11} fontWeight={600}
          {...rest}
        >
          {label}
        </text>
        {hasScores && (
          <text
            x={x} y={y + 13} textAnchor={textAnchor}
            fill={score >= 7 ? '#22c55e' : score >= 4 ? '#eab308' : '#ef4444'}
            fontSize={12} fontWeight={700}
          >
            {score}
          </text>
        )}
      </g>
    );
  };

  return (
    <Card className="bg-card overflow-hidden">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            📊 Scorecard
          </h3>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                <Pencil className="h-3 w-3 mr-1" />
                Editar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Scorecard</DialogTitle>
              </DialogHeader>
              <ScorecardPanel interviewId={interviewId} />
            </DialogContent>
          </Dialog>
        </div>
        <div className="h-[240px] overflow-hidden">
          {hasScores ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} cx="50%" cy="50%" outerRadius="45%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis 
                  dataKey="dim" 
                  tick={renderAxisTick}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 10]} 
                  tick={false}
                  axisLine={false}
                />
                <Radar 
                  dataKey="value" 
                  stroke="#8b5cf6" 
                  fill="#8b5cf6" 
                  fillOpacity={0.3} 
                  dot={{ r: 3, fill: '#8b5cf6', stroke: '#a78bfa', strokeWidth: 1 }} 
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Esperando análisis AI...
            </div>
          )}
        </div>
        {/* Recommendation badges — wrap on narrow screens */}
        <div className="flex flex-wrap gap-1">
          {RECS.map(r => (
            <Badge
              key={r.key}
              variant={rec === r.key ? 'default' : 'outline'}
              className={`flex-1 min-w-[3.5rem] justify-center text-[10px] font-medium transition-all ${
                rec === r.key
                  ? `${r.color} text-white ring-1 ring-white/30`
                  : 'bg-muted/40 text-muted-foreground'
              }`}
            >
              {r.label}
            </Badge>
          ))}
        </div>
        {scorecard?.justification && (
          <p className="text-xs text-muted-foreground italic border-t border-border pt-2 mt-1 line-clamp-3">
            {scorecard.justification}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
