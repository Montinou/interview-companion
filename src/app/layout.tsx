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
        </head>
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
