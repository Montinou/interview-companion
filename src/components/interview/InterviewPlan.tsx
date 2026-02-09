'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Clock, CheckCircle2, Circle } from 'lucide-react';

interface Question {
  id: number;
  question: string;
  purpose: string | null;
  expected_signals: string | null;
  follow_ups: string | null;
  asked: boolean;
  answer_quality: number | null;
  notes: string | null;
}

interface Topic {
  id: number;
  name: string;
  description: string | null;
  priority: string;
  questions: Question[];
}

interface Section {
  id: number;
  name: string;
  description: string | null;
  duration_min: number | null;
  topics: Topic[];
}

interface InterviewPlanProps {
  interviewId: number;
}

export function InterviewPlan({ interviewId }: InterviewPlanProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/interview-data?id=${interviewId}&type=plan`, {
          credentials: 'include',
        });
        if (!res.ok) {
          console.error('[InterviewPlan] fetch failed:', res.status, await res.text().catch(() => ''));
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          setSections(data);
          setExpandedSection(data[0].id);
          setLoaded(true);
        }
      } catch (e) { console.error('[InterviewPlan] error:', e); }
    })();
    return () => { cancelled = true; };
  }, [interviewId, loaded]);

  const markAsked = async (questionId: number) => {
    try {
      await fetch(`/api/interview-data?id=${interviewId}&type=question-asked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
      });
      setSections(prev => prev.map(s => ({
        ...s,
        topics: s.topics.map(t => ({
          ...t,
          questions: t.questions.map(q =>
            q.id === questionId ? { ...q, asked: true } : q
          ),
        })),
      })));
    } catch (e) { console.error(e); }
  };

  const totalQuestions = sections.reduce((acc, s) =>
    acc + s.topics.reduce((a, t) => a + t.questions.length, 0), 0);
  const askedQuestions = sections.reduce((acc, s) =>
    acc + s.topics.reduce((a, t) => a + t.questions.filter(q => q.asked).length, 0), 0);

  return (
    <div className="rounded-lg border border-gray-800 bg-[#111118] flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 shrink-0">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          📋 Plan de Entrevista
        </h3>
        <span className="text-[10px] text-gray-500">
          {askedQuestions}/{totalQuestions} preguntadas
        </span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-1.5 space-y-1">
        {sections.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-600 text-xs">
            Sin plan cargado
          </div>
        )}

        {sections.map(section => {
          const isExpanded = expandedSection === section.id;
          const sectionAsked = section.topics.reduce((a, t) => a + t.questions.filter(q => q.asked).length, 0);
          const sectionTotal = section.topics.reduce((a, t) => a + t.questions.length, 0);

          return (
            <div key={section.id} className="rounded border border-gray-800/50">
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-gray-800/30 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-gray-500 shrink-0" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-gray-500 shrink-0" />
                )}
                <span className="text-xs font-medium text-gray-200 flex-1 truncate">
                  {section.name}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {section.duration_min && (
                    <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" /> {section.duration_min}m
                    </span>
                  )}
                  <span className="text-[10px] text-gray-500">{sectionAsked}/{sectionTotal}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-2 pb-2 space-y-1.5">
                  {section.topics.map(topic => (
                    <div key={topic.id} className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                          topic.priority === 'high' ? 'bg-red-400' :
                          topic.priority === 'medium' ? 'bg-yellow-400' : 'bg-gray-500'
                        }`} />
                        <span className="text-[11px] font-medium text-gray-300">{topic.name}</span>
                      </div>

                      {topic.questions.map(q => (
                        <div
                          key={q.id}
                          className={`ml-3 rounded px-2 py-1 cursor-pointer transition-all ${
                            q.asked
                              ? 'bg-green-500/5 border border-green-500/20'
                              : 'bg-gray-800/30 border border-transparent hover:border-indigo-500/30'
                          }`}
                          onClick={() => setExpandedQuestion(expandedQuestion === q.id ? null : q.id)}
                        >
                          <div className="flex items-start gap-1.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); if (!q.asked) markAsked(q.id); }}
                              className="shrink-0 mt-0.5"
                            >
                              {q.asked ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              ) : (
                                <Circle className="h-3 w-3 text-gray-600 hover:text-indigo-400" />
                              )}
                            </button>
                            <p className={`text-[11px] leading-tight ${
                              q.asked ? 'text-gray-500' : 'text-gray-200'
                            }`}>
                              {q.question}
                            </p>
                          </div>

                          {expandedQuestion === q.id && (
                            <div className="mt-1.5 ml-4.5 space-y-1 text-[10px]">
                              {q.purpose && (
                                <p className="text-indigo-300/70">
                                  <span className="text-gray-500">Por qué: </span>{q.purpose}
                                </p>
                              )}
                              {q.expected_signals && (
                                <p className="text-yellow-300/60">
                                  <span className="text-gray-500">Señales: </span>{q.expected_signals}
                                </p>
                              )}
                              {q.follow_ups && (
                                <p className="text-cyan-300/60">
                                  <span className="text-gray-500">Follow-up: </span>{q.follow_ups}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
