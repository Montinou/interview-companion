import { redirect } from 'next/navigation';
import { createInterview } from '@/app/actions/interviews';
import Link from 'next/link';
import { getOrgContext, AuthError } from '@/lib/auth';

export default async function NewInterviewPage() {
  try {
    await getOrgContext();
  } catch (error) {
    if (error instanceof AuthError) {
      redirect('/sign-in');
    }
    throw error;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard/interviews"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Interviews
          </Link>
          <h1 className="text-4xl font-bold mt-4">New Interview</h1>
          <p className="text-muted-foreground mt-2">
            Create a new interview session
          </p>
        </div>

        <form action={createInterview} className="space-y-6">
          <div className="p-6 rounded-xl border bg-card">
            <h2 className="text-xl font-semibold mb-4">Candidate Information</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="candidateName" className="block text-sm font-medium mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="candidateName"
                  name="candidateName"
                  required
                  className="w-full px-4 py-2 rounded-lg border bg-background"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="candidateEmail" className="block text-sm font-medium mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  id="candidateEmail"
                  name="candidateEmail"
                  required
                  className="w-full px-4 py-2 rounded-lg border bg-background"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label htmlFor="candidatePhone" className="block text-sm font-medium mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  id="candidatePhone"
                  name="candidatePhone"
                  className="w-full px-4 py-2 rounded-lg border bg-background"
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div>
                <label htmlFor="jiraTicket" className="block text-sm font-medium mb-2">
                  Jira Ticket (optional)
                </label>
                <input
                  type="text"
                  id="jiraTicket"
                  name="jiraTicket"
                  className="w-full px-4 py-2 rounded-lg border bg-background"
                  placeholder="TI-7213"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Link
              href="/dashboard/interviews"
              className="flex-1 px-6 py-3 rounded-lg border text-center font-semibold hover:bg-accent transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Create Interview
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
