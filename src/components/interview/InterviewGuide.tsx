'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronRight, 
  BookOpen, 
  User, 
  MessageCircle, 
  Globe, 
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface PhaseSection {
  id: string;
  title: string;
  icon: any;
  duration?: string;
  blocks?: {
    title?: string;
    questions: {
      text: string;
      listen?: string;
      note?: string;
    }[];
  }[];
}

interface InterviewProfile {
  name: string;
  seniority?: string;
  description: string;
  redFlags?: string[];
  greenFlags?: string[];
  interviewStructure?: {
    totalDuration: number;
    phases: {
      name: string;
      duration: number;
      questions: { text: string; listenFor?: string; note?: string }[];
    }[];
  };
}

interface InterviewGuideProps {
  candidateName: string;
  candidateTitle?: string;
  jiraTicket?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  profile?: InterviewProfile;
}

export function InterviewGuide({ 
  candidateName, 
  candidateTitle,
  jiraTicket,
  candidateEmail,
  candidatePhone,
  profile 
}: InterviewGuideProps) {
  const [expandedPhases, setExpandedPhases] = useState<string[]>(['phase1']);

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => 
      prev.includes(phaseId) 
        ? prev.filter(id => id !== phaseId)
        : [...prev, phaseId]
    );
  };

  const hasValidCandidateData = candidateName && candidateName !== 'Unknown Candidate';

  // Build phases from profile if available, otherwise use hardcoded
  const phases: PhaseSection[] = profile?.interviewStructure ? 
    profile.interviewStructure.phases.map((phase, idx) => ({
      id: `phase${idx + 1}`,
      title: phase.name,
      icon: [MessageCircle, Zap, Globe, HelpCircle, Users][idx] || BookOpen,
      duration: `${phase.duration} min`,
      blocks: [{
        questions: phase.questions.map(q => ({
          text: q.text,
          listen: q.listenFor,
          note: q.note
        }))
      }]
    }))
    : [
    {
      id: 'phase1',
      title: 'Intro',
      icon: MessageCircle,
      duration: '5 min',
      blocks: [{
        questions: [
          {
            text: '"Esto es más una charla entre pares que un examen."',
            note: 'Set comfortable tone'
          },
          {
            text: 'Ask them to describe their career, last 2-3 experiences',
            listen: 'Technologies, project types, why they\'d switch'
          }
        ]
      }]
    },
    {
      id: 'phase2',
      title: 'Technical Indirect',
      icon: Zap,
      duration: '30 min',
      blocks: [
        {
          title: 'Block A: Framework/Architecture',
          questions: [
            {
              text: '¿Cómo estaba estructurado el framework de automation?',
              listen: 'Listen for POM. If not: "¿Usaron algún patrón de diseño?"'
            },
            {
              text: 'Contame la migración Cypress→Playwright, desafíos del POC',
              listen: 'Technical leadership + depth'
            },
            {
              text: '¿Cómo manejaban el login en los tests?',
              listen: 'storageState? Auth bypass?'
            }
          ]
        },
        {
          title: 'Block B: Deep Playwright',
          questions: [
            {
              text: '¿Tests en paralelo o serializado?',
              listen: 'Workers, fullyParallel'
            },
            {
              text: '¿Qué son los fixtures de Playwright?',
              listen: 'Almost nobody knows (green flag if yes)'
            },
            {
              text: '¿Cómo manejás race conditions y flaky tests?',
              listen: 'Async patterns, retries, waitFor'
            }
          ]
        },
        {
          title: 'Block C: Strategic Questions (CRITICAL — measure maturity)',
          questions: [
            {
              text: 'Si soy el CTO y quiero 100% cobertura automatizada, ¿qué me respondés?',
              listen: '❌ "Sí, se puede" / ✅ "Depende del producto, balance..."'
            },
            {
              text: 'Testing establecido pero bugs en prod. Mesa redonda. ¿Por dónde arrancás?',
              listen: '❌ "Reviso test cases" / ✅ "Causa raíz — reqs, comunicación, diseño..."'
            },
            {
              text: '¿Para qué sirve la automatización?',
              listen: '❌ "Tests más rápido" / ✅ "Depende: regresión CI/CD, feedback, escala..."'
            }
          ]
        },
        {
          title: 'Block D: CI/CD gap',
          questions: [
            {
              text: '¿GitHub Actions o Azure DevOps? Si no, ¿qué tan rápido te adaptás desde GitLab?',
            }
          ]
        },
        {
          title: 'Block E: Data-driven',
          questions: [
            {
              text: '¿Cómo manejarías múltiples datasets en Playwright? Ejemplo concreto.',
            }
          ]
        }
      ]
    },
    {
      id: 'phase3',
      title: 'English',
      icon: Globe,
      duration: '15-20 min',
      blocks: [{
        questions: [
          {
            text: 'Switch to English',
            note: 'From this point, speak only English'
          },
          {
            text: 'Best and worst work experience'
          },
          {
            text: 'What do you like most/least about your job?'
          },
          {
            text: 'Describe a conflict with a team member'
          },
          {
            text: 'What did you do last weekend?'
          },
          {
            text: '',
            listen: 'C1 real = fluent, broad vocab, 5-10 min enough. If hesitant = extend to 15-20 min'
          }
        ]
      }]
    },
    {
      id: 'phase4',
      title: 'Candidate Questions',
      icon: HelpCircle,
      duration: '5 min',
      blocks: [{
        questions: [
          {
            text: 'Your turn — any questions for me?',
            listen: '🚩 Red flag: asks nothing or only about salary'
          }
        ]
      }]
    }
  ];

  const redFlags = profile?.redFlags || [
    'Assumes QA is to blame for prod bugs',
    'Only wants to script, doesn\'t understand business',
    'English below C1',
    'Can\'t explain own technical decisions',
    'Contradicts CV in interview'
  ];

  const greenFlags = profile?.greenFlags || [
    'Stability in previous roles',
    'Led technical initiatives',
    'Mentored team members',
    'Clear career goals'
  ];

  return (
    <Card className="border-border bg-card backdrop-blur-sm overflow-hidden h-full flex flex-col">
      <CardHeader className="py-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-indigo-500/10 p-1.5">
            <BookOpen className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Interview Guide</h3>
            <p className="text-[10px] text-muted-foreground">Step-by-step preparation</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full px-3">
          <div className="space-y-3 py-3">
            {/* Candidate Summary Card */}
            <Card className="bg-card/50">
              <CardHeader className="py-3">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-blue-400" />
                  <h4 className="text-xs font-semibold">Candidate Summary</h4>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-[10px] text-muted-foreground pt-0">
                {hasValidCandidateData ? (
                  <>
                    <p className="font-medium text-[11px] text-foreground">
                      {candidateName}
                      {candidateTitle && ` — ${candidateTitle}`}
                    </p>
                    {candidateEmail && <p>• {candidateEmail}</p>}
                    {candidatePhone && <p>• {candidatePhone}</p>}
                    {jiraTicket && (
                      <p>
                        • Jira:{' '}
                        <a
                          href={`https://distillery.atlassian.net/browse/${jiraTicket}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline"
                        >
                          {jiraTicket}
                        </a>
                      </p>
                    )}
                  </>
                ) : (
                  <p className="italic">No candidate data loaded</p>
                )}
              </CardContent>
            </Card>

            {/* Interview Phases */}
            <Accordion type="multiple" value={expandedPhases} onValueChange={setExpandedPhases} className="space-y-2">
              {phases.map((phase) => {
                const Icon = phase.icon;

                return (
                  <AccordionItem key={phase.id} value={phase.id} className="border rounded-lg bg-card/50">
                    <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-muted/30">
                      <div className="flex items-center gap-2">
                        <div className="rounded bg-indigo-500/10 p-1">
                          <Icon className="h-3.5 w-3.5 text-indigo-400" />
                        </div>
                        <span className="text-xs font-semibold">{phase.title}</span>
                        {phase.duration && (
                          <Badge variant="outline" className="text-[10px]">
                            {phase.duration}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-3 space-y-3">
                      {phase.blocks?.map((block, blockIdx) => (
                        <div key={blockIdx} className="space-y-2">
                          {block.title && (
                            <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                              {block.title}
                            </h5>
                          )}
                          <div className="space-y-2">
                            {block.questions.map((q, qIdx) => (
                              <div key={qIdx} className="space-y-1">
                                {q.text && (
                                  <p className="text-[11px] font-medium leading-relaxed">
                                    {q.text}
                                  </p>
                                )}
                                {q.listen && (
                                  <p className="text-[10px] text-muted-foreground pl-2 border-l-2 border-border">
                                    → {q.listen}
                                  </p>
                                )}
                                {q.note && (
                                  <p className="text-[10px] text-blue-400 italic">
                                    {q.note}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            {/* Red Flags */}
            <Alert variant="destructive" className="border-red-900/30 bg-red-950/20">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-xs">Red Flags</AlertTitle>
              <AlertDescription>
                <ul className="space-y-1 text-[10px] mt-2">
                  {redFlags.map((flag, idx) => (
                    <li key={idx}>• {flag}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>

            {/* Green Flags */}
            <Alert className="border-green-900/30 bg-green-950/20 text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle className="text-xs">Green Flags Expected</AlertTitle>
              <AlertDescription className="text-green-300/70">
                <ul className="space-y-1 text-[10px] mt-2">
                  {greenFlags.map((flag, idx) => (
                    <li key={idx}>• {flag}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
