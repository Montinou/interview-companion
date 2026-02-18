import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const siteUrl = 'https://interview-companion.triqual.dev';

export const metadata: Metadata = {
  // Core
  title: {
    default: 'Interview Companion — AI Copilot for Technical Interviews',
    template: '%s | Interview Companion',
  },
  description:
    'Real-time AI-powered interview assistant. Live transcription, instant follow-up suggestions, red flag detection, and automated scorecards. Works with Zoom, Meet, Teams — invisible to candidates.',
  keywords: [
    'interview assistant',
    'AI interview tool',
    'technical interview',
    'interview copilot',
    'real-time transcription',
    'interview scorecard',
    'hiring tool',
    'QA interview',
    'interview analysis',
    'Deepgram transcription',
    'interview red flags',
    'candidate evaluation',
    'interview automation',
    'HR tech',
  ],

  // Canonical
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: '/',
  },

  // Open Graph (Facebook, LinkedIn, Slack, etc.)
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Interview Companion',
    title: 'Interview Companion — AI Copilot for Technical Interviews',
    description:
      'Real-time AI transcription, instant follow-up suggestions, and automated scorecards. Run better interviews with any video call platform.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Interview Companion — AI-powered interview assistant dashboard',
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'Interview Companion — AI Copilot for Technical Interviews',
    description:
      'Real-time transcription, AI analysis, and automated scorecards. Invisible to candidates.',
    images: ['/og-image.png'],
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Icons
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },

  // Misc
  category: 'technology',
  creator: 'Interview Companion',
  publisher: 'Interview Companion',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: '#3b82f6',
          borderRadius: '0.5rem',
        },
      }}
    >
      <html lang="en" className="dark" suppressHydrationWarning>
        <head>
          {/* JSON-LD Structured Data */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'SoftwareApplication',
                name: 'Interview Companion',
                applicationCategory: 'BusinessApplication',
                operatingSystem: 'macOS, Windows',
                description:
                  'AI-powered interview assistant with real-time transcription, analysis, and automated scorecards.',
                url: siteUrl,
                offers: {
                  '@type': 'Offer',
                  price: '0',
                  priceCurrency: 'USD',
                },
                featureList: [
                  'Real-time speech-to-text transcription',
                  'AI-powered answer analysis',
                  'Live competency scorecard',
                  'Red flag and green flag detection',
                  'Follow-up question suggestions',
                  'Multi-language support (English, Spanish)',
                  'Works with Zoom, Google Meet, Microsoft Teams',
                  'Invisible to interview candidates',
                  'Provider failover for reliability',
                  'Evidence-based evaluation only',
                ],
              }),
            }}
          />
          {/* FAQ Schema for GEO */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: [
                  {
                    '@type': 'Question',
                    name: 'Is Interview Companion free?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Yes, Interview Companion is completely free to use. The desktop app, real-time transcription, AI analysis, and scorecard generation are all included at no cost.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'Can the candidate see or detect Interview Companion?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'No. Interview Companion runs as a native desktop application on your machine. It captures audio from your microphone — no bots join the video call, no browser extensions are visible, and there is no indication to the candidate that the system exists.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'What video call platforms does Interview Companion work with?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Interview Companion works with any platform that uses your microphone: Google Meet, Zoom, Microsoft Teams, Slack Huddles, Discord, and any other video or audio call application.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'What languages does Interview Companion support?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Currently, Interview Companion supports English, Spanish, and mixed-language interviews. The AI adapts to the language being spoken in real-time.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'How does the AI analysis work?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'As the interview progresses, transcript chunks are sent to the AI engine every 15-20 seconds. The AI analyzes each response for technical accuracy, depth, red flags, and green flags. It generates follow-up question suggestions and maintains a running competency scorecard.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'Is my interview data secure?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Yes. Audio is processed in real-time through encrypted connections and is not stored permanently. API keys never leave the server. All data is scoped to your organization with row-level security.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'Does Interview Companion work on macOS and Windows?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Yes. Interview Companion is available as a native desktop app for both macOS (Apple Silicon and Intel) and Windows (64-bit). The app is approximately 11MB on macOS and 3-5MB on Windows.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'Can I use Interview Companion with my team?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Yes. Interview Companion supports organizations with team-based access. Team members share access to candidates, interview profiles, and scorecards within the same organization.',
                    },
                  },
                ],
              }),
            }}
          />
        </head>
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
