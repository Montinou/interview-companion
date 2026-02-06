import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DashboardPage() {
  const user = await currentUser();
  
  if (!user) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">
              Welcome back, {user.firstName}! 👋
            </h1>
            <p className="text-muted-foreground mt-2">
              Your interview companion dashboard
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          <Link
            href="/dashboard/interviews"
            className="p-6 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="text-4xl mb-4">📋</div>
            <h3 className="font-semibold text-lg mb-2">Interviews</h3>
            <p className="text-sm text-muted-foreground">
              Manage and view all interviews
            </p>
          </Link>

          <div className="p-6 rounded-xl border bg-card opacity-50">
            <div className="text-4xl mb-4">🎤</div>
            <h3 className="font-semibold text-lg mb-2">Live Transcription</h3>
            <p className="text-sm text-muted-foreground">
              Real-time transcription with Deepgram
            </p>
            <div className="mt-4">
              <span className="text-xs px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 font-medium">
                Etapa 4
              </span>
            </div>
          </div>

          <div className="p-6 rounded-xl border bg-card opacity-50">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="font-semibold text-lg mb-2">AI Insights</h3>
            <p className="text-sm text-muted-foreground">
              Smart suggestions powered by OpenAI
            </p>
            <div className="mt-4">
              <span className="text-xs px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 font-medium">
                Etapa 5
              </span>
            </div>
          </div>

          <div className="p-6 rounded-xl border bg-card opacity-50">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="font-semibold text-lg mb-2">Scorecard</h3>
            <p className="text-sm text-muted-foreground">
              Track candidate performance
            </p>
            <div className="mt-4">
              <span className="text-xs px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 font-medium">
                Etapa 6
              </span>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Development Progress</h2>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-500 text-sm font-mono font-semibold">
              ✅ Etapa 0: Foundations
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-500 text-sm font-mono font-semibold">
              ✅ Etapa 1: Authentication
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-500 text-sm font-mono font-semibold">
              ✅ Etapa 2: Database
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-500 text-sm font-mono font-semibold">
              ✅ Etapa 3: CRUD
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-500 text-sm font-mono font-semibold">
              🔄 Etapa 4: Real-time (next)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
