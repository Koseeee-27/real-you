import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { unstable_cache } from 'next/cache';
import { getResult } from '@/lib/api';
import { SITE_URL } from '@/constants/site';

export const revalidate = 3600;

type Props = {
  params: Promise<{ userId: string }>;
};

const getCachedResult = (userId: string) =>
  unstable_cache(() => getResult(userId), ['share-result', userId], {
    revalidate: 3600,
  })();

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;

  try {
    const result = await getCachedResult(userId);
    const title = result.feedback.title;
    const ogImageUrl = `${SITE_URL}/share/${userId}/opengraph-image`;

    return {
      title: `「${title}」| Real You 行動解析REPORT`,
      description: `行動解析の結果、このタイプは「${title}」。あなたも3つのゲームで本当の性格を暴き出してみよう。`,
      openGraph: {
        title: `私のタイプは「${title}」でした！`,
        description: `あなたも3つのゲームで本当の性格を暴き出してみよう。`,
        url: `${SITE_URL}/share/${userId}`,
        images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      },
      twitter: {
        card: 'summary_large_image',
        title: `私のタイプは「${title}」でした！`,
        description: `あなたも3つのゲームで本当の性格を暴き出してみよう。`,
        images: [ogImageUrl],
      },
    };
  } catch {
    return {
      title: 'Real You 行動解析REPORT',
      description: '3つのミニゲームで自分の本当の性格を発見しよう。',
    };
  }
}

export default async function SharePage({ params }: Props) {
  const { userId } = await params;

  let title: string | null = null;
  let subtitle: string | null = null;

  try {
    const result = await getCachedResult(userId);
    title = result.feedback.title;
    subtitle = result.feedback.subtitle ?? null;
  } catch {
    // 無効なユーザーIDでもフォールバック表示
  }

  return (
    <div
      className="slide-container bg-top-pattern"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
      }}
    >
      <div
        style={{
          background: '#fff',
          border: '6.5px solid #000',
          borderRadius: 28,
          boxShadow: '12px 12px 0px rgba(0,0,0,0.15)',
          padding: '40px 48px',
          maxWidth: 480,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          textAlign: 'center',
          fontFamily: "'M PLUS Rounded 1c', sans-serif",
        }}
      >
        {/* ロゴ */}
        <Image
          src="/images/RealYouLogo.png"
          alt="Real You"
          width={180}
          height={60}
          style={{ objectFit: 'contain' }}
        />

        {/* タイプ表示エリア */}
        {title ? (
          <>
            <p
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: '#666',
                margin: 0,
                letterSpacing: '0.06em',
              }}
            >
              ゲームが導き出した、この人の本当の姿は...
            </p>

            <div
              style={{
                background: '#fef08a',
                border: '5px solid #000',
                borderRadius: 18,
                padding: '10px 28px 18px',
                boxShadow: '3px 3px 0px #636262',
              }}
            >
              <p
                style={{
                  fontSize: 42,
                  fontWeight: 950,
                  margin: 0,
                  lineHeight: 1.1,
                  color: '#f87171',
                  textShadow:
                    '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 4px 4px 0 rgba(0,0,0,0.25)',
                }}
              >
                {title}
              </p>
            </div>

            {subtitle && (
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                  color: '#555',
                  margin: 0,
                }}
              >
                {subtitle}
              </p>
            )}
          </>
        ) : (
          <p
            style={{
              fontSize: 16,
              fontWeight: 900,
              color: '#555',
              margin: 0,
            }}
          >
            行動解析REPORTの結果が見つかりませんでした。
          </p>
        )}

        {/* 区切り */}
        <div
          style={{
            width: '100%',
            borderTop: '3px dashed #e2e8f0',
            margin: '4px 0',
          }}
        />

        {/* 煽り文 */}
        <p
          style={{
            fontSize: 15,
            fontWeight: 900,
            color: '#333',
            margin: 0,
            lineHeight: 1.7,
          }}
        >
          あなたも3つのゲームで、
          <br />
          <span style={{ color: '#f87171' }}>本当の自分</span>
          を暴き出してみよう。
        </p>

        {/* CTA ボタン */}
        <Link
          href="/"
          style={{
            background: '#000',
            color: '#fff',
            border: '4px solid #000',
            borderRadius: 50,
            padding: '12px 40px',
            fontSize: 16,
            fontWeight: 950,
            textDecoration: 'none',
            boxShadow: '4px 4px 0px #f97316',
            display: 'inline-block',
            letterSpacing: '0.04em',
          }}
        >
          自分も診断する →
        </Link>
      </div>
    </div>
  );
}
