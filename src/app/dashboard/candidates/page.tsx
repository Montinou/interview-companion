import { db } from '@/lib/db';
import { candidates, interviews } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { getOrgContext, AuthError } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CandidateActions } from './CandidateActions';

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
          <h1 className="text-2xl font-bold text-white">Candidatos</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {allCandidates.length} candidato{allCandidates.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <CandidateActions />
      </div>

      {allCandidates.length === 0 ? (
        <div className="bg-zinc-800 rounded-lg p-12 text-center">
          <p className="text-zinc-400 text-lg mb-2">No hay candidatos aún</p>
          <p className="text-zinc-500 text-sm">
            Los candidatos se crean automáticamente al iniciar una entrevista,
            o podés subir un CV para crear uno nuevo.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {allCandidates.map((c) => {
            const cvAnalysis = c.cvData as any;
            return (
              <Link
                key={c.id}
                href={`/dashboard/candidates/${c.id}`}
                className="bg-zinc-800 hover:bg-zinc-750 rounded-lg p-4 transition-colors block"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-white font-medium text-lg">{c.name}</h3>
                      {cvAnalysis?.seniority && (
                        <span className="bg-zinc-700 text-zinc-300 text-xs px-2 py-0.5 rounded capitalize">
                          {cvAnalysis.seniority}
                        </span>
                      )}
                      {c.cvUrl && (
                        <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded">
                          CV ✓
                        </span>
                      )}
                    </div>
                    {c.email && (
                      <p className="text-zinc-400 text-sm mt-1">{c.email}</p>
                    )}

                    {/* Tech stack from CV analysis */}
                    {cvAnalysis?.tech_stack?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {cvAnalysis.tech_stack.slice(0, 8).map((tech: string) => (
                          <span key={tech} className="bg-blue-500/15 text-blue-300 text-xs px-1.5 py-0.5 rounded">
                            {tech}
                          </span>
                        ))}
                        {cvAnalysis.tech_stack.length > 8 && (
                          <span className="text-zinc-500 text-xs">
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
                    <p className="text-zinc-400">
                      {Number(c.interviewCount)} entrevista{Number(c.interviewCount) !== 1 ? 's' : ''}
                    </p>
                    {c.lastInterviewDate && (
                      <p className="text-zinc-500 text-xs mt-1">
                        Última: {new Date(c.lastInterviewDate).toLocaleDateString('es-AR')}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
