import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, Mic, Sparkles, TrendingUp, ArrowRight, CheckCircle2 } from 'lucide-react';

export default async function DashboardPage() {
  const user = await currentUser();
  
  if (!user) {
    redirect('/sign-in');
  }

  const features = [
    {
      icon: ClipboardList,
      title: 'Interviews',
      description: 'Manage and view all your candidate interviews',
      href: '/dashboard/interviews',
      color: 'blue',
      status: 'active',
      gradient: 'from-blue-500/10 to-blue-600/5',
      border: 'border-blue-500/20',
    },
    {
      icon: Mic,
      title: 'Live Transcription',
      description: 'Real-time transcription with Deepgram',
      href: '#',
      color: 'purple',
      status: 'coming',
      badge: 'Etapa 4',
      gradient: 'from-purple-500/10 to-purple-600/5',
      border: 'border-purple-500/20',
    },
    {
      icon: Sparkles,
      title: 'AI Insights',
      description: 'Smart suggestions powered by OpenClaw',
      href: '#',
      color: 'amber',
      status: 'active',
      gradient: 'from-amber-500/10 to-amber-600/5',
      border: 'border-amber-500/20',
    },
    {
      icon: TrendingUp,
      title: 'Scorecard',
      description: 'Track candidate performance',
      href: '#',
      color: 'green',
      status: 'coming',
      badge: 'Etapa 5',
      gradient: 'from-green-500/10 to-green-600/5',
      border: 'border-green-500/20',
    },
  ];

  const progress = [
    { label: 'Foundations', status: 'complete' },
    { label: 'Authentication', status: 'complete' },
    { label: 'Database', status: 'complete' },
    { label: 'CRUD', status: 'complete' },
    { label: 'Real-time', status: 'complete' },
    { label: 'UI Upgrade', status: 'current' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
        {/* Hero Section */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Interview Companion v0.2
          </div>
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Welcome back, {user.firstName}! 👋
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Your AI-powered interview companion. Get real-time insights, suggestions, and candidate evaluations.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.title}
                href={feature.href}
                style={{ animationDelay: `${index * 100}ms` }}
                className={`group relative overflow-hidden rounded-xl border backdrop-blur-sm transition-all hover:scale-105 animate-in fade-in slide-in-from-bottom-8 duration-500 ${
                  feature.status === 'active' ? 'cursor-pointer' : 'cursor-default opacity-60'
                } bg-gradient-to-br ${feature.gradient} ${feature.border}`}
              >
                <div className="p-6 space-y-3">
                  <div className={`rounded-lg p-3 bg-${feature.color}-500/10 w-fit`}>
                    <Icon className={`h-6 w-6 text-${feature.color}-600`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{feature.title}</h3>
                      {feature.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-700 text-xs font-medium">
                          {feature.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                  {feature.status === 'active' && (
                    <div className="flex items-center gap-1 text-sm text-primary font-medium pt-2">
                      Go to {feature.title}
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Development Progress */}
        <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-6 space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <div className="flex items-center gap-3 pb-4 border-b">
            <div className="rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/5 p-2.5">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Development Progress</h2>
              <p className="text-sm text-muted-foreground">Building Interview Companion</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {progress.map((stage, index) => (
              <div
                key={stage.label}
                style={{ animationDelay: `${(index + 4) * 50}ms` }}
                className={`p-3 rounded-lg border animate-in fade-in slide-in-from-bottom-4 duration-500 ${
                  stage.status === 'complete'
                    ? 'bg-green-500/10 border-green-500/20 text-green-700'
                    : stage.status === 'current'
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-700'
                    : 'bg-gray-500/10 border-gray-500/20 text-gray-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {stage.status === 'complete' && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {stage.status === 'current' && (
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  )}
                  <span className="text-xs font-medium">Etapa {index}</span>
                </div>
                <p className="text-xs font-semibold leading-tight">{stage.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 p-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
            <div className="text-3xl font-bold text-blue-600 mb-1">0</div>
            <div className="text-sm text-muted-foreground">Total Interviews</div>
          </div>
          <div className="rounded-xl border bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 p-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-600">
            <div className="text-3xl font-bold text-green-600 mb-1">0</div>
            <div className="text-sm text-muted-foreground">Completed Today</div>
          </div>
          <div className="rounded-xl border bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 p-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-700">
            <div className="text-3xl font-bold text-purple-600 mb-1">0</div>
            <div className="text-sm text-muted-foreground">AI Insights Generated</div>
          </div>
        </div>
      </div>
    </div>
  );
}
