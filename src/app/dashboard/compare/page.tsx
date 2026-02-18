"use client";

import { useState, useEffect } from 'react';
import ScoreCardCompare from '@/components/ScoreCardCompare';

const CANDIDATE_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
];

interface Interview {
  id: number;
  candidateName: string;
  status: string;
  createdAt: string;
}

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

export default function ComparePage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all interviews on mount
  useEffect(() => {
    fetch('/api/interviews')
      .then(res => res.json())
      .then(data => {
        // Filter out scheduled interviews (no scorecard yet)
        const completed = data.filter((i: Interview) => i.status !== 'scheduled');
        setInterviews(completed);
      })
      .catch(err => console.error('Error fetching interviews:', err));
  }, []);

  // Fetch scorecards when selection changes
  useEffect(() => {
    if (selectedIds.length === 0) {
      setCandidates([]);
      return;
    }

    setLoading(true);
    fetch(`/api/scorecards/compare?ids=${selectedIds.join(',')}`)
      .then(res => res.json())
      .then(data => {
        // Assign colors
        const withColors = data.candidates.map((c: any, idx: number) => ({
          ...c,
          color: CANDIDATE_COLORS[idx % CANDIDATE_COLORS.length],
        }));
        setCandidates(withColors);
      })
      .catch(err => console.error('Error fetching scorecards:', err))
      .finally(() => setLoading(false));
  }, [selectedIds]);

  const toggleInterview = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-foreground">Compare Candidates</h1>

        {/* Selection Panel */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Select Candidates to Compare</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {interviews.map(interview => (
              <label
                key={interview.id}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                  ${selectedIds.includes(interview.id)
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-border hover:border-muted-foreground/30'
                  }
                `}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(interview.id)}
                  onChange={() => toggleInterview(interview.id)}
                  className="w-4 h-4 accent-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate text-foreground">{interview.candidateName}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(interview.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {interviews.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No completed interviews found
            </div>
          )}
        </div>

        {/* Comparison View */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            <div className="mt-2 text-muted-foreground">Loading scorecards...</div>
          </div>
        ) : selectedIds.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Select at least one candidate to compare
          </div>
        ) : (
          <ScoreCardCompare candidates={candidates} />
        )}
      </div>
    </div>
  );
}
