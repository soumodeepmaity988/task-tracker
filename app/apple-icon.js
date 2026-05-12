import { ImageResponse } from 'next/og';

// Apple touch icon — shown when users add to home screen on iOS / iPadOS.
// Next.js builds this once at build time and serves /apple-icon.png.

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #4f8ef7 0%, #8b5cf6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32">
          <path
            d="M8.5 17 L13.5 22 L23.5 10"
            stroke="white"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
    ),
    size
  );
}
