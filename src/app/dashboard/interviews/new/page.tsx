'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createInterview } from '@/app/actions/interviews';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, User, Sparkles, FileText, ChevronRight, ChevronLeft, Loader2, Check } from 'lucide-react';

export default function NewInterviewPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <NewInterviewPage />
    </Suspense>
  );
}

// Types
interface Candidate {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  cvUrl: string | null;
  cvData: any;
  jiraTicket: string | null;
}

interface Profile {
  id: number;
  name: string;
  seniority: string | null;
  roleType: string;
  description: string;
  techStack: string[] | null;
  usageCount: number | null;
  evaluationDimensions: { key: string; label: string; weight: number }[] | null;
  interviewStructure: {
    totalDuration: number;
    phases: { name: string; duration: number; questions: { text: string }[] }[];
  } | null;
}

type Step = 'candidate' | 'profile' | 'details' | 'confirm';
const STEPS: Step[] = ['candidate', 'profile', 'details', 'confirm'];

function NewInterviewPage() {
  const searchParams = useSearchParams();
  const preselectedCandidateId = searchParams.get('candidateId');

  // Step state
  const [currentStep, setCurrentStep] = useState<Step>('candidate');

  // Candidate step
  const [candidateMode, setCandidateMode] = useState<'existing' | 'new'>('existing');
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ name: '', email: '', phone: '' });

  // Profile step
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);

  // Details step
  const [language, setLanguage] = useState('es');
  const [jiraTicket, setJiraTicket] = useState('');

  // Submit
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch candidates
  const fetchCandidates = useCallback(async (q?: string) => {
    setIsSearching(true);
    try {
      const url = q ? `/api/candidates?q=${encodeURIComponent(q)}` : '/api/candidates';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates);
      }
    } catch (e) {
      console.error('Fetch candidates error:', e);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Fetch profiles
  const fetchProfiles = useCallback(async () => {
    setIsLoadingProfiles(true);
    try {
      const res = await fetch('/api/profiles');
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles);
      }
    } catch (e) {
      console.error('Fetch profiles error:', e);
    } finally {
      setIsLoadingProfiles(false);
    }
  }, []);

  // Load candidates on mount
  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Pre-select candidate if coming from candidate detail
  useEffect(() => {
    if (preselectedCandidateId && candidates.length > 0) {
      const found = candidates.find(c => c.id === parseInt(preselectedCandidateId));
      if (found) {
        setSelectedCandidate(found);
        setCandidateMode('existing');
      }
    }
  }, [preselectedCandidateId, candidates]);

  // Load profiles when entering profile step
  useEffect(() => {
    if (currentStep === 'profile' && profiles.length === 0) {
      fetchProfiles();
    }
  }, [currentStep, profiles.length, fetchProfiles]);

  // Search debounce
  useEffect(() => {
    if (candidateMode !== 'existing') return;
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        fetchCandidates(searchQuery);
      } else if (searchQuery.length === 0) {
        fetchCandidates();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, candidateMode, fetchCandidates]);

  // Navigation
  const stepIndex = STEPS.indexOf(currentStep);
  const canNext = () => {
    if (currentStep === 'candidate') {
      return candidateMode === 'existing' ? !!selectedCandidate : (!!newCandidate.name && !!newCandidate.email);
    }
    return true; // profile and details are optional
  };
  const goNext = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1]);
  };
  const goBack = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx > 0) setCurrentStep(STEPS[idx - 1]);
  };

  // Submit
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();

      if (candidateMode === 'existing' && selectedCandidate) {
        formData.set('candidateId', String(selectedCandidate.id));
      } else {
        formData.set('candidateName', newCandidate.name);
        formData.set('candidateEmail', newCandidate.email);
        if (newCandidate.phone) formData.set('candidatePhone', newCandidate.phone);
      }

      if (selectedProfile) {
        formData.set('profileId', String(selectedProfile.id));
      }

      formData.set('language', language);
      if (jiraTicket) formData.set('jiraTicket', jiraTicket);

      await createInterview(formData);
    } catch (e) {
      console.error('Create interview error:', e);
      setIsSubmitting(false);
    }
  };

  const stepLabels: Record<Step, string> = {
    candidate: 'Candidato',
    profile: 'Perfil',
    details: 'Detalles',
    confirm: 'Confirmar',
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/interviews" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Interviews
        </Link>
        <h1 className="text-3xl font-bold mt-3 text-foreground">Nueva Entrevista</h1>
        <p className="text-muted-foreground mt-1">Configurá la sesión paso a paso</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <button
              onClick={() => {
                // Allow clicking back to completed steps
                if (i <= stepIndex) setCurrentStep(step);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                step === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : i < stepIndex
                  ? 'bg-primary/20 text-primary cursor-pointer'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
              <span className="hidden sm:inline">{stepLabels[step]}</span>
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground/50" />}
          </div>
        ))}
      </div>

      {/* Step 1: Candidate */}
      {currentStep === 'candidate' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Seleccionar Candidato</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <Button
                variant={candidateMode === 'existing' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCandidateMode('existing')}
              >
                Candidato existente
              </Button>
              <Button
                variant={candidateMode === 'new' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setCandidateMode('new'); setSelectedCandidate(null); }}
              >
                Nuevo candidato
              </Button>
            </div>

            {candidateMode === 'existing' ? (
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Candidate list */}
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {isSearching ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : candidates.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-6">
                      No se encontraron candidatos
                    </p>
                  ) : (
                    candidates.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCandidate(c)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedCandidate?.id === c.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:bg-accent/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">{c.name}</p>
                            {c.email && <p className="text-sm text-muted-foreground">{c.email}</p>}
                          </div>
                          <div className="flex gap-1.5">
                            {c.cvUrl && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 text-xs">
                                CV ✓
                              </Badge>
                            )}
                            {selectedCandidate?.id === c.id && (
                              <Check className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Selected candidate CV preview */}
                {selectedCandidate?.cvData && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-1">CV Analysis</p>
                    {(selectedCandidate.cvData as any).summary && (
                      <p className="text-sm text-foreground/80">{(selectedCandidate.cvData as any).summary}</p>
                    )}
                    {(selectedCandidate.cvData as any).tech_stack?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(selectedCandidate.cvData as any).tech_stack.slice(0, 6).map((t: string) => (
                          <Badge key={t} variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="candidateName">Nombre completo *</Label>
                  <Input
                    id="candidateName"
                    value={newCandidate.name}
                    onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                    placeholder="Juan Pérez"
                  />
                </div>
                <div>
                  <Label htmlFor="candidateEmail">Email *</Label>
                  <Input
                    id="candidateEmail"
                    type="email"
                    value={newCandidate.email}
                    onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                    placeholder="juan@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="candidatePhone">Teléfono</Label>
                  <Input
                    id="candidatePhone"
                    type="tel"
                    value={newCandidate.phone}
                    onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })}
                    placeholder="+54 9 11 1234 5678"
                  />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={goNext} disabled={!canNext()}>
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Profile */}
      {currentStep === 'profile' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                <h2 className="text-xl font-semibold">Perfil de Entrevista</h2>
              </div>
              <Badge variant="outline" className="text-muted-foreground">Opcional</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Elegí un template para guiar la entrevista con preguntas y dimensiones de evaluación
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingProfiles ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground mb-3">No hay perfiles creados</p>
                <Button variant="outline" asChild size="sm">
                  <Link href="/dashboard/profiles/new" target="_blank">
                    Crear perfil
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                {/* No profile option */}
                <button
                  onClick={() => setSelectedProfile(null)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedProfile === null
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-accent/50'
                  }`}
                >
                  <p className="font-medium text-foreground">Sin perfil</p>
                  <p className="text-sm text-muted-foreground">Entrevista libre sin template</p>
                </button>

                {profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProfile(p)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selectedProfile?.id === p.id
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-border hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{p.name}</p>
                          {p.seniority && (
                            <Badge variant="outline" className="text-xs capitalize">{p.seniority}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                        {p.techStack && p.techStack.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {p.techStack.slice(0, 5).map((t) => (
                              <Badge key={t} variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        {selectedProfile?.id === p.id && <Check className="h-5 w-5 text-purple-400" />}
                        <p className="text-xs text-muted-foreground mt-1">
                          {p.usageCount || 0} usos
                        </p>
                      </div>
                    </div>
                    {/* Structure preview */}
                    {selectedProfile?.id === p.id && p.interviewStructure && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Estructura ({p.interviewStructure.totalDuration} min)
                        </p>
                        <div className="flex gap-2">
                          {p.interviewStructure.phases.map((phase, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {phase.name} ({phase.duration}m)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Dimensions preview */}
                    {selectedProfile?.id === p.id && p.evaluationDimensions && p.evaluationDimensions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Dimensiones de evaluación
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {p.evaluationDimensions.map((d) => (
                            <Badge key={d.key} variant="outline" className="text-xs">
                              {d.label} ({Math.round(d.weight * 100)}%)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </>
            )}
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={goBack}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button onClick={goNext}>
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Details */}
      {currentStep === 'details' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Detalles</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Idioma de la entrevista</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">🇦🇷 Español</SelectItem>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="multi">🌐 Multilingüe</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Afecta el idioma del STT y los prompts de análisis
              </p>
            </div>

            <div>
              <Label htmlFor="jiraTicket">Jira Ticket</Label>
              <Input
                id="jiraTicket"
                value={jiraTicket}
                onChange={(e) => setJiraTicket(e.target.value)}
                placeholder="TI-7213"
                className="mt-1.5"
              />
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={goBack}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button onClick={goNext}>
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 4: Confirm */}
      {currentStep === 'confirm' && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Confirmar Entrevista</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Candidate summary */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">CANDIDATO</p>
              {candidateMode === 'existing' && selectedCandidate ? (
                <div>
                  <p className="font-medium text-foreground">{selectedCandidate.name}</p>
                  {selectedCandidate.email && <p className="text-sm text-muted-foreground">{selectedCandidate.email}</p>}
                </div>
              ) : (
                <div>
                  <p className="font-medium text-foreground">{newCandidate.name}</p>
                  <p className="text-sm text-muted-foreground">{newCandidate.email}</p>
                  <Badge variant="outline" className="mt-1 text-xs">Nuevo</Badge>
                </div>
              )}
            </div>

            {/* Profile summary */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">PERFIL</p>
              {selectedProfile ? (
                <div>
                  <p className="font-medium text-foreground">{selectedProfile.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedProfile.description}</p>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Sin perfil — entrevista libre</p>
              )}
            </div>

            {/* Details summary */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">DETALLES</p>
              <div className="flex flex-wrap gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Idioma</p>
                  <p className="text-sm font-medium text-foreground">
                    {language === 'es' ? '🇦🇷 Español' : language === 'en' ? '🇺🇸 English' : '🌐 Multi'}
                  </p>
                </div>
                {jiraTicket && (
                  <div>
                    <p className="text-xs text-muted-foreground">Jira</p>
                    <p className="text-sm font-medium text-foreground">{jiraTicket}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={goBack}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Entrevista'
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
