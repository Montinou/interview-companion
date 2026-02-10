"use client";

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from 'recharts';

interface ScoreCard {
  attitude: number;
  communication: number;
  technical: number;
  strategic: number;
  leadership: number;
  english: number;
}

interface Candidate {
  id: number;
  name: string;
  scorecard: ScoreCard | null;
  color: string;
}

interface Props {
  candidates: Candidate[];
}

const CATEGORIES = [
  { key: 'attitude', label: 'Attitude' },
  { key: 'communication', label: 'Communication' },
  { key: 'technical', label: 'Technical' },
  { key: 'strategic', label: 'Strategic' },
  { key: 'leadership', label: 'Leadership' },
  { key: 'english', label: 'English' }
];

export default function ScoreCardCompare({ candidates }: Props) {
  // Transform data for radar chart
  const data = CATEGORIES.map(cat => {
    const point: any = { category: cat.label };
    candidates.forEach(candidate => {
      if (candidate.scorecard) {
        point[candidate.name] = candidate.scorecard[cat.key as keyof ScoreCard];
      }
    });
    return point;
  });

  // Filter out candidates without scorecards
  const validCandidates = candidates.filter(c => c.scorecard !== null);

  if (validCandidates.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No scorecards available for comparison yet
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Radar Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">AI Scorecard Comparison</h3>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="category" />
            <PolarRadiusAxis angle={90} domain={[0, 10]} />
            {validCandidates.map(candidate => (
              <Radar
                key={candidate.id}
                name={candidate.name}
                dataKey={candidate.name}
                stroke={candidate.color}
                fill={candidate.color}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            ))}
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Bar Chart Comparison */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Detailed Breakdown</h3>
        <div className="space-y-6">
          {CATEGORIES.map(cat => (
            <div key={cat.key}>
              <div className="text-sm font-medium text-gray-700 mb-2">{cat.label}</div>
              <div className="space-y-2">
                {validCandidates.map(candidate => {
                  const score = candidate.scorecard![cat.key as keyof ScoreCard];
                  return (
                    <div key={candidate.id} className="flex items-center gap-3">
                      <div className="w-32 text-sm text-gray-600 truncate">{candidate.name}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                        <div
                          className="h-6 rounded-full flex items-center justify-end px-2 text-white text-xs font-semibold transition-all"
                          style={{
                            width: `${score * 10}%`,
                            backgroundColor: candidate.color
                          }}
                        >
                          {score}/10
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overall Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Overall Averages</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {validCandidates.map(candidate => {
            const scores = Object.values(candidate.scorecard!);
            const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
            return (
              <div key={candidate.id} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: candidate.color }}
                  />
                  <div className="font-medium">{candidate.name}</div>
                </div>
                <div className="text-3xl font-bold" style={{ color: candidate.color }}>
                  {avg}/10
                </div>
                <div className="text-sm text-gray-500 mt-1">Average Score</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
