import { currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import {
  ArrowRight,
  Mic,
  Sparkles,
  TrendingUp,
  Zap,
  Shield,
  Monitor,
  Eye,
  EyeOff,
  Download,
  Apple,
  Globe,
  ChevronRight,
  CheckCircle2,
  BarChart3,
  MessageSquare,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui-button';

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.851" />
    </svg>
  );
}

export default async function Home() {
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Mic className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">Interview Companion</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button size="sm">Dashboard <ArrowRight className="h-3.5 w-3.5" /></Button>
              </Link>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost" size="sm">Sign in</Button>
                </Link>
                <Link href="/sign-up">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/3 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium tracking-wide uppercase">
              <EyeOff className="h-3 w-3" />
              100% invisible to candidates
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
              Your AI copilot for{' '}
              <span className="bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent">
                technical interviews
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Real-time transcription, AI-powered insights, and instant follow-up suggestions.
              Run better interviews with a desktop app that works with any video call platform.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link href="#download">
                <Button size="lg" className="text-base px-8 group">
                  <Download className="h-4 w-4" />
                  Download for Free
                </Button>
              </Link>
              <Link href={user ? '/dashboard' : '/sign-up'}>
                <Button size="lg" variant="outline" className="text-base px-8 group">
                  Try the Web Dashboard
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
            </div>

            {/* Social proof line */}
            <p className="text-sm text-muted-foreground/70 pt-2">
              Free to use · No credit card required · Works with Meet, Zoom, Teams & more
            </p>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-16 relative">
            <div className="relative rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden shadow-2xl shadow-primary/5">
              {/* Fake browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-card/80">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 text-center text-xs text-muted-foreground/50">interview-companion.triqual.dev/dashboard</div>
              </div>
              {/* Dashboard mockup content */}
              <div className="p-6 grid grid-cols-4 gap-4 min-h-[320px]">
                {/* Column 1: Radar + Stats */}
                <div className="space-y-3">
                  <div className="rounded-lg bg-muted/30 border border-border/30 p-4 h-40 flex items-center justify-center">
                    <BarChart3 className="h-16 w-16 text-primary/30" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-muted/20 border border-border/20 p-3 text-center">
                      <div className="text-lg font-bold text-primary">7.5</div>
                      <div className="text-[10px] text-muted-foreground">Score</div>
                    </div>
                    <div className="rounded-lg bg-muted/20 border border-border/20 p-3 text-center">
                      <div className="text-lg font-bold text-green-400">23</div>
                      <div className="text-[10px] text-muted-foreground">Minutes</div>
                    </div>
                  </div>
                </div>
                {/* Column 2: Transcript */}
                <div className="rounded-lg bg-muted/20 border border-border/30 p-4 space-y-3">
                  <div className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Live Transcript</div>
                  {['Can you describe your experience with Playwright?', 'I\'ve been using it for about 2 years...', 'How do you handle flaky tests?'].map((t, i) => (
                    <div key={i} className={`text-xs leading-relaxed ${i % 2 === 0 ? 'text-primary/70' : 'text-muted-foreground/60'}`}>
                      <span className="font-medium">{i % 2 === 0 ? 'You' : 'Candidate'}:</span> {t}
                    </div>
                  ))}
                </div>
                {/* Column 3: Suggestions */}
                <div className="rounded-lg bg-muted/20 border border-border/30 p-4 space-y-3">
                  <div className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Suggestions</div>
                  {[
                    { icon: MessageSquare, text: 'Ask about CI/CD integration patterns', color: 'text-blue-400' },
                    { icon: AlertTriangle, text: 'Vague on error handling — dig deeper', color: 'text-yellow-400' },
                    { icon: CheckCircle2, text: 'Strong on test design fundamentals', color: 'text-green-400' },
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <s.icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${s.color}`} />
                      <span className="text-xs text-muted-foreground/70">{s.text}</span>
                    </div>
                  ))}
                </div>
                {/* Column 4: Insights */}
                <div className="rounded-lg bg-muted/20 border border-border/30 p-4 space-y-3">
                  <div className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">AI Insights</div>
                  <div className="space-y-2">
                    {[
                      { flag: '🟢', text: 'Demonstrates practical Playwright experience with concrete examples' },
                      { flag: '🟡', text: 'Mentions "best practices" without specifics — follow up' },
                      { flag: '🔴', text: 'Claims 5 years automation but unfamiliar with page object pattern' },
                    ].map((insight, i) => (
                      <div key={i} className="text-xs text-muted-foreground/60 leading-relaxed">
                        <span>{insight.flag}</span> {insight.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Glow effect under the mockup */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-primary/10 blur-3xl rounded-full" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 border-t border-border/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">How it works</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Three steps. Zero disruption to your interview flow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: Download,
                title: 'Download & Sign In',
                description: 'Install the lightweight desktop app (11MB). Sign in with your account. That\'s the entire setup.',
              },
              {
                step: '02',
                icon: Mic,
                title: 'Start Your Interview',
                description: 'Open any video call platform. Click record in Interview Companion. Audio is captured natively — nothing to configure.',
              },
              {
                step: '03',
                icon: Sparkles,
                title: 'Get Real-Time Insights',
                description: 'Watch the dashboard light up with live transcription, AI suggestions, red flags, and a running scorecard.',
              },
            ].map((item) => (
              <div key={item.step} className="relative group">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-5xl font-bold text-primary/15 group-hover:text-primary/25 transition-colors">{item.step}</span>
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 border-t border-border/30 bg-muted/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Built for interviewers who care</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Every feature designed to help you evaluate candidates fairly and thoroughly.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Mic,
                title: 'Live Transcription',
                description: 'Sub-second speech-to-text powered by Deepgram. See every word as it\'s spoken, with speaker identification.',
              },
              {
                icon: Sparkles,
                title: 'AI Analysis',
                description: 'Each answer is analyzed in real-time. Get follow-up suggestions, detect vague responses, spot contradictions.',
              },
              {
                icon: TrendingUp,
                title: 'Live Scorecard',
                description: 'Competency radar updates as the interview progresses. See strengths and gaps at a glance.',
              },
              {
                icon: EyeOff,
                title: 'Invisible to Candidates',
                description: 'Runs as a desktop app on your machine. No bots join the call. No indication the system exists.',
              },
              {
                icon: Shield,
                title: 'Secure by Design',
                description: 'API keys never leave our servers. Audio is processed in real-time and not stored. End-to-end encrypted.',
              },
              {
                icon: Zap,
                title: 'Provider Failover',
                description: 'If one transcription service goes down, we automatically switch to the next. Zero interruption.',
              },
              {
                icon: Globe,
                title: 'Multi-Language',
                description: 'Conduct interviews in English, Spanish, or mixed. The AI adapts to the conversation language.',
              },
              {
                icon: Monitor,
                title: 'Works Everywhere',
                description: 'Google Meet, Zoom, Teams, Slack huddles — any platform that uses your microphone.',
              },
              {
                icon: Users,
                title: 'Fair Evaluation',
                description: 'Evidence-based scoring only. Every flag comes with a direct quote from the transcript. No bias, no guessing.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-border/30 bg-card/30 p-5 hover:border-primary/20 hover:bg-card/50 transition-all duration-300"
              >
                <div className="space-y-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <feature.icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="py-24 border-t border-border/30">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Download Interview Companion</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Lightweight desktop app. No bloat. Just what you need.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* macOS */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-6 space-y-4 hover:border-primary/30 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Apple className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-semibold text-lg">macOS</div>
                  <div className="text-xs text-muted-foreground">Apple Silicon & Intel</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  <span>Universal binary (ARM + x86)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  <span>~11MB app size</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  <span>macOS 12+ required</span>
                </div>
              </div>
              <a
                href="https://github.com/Montinou/interview-companion/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full group/btn">
                  <Download className="h-4 w-4" />
                  Download .dmg
                  <ChevronRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                </Button>
              </a>
            </div>

            {/* Windows */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-6 space-y-4 hover:border-primary/30 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <WindowsIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-lg">Windows</div>
                  <div className="text-xs text-muted-foreground">64-bit</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  <span>MSI installer</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  <span>~15MB installed</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  <span>Windows 10+ required</span>
                </div>
              </div>
              <a
                href="https://github.com/Montinou/interview-companion/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full group/btn">
                  <Download className="h-4 w-4" />
                  Download .msi
                  <ChevronRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                </Button>
              </a>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground/60 mt-6">
            Or use the{' '}
            <Link href={user ? '/dashboard' : '/sign-up'} className="text-primary hover:underline">
              web dashboard
            </Link>
            {' '}directly in your browser — no installation needed.
          </p>
        </div>
      </section>

      {/* GEO: What Is + Stats Section */}
      <section className="py-20 border-t border-border/30">
        <div className="max-w-4xl mx-auto px-6 space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              What is Interview Companion?
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Interview Companion is a free, AI-powered desktop application that acts as a real-time copilot during technical interviews. It provides live speech-to-text transcription, instant AI analysis of candidate responses, automated red flag and green flag detection, follow-up question suggestions, and a running competency scorecard — all completely invisible to the candidate being interviewed.
            </p>
          </div>

          {/* Stats grid — GEO: statistics increase AI citation by 30-40% */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { stat: '< 1s', label: 'Transcription latency', detail: 'Sub-second speech-to-text' },
              { stat: '11 MB', label: 'App size', detail: 'Lightweight desktop binary' },
              { stat: '3+', label: 'STT providers', detail: 'Automatic failover chain' },
              { stat: '100%', label: 'Invisible', detail: 'No bots join the call' },
            ].map((item) => (
              <div key={item.label} className="bg-card/50 border border-border/30 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-primary">{item.stat}</p>
                <p className="text-sm font-medium text-foreground mt-1">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
              </div>
            ))}
          </div>

          {/* Comparison — GEO: clear positioning helps AI engines categorize */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">How Interview Companion compares to alternatives</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border/30 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-muted/20">
                    <th className="text-left p-3 font-medium text-muted-foreground">Feature</th>
                    <th className="text-center p-3 font-medium text-primary">Interview Companion</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Manual Notes</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Recording + Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {[
                    ['Real-time transcription', '✅', '❌', '❌'],
                    ['Live AI analysis', '✅', '❌', '❌'],
                    ['Invisible to candidate', '✅', '✅', '⚠️ Needs consent'],
                    ['Follow-up suggestions', '✅', '❌', '❌'],
                    ['Automated scorecard', '✅', '❌', '⚠️ Manual effort'],
                    ['Works with any platform', '✅', '✅', '✅'],
                    ['No additional cost', '✅ Free', '✅ Free', '⚠️ Storage costs'],
                  ].map(([feature, ic, manual, recording]) => (
                    <tr key={feature} className="hover:bg-muted/10">
                      <td className="p-3 text-foreground">{feature}</td>
                      <td className="p-3 text-center">{ic}</td>
                      <td className="p-3 text-center">{manual}</td>
                      <td className="p-3 text-center">{recording}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Use cases — GEO: structured lists with clear hierarchy */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Who uses Interview Companion?</h3>
            <ul className="space-y-3">
              {[
                { role: 'Technical Interviewers', desc: 'Get real-time analysis of coding and system design responses. Spot inconsistencies between what candidates claim and what they demonstrate.' },
                { role: 'QA Engineering Teams', desc: 'Evaluate automation skills, testing strategies, and debugging approaches with AI-powered follow-up suggestions.' },
                { role: 'Engineering Managers', desc: 'Run more structured, evidence-based interviews. Compare candidates fairly using automated scorecards with direct transcript quotes.' },
                { role: 'HR & Recruiting Teams', desc: 'Ensure interview consistency across your organization. Every interview produces a standardized scorecard regardless of who conducts it.' },
              ].map((item) => (
                <li key={item.role} className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-foreground">{item.role}</span>
                    <span className="text-muted-foreground"> — {item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* GEO: FAQ Section with structured data */}
      <section className="py-20 border-t border-border/30">
        <div className="max-w-3xl mx-auto px-6 space-y-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'Is Interview Companion free?',
                a: 'Yes, Interview Companion is completely free to use. The desktop app, real-time transcription, AI analysis, and scorecard generation are all included at no cost. We use a multi-provider failover system with free-tier credits from Deepgram, AssemblyAI, and Rev.ai.',
              },
              {
                q: 'Can the candidate see or detect Interview Companion?',
                a: 'No. Interview Companion runs as a native desktop application on your machine. It captures audio from your microphone — no bots join the video call, no browser extensions are visible, and there is no indication to the candidate that the system exists. It is 100% invisible.',
              },
              {
                q: 'What video call platforms does it work with?',
                a: 'Interview Companion works with any platform that uses your microphone: Google Meet, Zoom, Microsoft Teams, Slack Huddles, Discord, and any other video or audio call application. Since it captures audio at the system level, no platform-specific integration is needed.',
              },
              {
                q: 'What languages does Interview Companion support?',
                a: 'Currently, Interview Companion supports English, Spanish, and mixed-language interviews. The AI adapts to the language being spoken in real-time, and the transcription engine automatically detects and handles code-switching between languages.',
              },
              {
                q: 'How does the AI analysis work?',
                a: 'As the interview progresses, transcript chunks are sent to our AI engine every 15-20 seconds. The AI analyzes each response for technical accuracy, depth, red flags (evasiveness, contradictions, vagueness), and green flags (concrete examples, learning mindset). It generates follow-up question suggestions and maintains a running competency scorecard.',
              },
              {
                q: 'Is my interview data secure?',
                a: 'Yes. Audio is processed in real-time through encrypted connections and is not stored permanently. API keys never leave our servers. All data is scoped to your organization with row-level security, meaning no other user or organization can access your interview data.',
              },
              {
                q: 'Does it work on macOS and Windows?',
                a: 'Yes. Interview Companion is available as a native desktop app for both macOS (Apple Silicon and Intel, universal binary) and Windows (64-bit, NSIS installer and MSI package). The app is approximately 11MB on macOS and 3-5MB on Windows.',
              },
              {
                q: 'Can I use Interview Companion with my team?',
                a: 'Yes. Interview Companion supports organizations with team-based access. Team members share access to candidates, interview profiles, and scorecards within the same organization. You can invite members and manage roles through the dashboard.',
              },
            ].map((faq, i) => (
              <details key={i} className="group border border-border/30 rounded-lg overflow-hidden">
                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/10 transition-colors">
                  <span className="font-medium text-foreground pr-4">{faq.q}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform shrink-0" />
                </summary>
                <p className="px-4 pb-4 text-muted-foreground leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 border-t border-border/30">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Ready to run better interviews?
          </h2>
          <p className="text-lg text-muted-foreground">
            Join the interviewers who use AI to make fairer, more thorough hiring decisions.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href={user ? '/dashboard' : '/sign-up'}>
              <Button size="lg" className="text-base px-8 group">
                Get Started — It&apos;s Free
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-muted/5">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-md bg-primary/80 flex items-center justify-center">
                <Mic className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="font-medium text-sm">Interview Companion</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a
                href="https://github.com/Montinou/interview-companion"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
              <Link href={user ? '/dashboard' : '/sign-in'} className="hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <a href="mailto:agustin.montoya@distillery.com" className="hover:text-foreground transition-colors">
                Contact
              </a>
            </div>
            <div className="text-xs text-muted-foreground/50">
              © {new Date().getFullYear()} Interview Companion
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
