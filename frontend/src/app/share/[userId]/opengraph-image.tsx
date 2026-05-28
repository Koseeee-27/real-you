import { ImageResponse } from 'next/og';
import { getResult } from '@/lib/api';

export const runtime = 'nodejs';
export const alt = 'Real You 行動解析REPORT';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@900&display=swap',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      }
    ).then((r) => r.text());
    const url = css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/)?.[1];
    if (!url) return null;
    return fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

function getTitleFontSize(title: string): number {
  if (title.length > 10) return 60;
  if (title.length > 8) return 72;
  if (title.length > 6) return 80;
  return 88;
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  let title = '行動解析REPORT';
  let subtitle = '';

  try {
    const result = await getResult(userId);
    title = result.feedback.title;
    subtitle = result.feedback.subtitle ?? '';
  } catch {
    // フォールバック
  }

  const [fontData] = await Promise.all([loadFont()]);
  const fontSize = getTitleFontSize(title);

  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        background: '#fef08a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'M PLUS Rounded 1c', sans-serif",
        position: 'relative',
      }}
    >
      {/* 水玉背景風 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.6) 8px, transparent 8px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* カード */}
      <div
        style={{
          background: '#fff',
          border: '8px solid #000',
          borderRadius: 36,
          padding: '40px 60px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          boxShadow: '12px 12px 0px rgba(0,0,0,0.15)',
          position: 'relative',
          maxWidth: 900,
          width: '85%',
        }}
      >
        {/* ラベル */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: '#666',
            letterSpacing: '0.06em',
          }}
        >
          ゲームが導き出した、この人の本当の姿は...
        </div>

        {/* タイトル */}
        <div
          style={{
            background: '#fef08a',
            border: '6px solid #000',
            borderRadius: 20,
            padding: '12px 40px',
            boxShadow: '4px 4px 0px #636262',
          }}
        >
          <div
            style={{
              fontSize,
              fontWeight: 900,
              color: '#f87171',
              lineHeight: 1.1,
              textShadow:
                '-3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000',
            }}
          >
            {title}
          </div>
        </div>

        {subtitle && (
          <div
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: '#555',
            }}
          >
            {subtitle}
          </div>
        )}

        {/* 下部 */}
        <div
          style={{
            fontSize: 20,
            fontWeight: 900,
            color: '#888',
            marginTop: 8,
            letterSpacing: '0.04em',
          }}
        >
          Real You — 行動解析REPORT
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      ...(fontData
        ? {
            fonts: [
              {
                name: 'M PLUS Rounded 1c',
                data: fontData,
                weight: 900,
                style: 'normal',
              },
            ],
          }
        : {}),
    }
  );
}
