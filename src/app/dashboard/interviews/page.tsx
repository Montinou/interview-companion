import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { interviews } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getOrgContext, AuthError } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function InterviewsPage() {
  try {
    const { orgId } = await getOrgContext();
    const user = await currentUser();
    
    if (!user) {
      redirect('/sign-in');
    }

    // Get org-scoped interviews (all interviews in the organization)
    const userInterviews = await db.query.interviews.findMany({
      where: eq(interviews.orgId, orgId),
      with: {
        candidate: true,
      },
      orderBy: (interviews, { desc }) => [desc(interviews.createdAt)],
    });

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Interviews</h1>
            <p className="text-muted-foreground mt-2">
              Manage your candidate interviews
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/interviews/new">
              + New Interview
            </Link>
          </Button>
        </div>

        {userInterviews.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold mb-2">No interviews yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first interview to get started
              </p>
              <Button asChild>
                <Link href="/dashboard/interviews/new">
                  Create Interview
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {userInterviews.map((interview) => (
              <Link
                key={interview.id}
                href={`/dashboard/live-interview?id=${interview.id}`}
              >
                <Card className="hover:bg-accent/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {interview.candidate.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {interview.candidate.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            interview.status === 'completed'
                              ? 'default'
                              : interview.status === 'live'
                              ? 'secondary'
                              : 'outline'
                          }
                          className={
                            interview.status === 'completed'
                              ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                              : interview.status === 'live'
                              ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
                              : interview.status === 'scheduled'
                              ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20'
                              : 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20'
                          }
                        >
                          {interview.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(interview.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  } catch (error) {
    if (error instanceof AuthError) {
      redirect('/sign-in');
    }
    throw error;
  }
}
