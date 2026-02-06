import { currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { ArrowRight, Mic, Sparkles, TrendingUp, Zap, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui-button';

export default async function Home() {
  const user = await currentUser();

  const features = [
    {
      icon: Mic,
      title: 'Real-time Transcription',
      description: 'Powered by Deepgram with sub-second latency for instant feedback during interviews.',
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Insights',
      description: 'Get smart suggestions and red flag detection powered by Claude through OpenClaw.',
    },
    {
      icon: TrendingUp,
      title: 'Live Scorecard',
      description: 'Track candidate performance in real-time across multiple competencies.',
    },
    {
      icon: Zap,
      title: 'Instant Suggestions',
      description: 'Receive follow-up questions and talking points based on candidate responses.',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your interview data is encrypted and stored securely in NeonDB.',
    },
    {
      icon: Clock,
      title: 'Time Management',
      description: 'Keep track of interview duration and stay on schedule with smart alerts.',
    },
  ];

  const stats = [
    { value: '<300ms', label: 'Latency' },
    { value: '87%', label: 'Token Savings' },
    { value: '100%', label: 'Type-Safe' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              Interview Companion v0.2
            </div>

            {/* Heading */}
            <h1 className="text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                Interview
              </span>
              <br />
              <span className="bg-gradient-to-br from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                Companion
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Real-time AI assistant for technical interviews.
              Get instant insights, suggestions, and candidate evaluations
              powered by OpenClaw and Claude.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              {user ? (
                <Link href="/dashboard">
                  <Button size="lg" className="text-base group">
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/sign-up">
                    <Button size="lg" className="text-base group">
                      Get Started
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link href="/sign-in">
                    <Button size="lg" variant="outline" className="text-base">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-8 justify-center pt-12">
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  style={{ animationDelay: `${(index + 2) * 100}ms` }}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-700"
                >
                  <div className="text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="text-center space-y-4 mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <h2 className="text-4xl font-bold tracking-tight">Everything you need</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features to help you conduct better interviews and make better hiring decisions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                style={{ animationDelay: `${(index + 4) * 100}ms` }}
                className="group relative overflow-hidden rounded-xl border bg-card/50 backdrop-blur-sm p-6 hover:scale-105 transition-all duration-300 animate-in fade-in slide-in-from-bottom-8 duration-700"
              >
                <div className="space-y-4">
                  <div className="rounded-lg bg-primary/10 p-3 w-fit group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-12 text-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-700">
          <div className="relative space-y-6">
            <h2 className="text-4xl font-bold tracking-tight">Ready to get started?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join the future of technical interviews. Sign up now and start conducting better interviews today.
            </p>
            {!user && (
              <div className="pt-4">
                <Link href="/sign-up">
                  <Button size="lg" className="text-base group">
                    Create your account
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <div>© 2026 Interview Companion. Built with Next.js 16 & OpenClaw.</div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-foreground transition-colors">Documentation</a>
              <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
