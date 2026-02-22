'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Clock, CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

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

interface ProfileStructure {
  totalDuration?: number;
  phases?: {
    name: string;
    duration?: number;
    questions?: { text: string; listenFor?: string; note?: string }[];
  }[];
}

interface InterviewPlanProps {
  interviewId: number;
  profileStructure?: ProfileStructure | null;
}

/** Convert profile interviewStructure JSON → Section[] for the plan UI */
function profileToSections(ps: ProfileStructure): Section[] {
  return (ps.phases || []).map((phase, pi) => ({
    id: pi + 1,
    name: phase.name,
    description: null,
    duration_min: phase.duration ?? null,
    topics: [
      {
        id: pi + 1,
        name: 'Preguntas',
        description: null,
        priority: 'high',
        questions: (phase.questions || []).map((q, qi) => ({
          id: pi * 100 + qi + 1,
          question: q.text,
          purpose: q.note ?? null,
          expected_signals: q.listenFor ?? null,
          follow_ups: null,
          asked: false,
          answer_quality: null,
          notes: null,
        })),
      },
    ],
  }));
}

export function InterviewPlan({ interviewId, profileStructure }: InterviewPlanProps) {
  const [sections, setSections] = useState<Section[]>(() =>
    profileStructure ? profileToSections(profileStructure) : []
  );
  const [expandedSection, setExpandedSection] = useState<number | null>(
    profileStructure?.phases?.length ? 1 : null
  );
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(!!profileStructure);

  useEffect(() => {
    // If we already have profile data, no API call needed
    if (profileStructure) {
      const s = profileToSections(profileStructure);
      setSections(s);
      if (s.length > 0) setExpandedSection(s[0].id);
      setLoaded(true);
      return;
    }
    if (loaded) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/interview-data?id=${interviewId}&type=plan`, {
          credentials: 'include',
        });
        if (!res.ok) return;
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
  }, [interviewId, loaded, profileStructure]);

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
    <Card className="border-border bg-card flex flex-col h-full">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs uppercase tracking-wider">
            📋 Plan de Entrevista
          </CardTitle>
          <span className="text-[10px] text-muted-foreground">
            {askedQuestions}/{totalQuestions} preguntadas
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-1.5">
        <ScrollArea className="h-full">
          <div className="space-y-1 pr-2">
            {sections.length === 0 && (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-xs">
                Sin plan cargado
              </div>
            )}

            {sections.map(section => {
              const isExpanded = expandedSection === section.id;
              const sectionAsked = section.topics.reduce((a, t) => a + t.questions.filter(q => q.asked).length, 0);
              const sectionTotal = section.topics.reduce((a, t) => a + t.questions.length, 0);

              return (
                <Collapsible
                  key={section.id}
                  open={isExpanded}
                  onOpenChange={() => setExpandedSection(isExpanded ? null : section.id)}
                  className="rounded border border-border/50"
                >
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-muted/30 transition-colors">
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-xs font-medium flex-1 truncate">
                        {section.name}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {section.duration_min && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" /> {section.duration_min}m
                          </span>
                        )}
                        <Badge variant="secondary" className="text-[10px] px-1">
                          {sectionAsked}/{sectionTotal}
                        </Badge>
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="px-2 pb-2 space-y-1.5">
                    {section.topics.map(topic => (
                      <div key={topic.id} className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                            topic.priority === 'high' ? 'bg-red-400' :
                            topic.priority === 'medium' ? 'bg-yellow-400' : 'bg-muted-foreground'
                          }`} />
                          <span className="text-[11px] font-medium">{topic.name}</span>
                        </div>

                        {topic.questions.map(q => (
                          <div
                            key={q.id}
                            className={`ml-3 rounded px-2 py-1 cursor-pointer transition-all ${
                              q.asked
                                ? 'bg-green-500/5 border border-green-500/20'
                                : 'bg-muted/30 border border-transparent hover:border-primary/30'
                            }`}
                            onClick={() => setExpandedQuestion(expandedQuestion === q.id ? null : q.id)}
                          >
                            <div className="flex items-start gap-1.5">
                              <Checkbox
                                checked={q.asked}
                                onCheckedChange={(checked) => {
                                  if (checked && !q.asked) markAsked(q.id);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="mt-0.5"
                              />
                              <p className={`text-[11px] leading-tight flex-1 ${
                                q.asked ? 'text-muted-foreground line-through' : ''
                              }`}>
                                {q.question}
                              </p>
                            </div>

                            {expandedQuestion === q.id && (
                              <div className="mt-1.5 ml-6 space-y-1 text-[10px]">
                                {q.purpose && (
                                  <p className="text-indigo-300/70">
                                    <span className="text-muted-foreground">Por qué: </span>{q.purpose}
                                  </p>
                                )}
                                {q.expected_signals && (
                                  <p className="text-yellow-300/60">
                                    <span className="text-muted-foreground">Señales: </span>{q.expected_signals}
                                  </p>
                                )}
                                {q.follow_ups && (
                                  <p className="text-cyan-300/60">
                                    <span className="text-muted-foreground">Follow-up: </span>{q.follow_ups}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
