import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, Mic, Sparkles, TrendingUp, ArrowRight, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/db';
import { interviews, aiInsights } from '@/lib/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { getOrgContext, AuthError } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default async function DashboardPage() {
  try {
    const { orgId } = await getOrgContext();
    const user = await currentUser();
    
    if (!user) {
      redirect('/sign-in');
    }

    // Fetch org-scoped stats
    const [interviewStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(interviews)
      .where(eq(interviews.orgId, orgId));
    const totalInterviews = Number(interviewStats.count);

    const [todayStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(interviews)
      .where(and(eq(interviews.orgId, orgId), eq(interviews.status, 'completed')));
    const completedToday = Number(todayStats.count);

    // AI insights count (org-scoped via join)
    const [insightStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiInsights)
      .where(eq(aiInsights.orgId, orgId));
    const totalInsights = Number(insightStats.count);

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
    <div className="bg-background">
      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
        {/* Hero Section */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Badge className="gap-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Interview Companion v0.2
          </Badge>
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Welcome back, {user.firstName}! 👋
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Your AI-powered interview companion. Get real-time insights, suggestions, and candidate evaluations.
          </p>
        </div>

        <Separator />

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.title}
                href={feature.href}
                style={{ animationDelay: `${index * 100}ms` }}
                className={`group transition-all hover:scale-105 animate-in fade-in slide-in-from-bottom-8 duration-500 ${
                  feature.status === 'active' ? 'cursor-pointer' : 'cursor-default opacity-60'
                }`}
              >
                <Card className={`relative overflow-hidden backdrop-blur-sm bg-gradient-to-br ${feature.gradient} ${feature.border}`}>
                  <CardHeader>
                    <div className={`rounded-lg p-3 bg-${feature.color}-500/10 w-fit`}>
                      <Icon className={`h-6 w-6 text-${feature.color}-600`} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{feature.title}</h3>
                        {feature.badge && (
                          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                            {feature.badge}
                          </Badge>
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
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <Separator />

        {/* Development Progress */}
        <Card className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/5 p-2.5">
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Development Progress</h2>
                <p className="text-sm text-muted-foreground">Building Interview Companion</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {progress.map((stage, index) => (
                <div
                  key={stage.label}
                  style={{ animationDelay: `${(index + 4) * 50}ms` }}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                >
                  <Badge
                    variant={stage.status === 'complete' ? 'default' : stage.status === 'current' ? 'secondary' : 'outline'}
                    className={`w-full justify-start gap-2 py-3 px-3 ${
                      stage.status === 'complete'
                        ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                        : stage.status === 'current'
                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
                        : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex flex-col items-start gap-1 w-full">
                      <div className="flex items-center gap-2">
                        {stage.status === 'complete' && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {stage.status === 'current' && (
                          <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        )}
                        <span className="text-xs font-medium">Etapa {index}</span>
                      </div>
                      <span className="text-xs font-semibold leading-tight">{stage.label}</span>
                    </div>
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-400 mb-1">{totalInterviews}</div>
              <div className="text-sm text-muted-foreground">Total Interviews</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-600">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-400 mb-1">{completedToday}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-700">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-purple-400 mb-1">{totalInsights}</div>
              <div className="text-sm text-muted-foreground">AI Insights Generated</div>
            </CardContent>
          </Card>
        </div>
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
