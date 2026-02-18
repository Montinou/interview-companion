import { redirect } from 'next/navigation';
import { createInterview } from '@/app/actions/interviews';
import Link from 'next/link';
import { getOrgContext, AuthError } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

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
    <div className="p-8">
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
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Candidate Information</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="candidateName">
                  Full Name *
                </Label>
                <Input
                  type="text"
                  id="candidateName"
                  name="candidateName"
                  required
                  placeholder="John Doe"
                />
              </div>

              <div>
                <Label htmlFor="candidateEmail">
                  Email *
                </Label>
                <Input
                  type="email"
                  id="candidateEmail"
                  name="candidateEmail"
                  required
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <Label htmlFor="candidatePhone">
                  Phone
                </Label>
                <Input
                  type="tel"
                  id="candidatePhone"
                  name="candidatePhone"
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div>
                <Label htmlFor="jiraTicket">
                  Jira Ticket (optional)
                </Label>
                <Input
                  type="text"
                  id="jiraTicket"
                  name="jiraTicket"
                  placeholder="TI-7213"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button variant="outline" asChild className="flex-1">
              <Link href="/dashboard/interviews">
                Cancel
              </Link>
            </Button>
            <Button type="submit" className="flex-1">
              Create Interview
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
