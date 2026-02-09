'use client';
import type { InsightEntry } from '../page';

type Props = { insights: InsightEntry[] };
type Flag = { type: 'red' | 'green' | 'claim'; text: string; time: string };

export default function InsightsTimeline({ insights }: Props) {
  const flags: Flag[] = [];

  for (const ins of insights) {
    const p = ins.parsed;
    if (!p) continue;
    if (ins.tier === 1) {
      if (p.flag) flags.push({ type: 'red', text: p.flag, time: ins.time });
    }
    if (ins.tier === 2) {
      if (p.red_flags) {
        for (const f of p.red_flags) flags.push({ type: 'red', text: typeof f === 'string' ? f : f.text || JSON.stringify(f), time: ins.time });
      }
      if (p.green_flags) {
        for (const f of p.green_flags) flags.push({ type: 'green', text: typeof f === 'string' ? f : f.text || JSON.stringify(f), time: ins.time });
      }
      if (p.key_claims) {
        for (const c of p.key_claims) flags.push({ type: 'claim', text: typeof c === 'string' ? c : c.text || JSON.stringify(c), time: ins.time });
      }
    }
  }

  const sorted = [...flags].reverse();

  return (
    <div className="bg-[#111118] rounded-lg border border-gray-800 flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-800 shrink-0">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">🚩 Insights</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
        {!sorted.length ? (
          <div className="text-gray-500 text-center py-2 text-xs">Sin flags aún</div>
        ) : sorted.map((f, i) => (
          <div key={i} className={`flex items-start gap-2 px-2 py-1.5 rounded text-xs ${
            f.type === 'red' ? 'bg-red-950/30 border border-red-800/40' :
            f.type === 'green' ? 'bg-emerald-950/30 border border-emerald-800/40' :
            'bg-blue-950/30 border border-blue-800/40'
          }`}>
            <span className="shrink-0 mt-0.5">
              {f.type === 'red' ? '🔴' : f.type === 'green' ? '🟢' : '📌'}
            </span>
            <span className={`flex-1 leading-snug ${
              f.type === 'red' ? 'text-red-100' : f.type === 'green' ? 'text-emerald-100' : 'text-blue-100'
            }`}>{f.text}</span>
            <span className="text-gray-400 shrink-0 text-[10px]">{f.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
