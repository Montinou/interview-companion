import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Interview Companion — AI Copilot for Technical Interviews';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0f',
          backgroundImage: 'radial-gradient(circle at 25% 25%, #1e3a5f 0%, transparent 50%), radial-gradient(circle at 75% 75%, #1a1a3e 0%, transparent 50%)',
        }}
      >
        {/* Logo area */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
            }}
          >
            🎙️
          </div>
          <span style={{ fontSize: '32px', color: '#9ca3af', fontWeight: 500 }}>
            Interview Companion
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: '64px',
              fontWeight: 700,
              color: 'white',
              textAlign: 'center',
              lineHeight: 1.1,
            }}
          >
            Your AI copilot for
          </span>
          <span
            style={{
              fontSize: '64px',
              fontWeight: 700,
              background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
              backgroundClip: 'text',
              color: 'transparent',
              textAlign: 'center',
              lineHeight: 1.1,
            }}
          >
            technical interviews
          </span>
        </div>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '24px',
            color: '#9ca3af',
            marginTop: '24px',
            textAlign: 'center',
            maxWidth: '800px',
          }}
        >
          Real-time transcription • AI analysis • Automated scorecards
        </p>

        {/* Features pills */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '32px',
          }}
        >
          {['Zoom', 'Google Meet', 'Teams', 'Any platform'].map((platform) => (
            <div
              key={platform}
              style={{
                padding: '8px 20px',
                borderRadius: '20px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                fontSize: '18px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              {platform}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
