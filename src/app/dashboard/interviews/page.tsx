import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { interviews, candidates, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export default async function InterviewsPage() {
  const user = await currentUser();
  
  if (!user) {
    redirect('/sign-in');
  }

  // Get or create user in DB
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id),
  });

  let userInterviews: any[] = [];
  
  if (dbUser) {
    userInterviews = await db.query.interviews.findMany({
      where: eq(interviews.interviewerId, dbUser.id),
      with: {
        candidate: true,
      },
      orderBy: (interviews, { desc }) => [desc(interviews.createdAt)],
    });
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Interviews</h1>
            <p className="text-muted-foreground mt-2">
              Manage your candidate interviews
            </p>
          </div>
          <Link
            href="/dashboard/interviews/new"
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            + New Interview
          </Link>
        </div>

        {userInterviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold mb-2">No interviews yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first interview to get started
            </p>
            <Link
              href="/dashboard/interviews/new"
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Create Interview
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {userInterviews.map((interview) => (
              <Link
                key={interview.id}
                href={`/dashboard/live-interview?id=${interview.id}`}
                className="p-6 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
              >
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
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        interview.status === 'completed'
                          ? 'bg-green-500/10 text-green-500'
                          : interview.status === 'live'
                          ? 'bg-blue-500/10 text-blue-500'
                          : interview.status === 'scheduled'
                          ? 'bg-yellow-500/10 text-yellow-500'
                          : 'bg-gray-500/10 text-gray-500'
                      }`}
                    >
                      {interview.status}
                    </span>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(interview.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
