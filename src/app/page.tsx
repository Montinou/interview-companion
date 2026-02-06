import { currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';

export default async function Home() {
  const user = await currentUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col gap-8">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Interview Companion
        </h1>
        <p className="text-2xl text-muted-foreground text-center">
          Real-time AI Assistant for Technical Interviews
        </p>
        
        <div className="flex gap-4 mt-4">
          {user ? (
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Go to Dashboard →
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="px-6 py-3 rounded-lg border border-primary text-primary font-semibold hover:bg-primary/10 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 w-full">
          <div className="p-6 rounded-xl border bg-card">
            <div className="text-4xl mb-4">🎤</div>
            <h3 className="font-semibold text-lg mb-2">Live Transcription</h3>
            <p className="text-sm text-muted-foreground">
              Real-time transcription with Deepgram
            </p>
          </div>
          <div className="p-6 rounded-xl border bg-card">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="font-semibold text-lg mb-2">AI Insights</h3>
            <p className="text-sm text-muted-foreground">
              Smart suggestions during interviews
            </p>
          </div>
          <div className="p-6 rounded-xl border bg-card">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="font-semibold text-lg mb-2">Live Scorecard</h3>
            <p className="text-sm text-muted-foreground">
              Track candidate performance in real-time
            </p>
          </div>
        </div>
        
        <div className="mt-12 flex gap-2">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-500 text-sm font-mono">
            ✅ Etapa 0: Foundations
          </span>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-500 text-sm font-mono">
            ✅ Etapa 1: Authentication
          </span>
        </div>
      </div>
    </main>
  );
}
