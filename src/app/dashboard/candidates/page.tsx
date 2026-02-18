import { db } from '@/lib/db';
import { candidates, interviews } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { getOrgContext, AuthError } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CandidateActions } from './CandidateActions';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function CandidatesPage() {
  let orgId: string;
  try {
    const ctx = await getOrgContext();
    orgId = ctx.orgId;
  } catch (e) {
    if (e instanceof AuthError) redirect('/sign-in');
    throw e;
  }

  const allCandidates = await db
    .select({
      id: candidates.id,
      name: candidates.name,
      email: candidates.email,
      cvUrl: candidates.cvUrl,
      cvData: candidates.cvData,
      createdAt: candidates.createdAt,
      interviewCount: sql<number>`(
        SELECT count(*) FROM interviews WHERE interviews.candidate_id = ${candidates.id}
      )`.as('interview_count'),
      lastInterviewDate: sql<string>`(
        SELECT MAX(interviews.created_at) FROM interviews WHERE interviews.candidate_id = ${candidates.id}
      )`.as('last_interview_date'),
    })
    .from(candidates)
    .where(eq(candidates.orgId, orgId))
    .orderBy(desc(candidates.createdAt));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Candidatos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {allCandidates.length} candidato{allCandidates.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <CandidateActions />
      </div>

      {allCandidates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground text-lg mb-2">No hay candidatos aún</p>
            <p className="text-muted-foreground/70 text-sm">
              Los candidatos se crean automáticamente al iniciar una entrevista,
              o podés subir un CV para crear uno nuevo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {allCandidates.map((c) => {
            const cvAnalysis = c.cvData as any;
            return (
              <Link
                key={c.id}
                href={`/dashboard/candidates/${c.id}`}
              >
                <Card className="hover:bg-accent/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-foreground font-medium text-lg">{c.name}</h3>
                          {cvAnalysis?.seniority && (
                            <Badge variant="secondary" className="capitalize">
                              {cvAnalysis.seniority}
                            </Badge>
                          )}
                          {c.cvUrl && (
                            <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30">
                              CV ✓
                            </Badge>
                          )}
                        </div>
                        {c.email && (
                          <p className="text-muted-foreground text-sm mt-1">{c.email}</p>
                        )}

                        {/* Tech stack from CV analysis */}
                        {cvAnalysis?.tech_stack?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {cvAnalysis.tech_stack.slice(0, 8).map((tech: string) => (
                              <Badge key={tech} variant="outline" className="bg-blue-500/15 text-blue-400 border-blue-500/30">
                                {tech}
                              </Badge>
                            ))}
                            {cvAnalysis.tech_stack.length > 8 && (
                              <span className="text-muted-foreground text-xs">
                                +{cvAnalysis.tech_stack.length - 8} más
                              </span>
                            )}
                          </div>
                        )}

                        {/* Pre-flags */}
                        {cvAnalysis?.flags?.filter((f: any) => f.severity === 'red').length > 0 && (
                          <p className="text-red-400 text-xs mt-2">
                            🔴 {cvAnalysis.flags.filter((f: any) => f.severity === 'red').length} red flag{cvAnalysis.flags.filter((f: any) => f.severity === 'red').length > 1 ? 's' : ''} detectado{cvAnalysis.flags.filter((f: any) => f.severity === 'red').length > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>

                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">
                          {Number(c.interviewCount)} entrevista{Number(c.interviewCount) !== 1 ? 's' : ''}
                        </p>
                        {c.lastInterviewDate && (
                          <p className="text-muted-foreground/70 text-xs mt-1">
                            Última: {new Date(c.lastInterviewDate).toLocaleDateString('es-AR')}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
