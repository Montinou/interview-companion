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

export function InterviewGuide() {
  const [expandedPhases, setExpandedPhases] = useState<string[]>(['phase1']);

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => 
      prev.includes(phaseId) 
        ? prev.filter(id => id !== phaseId)
        : [...prev, phaseId]
    );
  };

  const candidateSummary = {
    name: 'Nicolas Lobos',
    title: 'QA Automation Engineer',
    experience: '7 years QA, 6 automation, Radium Rocket (6+ years)',
    skills: 'JS/TS 6 years, Playwright 4 years, Cypress',
    location: 'Rosario, Argentina',
    english: 'C1 English certified',
    teamwork: 'Works with USA/India teams',
    preference: 'Wants to stay technical QA (not Lead)',
    match: '8/9 with JD',
    gaps: 'CI/CD (GitLab not GitHub/Azure), POM not textual, Data-driven depth'
  };

  const phases: PhaseSection[] = [
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

  const redFlags = [
    'Assumes QA is to blame for prod bugs',
    'Only wants to script, doesn\'t understand business',
    'English below C1',
    'Can\'t explain own technical decisions',
    'Contradicts CV in interview'
  ];

  const greenFlags = [
    '6 years Radium Rocket = stability',
    'Led Cypress→Playwright migration = ownership',
    'Trained teams = mentorship',
    'Prefers technical QA > Lead = knows what they want'
  ];

  return (
    <div className="rounded-xl border border-gray-800 bg-[#111118] backdrop-blur-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-800/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-indigo-500/10 p-1.5">
            <BookOpen className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Interview Guide</h3>
            <p className="text-[10px] text-gray-500">Step-by-step preparation</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Candidate Summary Card */}
        <div className="rounded-lg border border-gray-800 bg-[#0d0d14] p-3 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-3.5 w-3.5 text-blue-400" />
            <h4 className="text-xs font-semibold text-white">Candidate Summary</h4>
          </div>
          <div className="space-y-1 text-[10px] text-gray-400">
            <p className="text-white font-medium text-[11px]">{candidateSummary.name} — {candidateSummary.title}</p>
            <p>• {candidateSummary.experience}</p>
            <p>• {candidateSummary.skills}</p>
            <p>• {candidateSummary.location} — {candidateSummary.english}</p>
            <p>• {candidateSummary.teamwork}</p>
            <p>• {candidateSummary.preference}</p>
            <p className="text-green-400">• Match: {candidateSummary.match}</p>
            <p className="text-yellow-400">• Gaps: {candidateSummary.gaps}</p>
          </div>
        </div>

        {/* Interview Phases */}
        <div className="space-y-2">
          {phases.map((phase) => {
            const isExpanded = expandedPhases.includes(phase.id);
            const Icon = phase.icon;

            return (
              <div key={phase.id} className="rounded-lg border border-gray-800 bg-[#0d0d14] overflow-hidden">
                {/* Phase Header */}
                <button
                  onClick={() => togglePhase(phase.id)}
                  className="w-full p-2.5 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="rounded bg-indigo-500/10 p-1">
                      <Icon className="h-3.5 w-3.5 text-indigo-400" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{phase.title}</span>
                        {phase.duration && (
                          <span className="text-[10px] text-gray-500">({phase.duration})</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                </button>

                {/* Phase Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 pt-0 space-y-3">
                        {phase.blocks?.map((block, blockIdx) => (
                          <div key={blockIdx} className="space-y-2">
                            {block.title && (
                              <h5 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                                {block.title}
                              </h5>
                            )}
                            <div className="space-y-2">
                              {block.questions.map((q, qIdx) => (
                                <div key={qIdx} className="space-y-1">
                                  {q.text && (
                                    <p className="text-[11px] text-white font-medium leading-relaxed">
                                      {q.text}
                                    </p>
                                  )}
                                  {q.listen && (
                                    <p className="text-[10px] text-gray-500 pl-2 border-l-2 border-gray-700">
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
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Red Flags */}
        <div className="rounded-lg border border-red-900/30 bg-red-950/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            <h4 className="text-xs font-semibold text-red-400">Red Flags</h4>
          </div>
          <ul className="space-y-1 text-[10px] text-gray-400">
            {redFlags.map((flag, idx) => (
              <li key={idx}>• {flag}</li>
            ))}
          </ul>
        </div>

        {/* Green Flags */}
        <div className="rounded-lg border border-green-900/30 bg-green-950/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
            <h4 className="text-xs font-semibold text-green-400">Green Flags Expected</h4>
          </div>
          <ul className="space-y-1 text-[10px] text-gray-400">
            {greenFlags.map((flag, idx) => (
              <li key={idx}>• {flag}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
