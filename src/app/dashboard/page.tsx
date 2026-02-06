import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="p-6 rounded-xl border bg-card">
            <div className="text-4xl mb-4">🎤</div>
            <h3 className="font-semibold text-lg mb-2">Live Transcription</h3>
            <p className="text-sm text-muted-foreground">
              Real-time interview transcription with Deepgram
            </p>
            <div className="mt-4">
              <span className="text-xs px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 font-medium">
                Coming in Etapa 4
              </span>
            </div>
          </div>

          <div className="p-6 rounded-xl border bg-card">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="font-semibold text-lg mb-2">AI Insights</h3>
            <p className="text-sm text-muted-foreground">
              Smart suggestions powered by OpenAI
            </p>
            <div className="mt-4">
              <span className="text-xs px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 font-medium">
                Coming in Etapa 5
              </span>
            </div>
          </div>

          <div className="p-6 rounded-xl border bg-card">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="font-semibold text-lg mb-2">Scorecard</h3>
            <p className="text-sm text-muted-foreground">
              Track candidate performance in real-time
            </p>
            <div className="mt-4">
              <span className="text-xs px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 font-medium">
                Coming in Etapa 6
              </span>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-500 text-sm font-mono">
              ✅ Etapa 0: Foundations
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-500 text-sm font-mono">
              ✅ Etapa 1: Authentication
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-500 text-sm font-mono">
              🔄 Etapa 2: Database (in progress)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
