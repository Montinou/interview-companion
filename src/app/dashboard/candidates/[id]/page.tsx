import { db } from '@/lib/db';
import { candidates, interviews, scorecards } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getOrgContext, AuthError } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { CVUploader } from '@/components/cv/CVUploader';

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
      <Link href="/dashboard/candidates" className="text-zinc-400 hover:text-white text-sm mb-4 inline-block">
        ← Volver a candidatos
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">{candidate.name}</h1>
        <div className="flex items-center gap-4 mt-2">
          {candidate.email && <p className="text-zinc-400">{candidate.email}</p>}
          {candidate.phone && <p className="text-zinc-400">{candidate.phone}</p>}
          {candidate.jiraTicket && (
            <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded">
              {candidate.jiraTicket}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: CV Analysis */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Análisis de CV</h2>

          {cvAnalysis ? (
            <div className="bg-zinc-800 rounded-lg p-4 space-y-4">
              {/* Summary */}
              {cvAnalysis.summary && (
                <div>
                  <p className="text-xs text-zinc-500 font-medium mb-1">Resumen</p>
                  <p className="text-zinc-200 text-sm">{cvAnalysis.summary}</p>
                </div>
              )}

              {/* Stats */}
              <div className="flex gap-3">
                {cvAnalysis.years_experience != null && (
                  <div className="bg-zinc-700 rounded px-3 py-2 flex-1">
                    <p className="text-xs text-zinc-400">Experiencia</p>
                    <p className="text-xl font-bold text-white">{cvAnalysis.years_experience} años</p>
                  </div>
                )}
                {cvAnalysis.seniority && (
                  <div className="bg-zinc-700 rounded px-3 py-2 flex-1">
                    <p className="text-xs text-zinc-400">Seniority</p>
                    <p className="text-xl font-bold text-white capitalize">{cvAnalysis.seniority}</p>
                  </div>
                )}
              </div>

              {/* Tech Stack */}
              {cvAnalysis.tech_stack?.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 font-medium mb-2">Tech Stack</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cvAnalysis.tech_stack.map((tech: string) => (
                      <span key={tech} className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {cvAnalysis.education?.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 font-medium mb-1">Educación</p>
                  <ul className="text-sm text-zinc-300 space-y-1">
                    {cvAnalysis.education.map((edu: string, i: number) => (
                      <li key={i}>• {edu}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Flags */}
              {cvAnalysis.flags?.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 font-medium mb-2">Pre-Interview Flags</p>
                  <ul className="space-y-1.5">
                    {cvAnalysis.flags.map((flag: any, i: number) => (
                      <li key={i} className={`text-sm flex items-start gap-2 ${
                        flag.severity === 'red' ? 'text-red-400' :
                        flag.severity === 'yellow' ? 'text-yellow-400' : 'text-zinc-300'
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
                  <p className="text-xs text-zinc-500 font-medium mb-2">Preguntas Sugeridas (del CV)</p>
                  <ul className="space-y-1.5">
                    {cvAnalysis.suggested_questions.map((q: string, i: number) => (
                      <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                        <span className="text-blue-400">💬</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-zinc-800 rounded-lg p-6 text-center">
              <p className="text-zinc-400 mb-4">Sin CV analizado</p>
              {/* Client-side uploader would go here, but this is a server component.
                  The CVUploader is used from CandidateActions modal. */}
              <p className="text-zinc-500 text-sm">
                Subí un CV desde la lista de candidatos para ver el análisis aquí.
              </p>
            </div>
          )}
        </div>

        {/* Right: Interview History */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">
            Historial de Entrevistas ({interviewHistory.length})
          </h2>

          {interviewHistory.length === 0 ? (
            <div className="bg-zinc-800 rounded-lg p-6 text-center">
              <p className="text-zinc-400">Sin entrevistas aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {interviewHistory.map((int) => (
                <Link
                  key={int.id}
                  href={`/dashboard/interviews/${int.id}`}
                  className="bg-zinc-800 hover:bg-zinc-750 rounded-lg p-4 block transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${
                        int.status === 'live' ? 'bg-green-500/20 text-green-400' :
                        int.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-zinc-700 text-zinc-400'
                      }`}>
                        {int.status}
                      </span>
                      <p className="text-zinc-400 text-sm mt-1">
                        {new Date(int.createdAt).toLocaleDateString('es-AR', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {/* Scorecard mini radar */}
                    {int.scorecard && (
                      <div className="text-right">
                        <p className="text-zinc-400 text-xs">Score</p>
                        <p className="text-white font-bold text-lg">
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
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
