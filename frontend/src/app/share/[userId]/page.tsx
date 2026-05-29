import type { Metadata } from 'next';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { getResult } from '@/lib/api';
import { SITE_URL } from '@/constants/site';
import type { ResultResponse } from '@/features/result/types';
import ShareResultView from '@/features/result/components/ShareResultView';

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

  let result: ResultResponse | null = null;
  try {
    result = await getCachedResult(userId);
  } catch {
    // 無効なユーザーID等は null のままフォールバック表示
    result = null;
  }

  // 結果が取得できた場合は、本人の結果画面と同じ総合グラフ＋詳細タブを
  // 閲覧専用ビューで表示する。
  if (result) {
    return <ShareResultView data={result} />;
  }

  // 取得失敗時のフォールバック（無効な user_id など）
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
        textAlign: 'center',
        gap: 24,
        fontFamily: "'M PLUS Rounded 1c', sans-serif",
      }}
    >
      <p
        style={{
          fontSize: 18,
          fontWeight: 900,
          color: '#555',
          margin: 0,
        }}
      >
        行動解析REPORTの結果が見つかりませんでした。
      </p>

      <Link
        href="/"
        style={{
          background: '#000',
          color: '#fff',
          border: '4px solid #000',
          borderRadius: 50,
          padding: '12px 40px',
          fontSize: 16,
          fontWeight: 900,
          textDecoration: 'none',
          boxShadow: '4px 4px 0px #f97316',
          display: 'inline-block',
          letterSpacing: '0.04em',
        }}
      >
        自分も診断する →
      </Link>
    </div>
  );
}
