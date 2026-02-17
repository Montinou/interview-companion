'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer,
} from 'recharts';

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

  // Use provided dimensions or fall back to hardcoded DIMS
  const activeDims = dimensions || DIMS;

  const data = activeDims.map(d => ({
    dim: d.label,
    value: scorecard ? (scorecard[d.key] || (d as any).esKey && scorecard[(d as any).esKey] || 0) : 0,
    fullMark: 10,
  }));

  const rec = scorecard?.recommendation || null;
  const hasScores = data.some(d => d.value > 0);

  // Custom tick renderer to show label + score
  const renderAxisTick = ({ payload, x, y, textAnchor, fill: _fill, stroke: _stroke, ...rest }: any) => {
    const item = data.find(d => d.dim === payload.value);
    const score = item?.value || 0;
    return (
      <g>
        <text
          x={x} y={y} textAnchor={textAnchor}
          fill="#e2e8f0"
          fontSize={13} fontWeight={600}
          {...rest}
        >
          {payload.value}
        </text>
        {hasScores && (
          <text
            x={x} y={y + 15} textAnchor={textAnchor}
            fill={score >= 7 ? '#22c55e' : score >= 4 ? '#eab308' : '#ef4444'}
            fontSize={14} fontWeight={700}
          >
            {score}/10
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="rounded-xl border border-gray-700/50 bg-[#111118] p-4 space-y-2">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        📊 AI Scorecard
      </h3>
      <div className="h-[280px]">
        {hasScores ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="50%">
              <PolarGrid stroke="#374151" />
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
                dot={{ r: 4, fill: '#8b5cf6', stroke: '#a78bfa', strokeWidth: 1 }} 
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
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
                : 'bg-gray-800/40 text-gray-500'
            }`}
          >
            {r.label}
          </span>
        ))}
      </div>
      {scorecard?.justification && (
        <p className="text-xs text-gray-400 italic border-t border-gray-700/50 pt-2 mt-1">
          {scorecard.justification}
        </p>
      )}
    </div>
  );
}
