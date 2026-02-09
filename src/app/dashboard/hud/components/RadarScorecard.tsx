'use client';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer,
} from 'recharts';
import type { Scorecard } from '../page';

const DIMS = [
  { key: 'actitud', label: 'Actitud' },
  { key: 'comunicacion', label: 'Comunicación' },
  { key: 'tecnico', label: 'Técnico' },
  { key: 'estrategico', label: 'Estrategia' },
  { key: 'liderazgo', label: 'Liderazgo' },
  { key: 'ingles', label: 'Inglés' },
] as const;

const RECS = [
  { key: 'strong_hire', label: 'Strong Hire', color: 'bg-green-600' },
  { key: 'hire', label: 'Hire', color: 'bg-green-500/70' },
  { key: 'maybe', label: 'Maybe', color: 'bg-yellow-500/70' },
  { key: 'no_hire', label: 'No Hire', color: 'bg-orange-500/70' },
  { key: 'strong_no', label: 'Strong No', color: 'bg-red-600' },
];

type Props = { scorecard: Scorecard | null };

export default function RadarScorecard({ scorecard }: Props) {
  const data = DIMS.map(d => ({
    dim: d.label,
    value: scorecard ? (scorecard as Record<string, any>)[d.key] || 0 : 0,
    fullMark: 10,
  }));

  const rec = scorecard?.recommendation || null;
  const hasScores = data.some(d => d.value > 0);

  const renderAxisTick = ({ payload, x, y, textAnchor, ...rest }: any) => {
    const item = data.find(d => d.dim === payload.value);
    const score = item?.value || 0;
    return (
      <g>
        <text x={x} y={y} textAnchor={textAnchor} fill="#d1d5db" fontSize={11} fontWeight={600} {...rest}>
          {payload.value}
        </text>
        {hasScores && (
          <text x={x} y={y + 14} textAnchor={textAnchor} fill={score >= 7 ? '#22c55e' : score >= 4 ? '#eab308' : '#ef4444'} fontSize={12} fontWeight={700}>
            {score}/10
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="bg-[#111118] rounded-lg border border-gray-800 flex flex-col h-full p-2">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">📊 AI Scorecard</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="50%">
            <PolarGrid stroke="#374151" />
            <PolarAngleAxis dataKey="dim" tick={renderAxisTick} />
            <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} axisLine={false} />
            <Radar dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} dot={{ r: 4, fill: '#8b5cf6', stroke: '#a78bfa', strokeWidth: 1 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-1 px-1 pb-1">
        {RECS.map(r => (
          <button
            key={r.key}
            className={`flex-1 py-1 rounded text-[10px] font-medium transition-all ${
              rec === r.key
                ? `${r.color} text-white ring-1 ring-white/30`
                : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
