import { db } from '@/lib/db';
import { candidates, interviews, scorecards } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getOrgContext, AuthError } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { CVUploader } from '@/components/cv/CVUploader';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let orgId: string;
  try {
    const ctx = await getOrgContext();
    orgId = ctx.orgId;
  } catch (e) {
    if (e instanceof AuthError) redirect('/sign-in');
    throw e;
  }

  const { id } = await params;
  const candidateId = parseInt(id);

  const candidate = await db.query.candidates.findFirst({
    where: and(eq(candidates.id, candidateId), eq(candidates.orgId, orgId)),
  });

  if (!candidate) notFound();

  // Fetch interview history
  const interviewHistory = await db
    .select({
      id: interviews.id,
      status: interviews.status,
      createdAt: interviews.createdAt,
      completedAt: interviews.completedAt,
      scorecard: scorecards,
    })
    .from(interviews)
    .leftJoin(scorecards, eq(interviews.id, scorecards.interviewId))
    .where(and(eq(interviews.candidateId, candidateId), eq(interviews.orgId, orgId)))
    .orderBy(desc(interviews.createdAt));

  const cvAnalysis = candidate.cvData as any;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back link */}
      <Link href="/dashboard/candidates" className="text-muted-foreground hover:text-foreground text-sm mb-4 inline-block transition-colors">
        ← Volver a candidatos
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{candidate.name}</h1>
        <div className="flex items-center gap-4 mt-2">
          {candidate.email && <p className="text-muted-foreground">{candidate.email}</p>}
          {candidate.phone && <p className="text-muted-foreground">{candidate.phone}</p>}
          {candidate.jiraTicket && (
            <Badge className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30">
              {candidate.jiraTicket}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: CV Analysis */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Análisis de CV</h2>

          {cvAnalysis ? (
            <Card>
              <CardContent className="pt-6 space-y-4">
                {/* Summary */}
                {cvAnalysis.summary && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Resumen</p>
                    <p className="text-foreground/90 text-sm">{cvAnalysis.summary}</p>
                  </div>
                )}

                {/* Stats */}
                <div className="flex gap-3">
                  {cvAnalysis.years_experience != null && (
                    <Card className="flex-1">
                      <CardContent className="pt-4 pb-4">
                        <p className="text-xs text-muted-foreground">Experiencia</p>
                        <p className="text-xl font-bold text-foreground">{cvAnalysis.years_experience} años</p>
                      </CardContent>
                    </Card>
                  )}
                  {cvAnalysis.seniority && (
                    <Card className="flex-1">
                      <CardContent className="pt-4 pb-4">
                        <p className="text-xs text-muted-foreground">Seniority</p>
                        <p className="text-xl font-bold text-foreground capitalize">{cvAnalysis.seniority}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Tech Stack */}
                {cvAnalysis.tech_stack?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-2">Tech Stack</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cvAnalysis.tech_stack.map((tech: string) => (
                        <Badge key={tech} variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {cvAnalysis.education?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Educación</p>
                    <ul className="text-sm text-foreground/80 space-y-1">
                      {cvAnalysis.education.map((edu: string, i: number) => (
                        <li key={i}>• {edu}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Flags */}
                {cvAnalysis.flags?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-2">Pre-Interview Flags</p>
                    <ul className="space-y-1.5">
                      {cvAnalysis.flags.map((flag: any, i: number) => (
                        <li key={i} className={`text-sm flex items-start gap-2 ${
                          flag.severity === 'red' ? 'text-red-400' :
                          flag.severity === 'yellow' ? 'text-yellow-400' : 'text-foreground/80'
                        }`}>
                          <span className="mt-0.5">
                            {flag.severity === 'red' ? '🔴' : flag.severity === 'yellow' ? '🟡' : 'ℹ️'}
                          </span>
                          <span>{flag.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggested questions */}
                {cvAnalysis.suggested_questions?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-2">Preguntas Sugeridas (del CV)</p>
                    <ul className="space-y-1.5">
                      {cvAnalysis.suggested_questions.map((q: string, i: number) => (
                        <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                          <span className="text-blue-400">💬</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground mb-4">Sin CV analizado</p>
                <p className="text-muted-foreground/70 text-sm">
                  Subí un CV desde la lista de candidatos para ver el análisis aquí.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Interview History */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Historial de Entrevistas ({interviewHistory.length})
          </h2>

          {interviewHistory.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Sin entrevistas aún</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {interviewHistory.map((int) => (
                <Link
                  key={int.id}
                  href={`/dashboard/interviews/${int.id}`}
                >
                  <Card className="hover:bg-accent/50 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge
                            variant={int.status === 'live' ? 'default' : int.status === 'completed' ? 'secondary' : 'outline'}
                            className={
                              int.status === 'live' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' :
                              int.status === 'completed' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' :
                              ''
                            }
                          >
                            {int.status}
                          </Badge>
                          <p className="text-muted-foreground text-sm mt-1">
                            {new Date(int.createdAt).toLocaleDateString('es-AR', {
                              day: 'numeric', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>

                        {/* Scorecard mini radar */}
                        {int.scorecard && (
                          <div className="text-right">
                            <p className="text-muted-foreground text-xs">Score</p>
                            <p className="text-foreground font-bold text-lg">
                              {Math.round(
                                ([
                                  int.scorecard.attitude,
                                  int.scorecard.communication,
                                  int.scorecard.technical,
                                  int.scorecard.strategic,
                                  int.scorecard.leadership,
                                  int.scorecard.english,
                                ].filter(Boolean) as number[]).reduce((a, b) => a + b, 0) /
                                ([
                                  int.scorecard.attitude,
                                  int.scorecard.communication,
                                  int.scorecard.technical,
                                  int.scorecard.strategic,
                                  int.scorecard.leadership,
                                  int.scorecard.english,
                                ].filter(Boolean).length || 1) * 10
                              )}%
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
