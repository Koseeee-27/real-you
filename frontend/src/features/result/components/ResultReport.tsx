'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { GameId, ResultResponse } from '../types';
import { GAME_META } from '../data/gameMeta';
import { MOCK_RESULT } from '../data/mockResult';
import GameDetailTab from './GameDetailTab';
import OverviewTab from './OverviewTab';
import SharePanel from './SharePanel';

/**
 * BEがまだ返さない拡張フィールド（subtitle / analysis_comment / top_deviation_metrics）を
 * MOCK_RESULT からフォールバック補完する。
 * feat/result-screen-be が develop にマージされ generated.ts が再生成されたら
 * この関数は不要になるため削除すること。
 */
function mergeWithMockData(data: ResultResponse): ResultResponse {
  return {
    ...data,
    feedback: {
      ...data.feedback,
      subtitle: data.feedback.subtitle ?? MOCK_RESULT.feedback.subtitle,
    },
    details: data.details.map((detail) => {
      const mockDetail = MOCK_RESULT.details.find(
        (d) => d.game_id === detail.game_id
      );
      return {
        ...detail,
        analysis_comment: detail.analysis_comment ?? mockDetail?.analysis_comment ?? [],
        top_deviation_metrics: detail.top_deviation_metrics ?? mockDetail?.top_deviation_metrics ?? [],
      };
    }),
  };
}

type Mode = 'overview' | 'detail';

const SOUNDS = {
  BGM: '/sounds/result-bgm.mp3',
  TAB_CLICK: '/sounds/general-button-se.mp3',
  RETAKE: '/sounds/start-se.mp3',
};

/** コニックグラデーション背景（HTML mockup 完全再現） */
const CONIC_BG = `
  radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2) 0%, transparent 60%),
  conic-gradient(
    from 180deg at 50% 50%,
    #86efac 0deg 20deg,
    #fff 20deg 23deg,
    #fef08a 23deg 65deg,
    #fff 65deg 68deg,
    #e2b07e 68deg 105deg,
    #fff 105deg 108deg,
    #fef08a 108deg 150deg,
    #fff 150deg 153deg,
    #d8b4fe 153deg 180deg,
    #fff 180deg 183deg,
    #87ceeb 183deg 215deg,
    #fff 215deg 218deg,
    #fef08a 218deg 255deg,
    #fff 255deg 258deg,
    #f87171 258deg 295deg,
    #fff 295deg 298deg,
    #fef08a 298deg 335deg,
    #fff 335deg 338deg,
    #86efac 338deg 360deg
  )
`.trim();

type ResultReportProps = {
  data: ResultResponse;
};

export default function ResultReport({ data: rawData }: ResultReportProps) {
  // BEがまだ返さないフィールドをモックで補完する
  const data = mergeWithMockData(rawData);

  const router = useRouter();
  const [mode, setMode] = useState<Mode>('overview');
  const [activeGameId, setActiveGameId] = useState<GameId | null>(
    data.details[0]?.game_id ?? null
  );
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  // SE 再生ヘルパー
  const playSE = (path: string) => {
    const audio = new Audio(path);
    audio.volume = 0.5;
    audio.play().catch(() => {
      /* 自動再生制限は無視 */
    });
  };

  // BGM 管理
  useEffect(() => {
    const bgm = new Audio(SOUNDS.BGM);
    bgm.loop = true;
    bgm.volume = 0.3;
    bgmRef.current = bgm;

    const startBGM = () => {
      bgm.play().catch(() => {
        /* 自動再生制限は無視 */
      });
      window.removeEventListener('click', startBGM);
    };

    window.addEventListener('click', startBGM);
    startBGM();

    return () => {
      bgm.pause();
      bgmRef.current = null;
    };
  }, []);

  // 詳細モードへ遷移
  const handleGoDetail = () => {
    playSE(SOUNDS.TAB_CLICK);
    setMode('detail');
    setActiveGameId(data.details[0]?.game_id ?? null);
  };

  // 総合モードへ戻る
  const handleGoOverview = () => {
    playSE(SOUNDS.TAB_CLICK);
    setMode('overview');
  };

  // ゲームタブ切り替え
  const handleGameTab = (gameId: GameId) => {
    playSE(SOUNDS.TAB_CLICK);
    setActiveGameId(gameId);
  };

  // リトライ
  const handleRetake = useCallback(() => {
    playSE(SOUNDS.RETAKE);
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user_id');
      }
      router.push('/');
    }, 500);
  }, [router]);

  // ゲームタブリスト（details 配列の順序に従う）
  const gameTabs = data.details.flatMap((detail) => {
    const meta = GAME_META[detail.game_id];
    if (!meta) return [];
    return [{ gameId: detail.game_id, meta, detail }];
  });

  const activeDetail =
    gameTabs.find((t) => t.gameId === activeGameId)?.detail ?? null;

  return (
    /* 外側：コニックグラデーション背景 */
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-3 sm:p-5 font-sans"
      style={{ background: CONIC_BG }}
    >
      {/* アメコミ調ドットオーバーレイ */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(rgba(0,0,0,0.03) 2px, transparent 2px)',
          backgroundSize: '16px 16px',
          zIndex: 0,
        }}
      />

      {/* メインカード */}
      <div
        className="relative z-10 w-full flex flex-col"
        style={{ maxWidth: 1100 }}
      >
        {/* ===== ヘッダー（非表示 / 必要なら復活） ===== */}
        {/* <div className="flex justify-center mb-4">
          <div className="bg-white border-[5.5px] border-black px-10 py-2 rounded-full font-black text-xl shadow-[5px_5px_0_#000]">
            行動解析REPORT
          </div>
        </div> */}

        {/* ===== ホワイトカード ===== */}
        {/* 概要: 高さ auto（コンテンツに合わせる） / 詳細: 固定高さ（内部スクロール） */}
        <div
          className="bg-white border-[6.5px] border-black rounded-[28px] flex flex-col"
          style={{
            ...(mode === 'detail'
              ? { height: 'calc(100vh - 130px)', overflow: 'hidden' }
              : {}),
            boxShadow: '12px 12px 0 rgba(0,0,0,0.15)',
            padding: '24px 32px',
          }}
        >
          {/* 詳細モード：ゲームタブナビ */}
          {mode === 'detail' && (
            <nav className="flex justify-center gap-3 mb-6 flex-wrap">
              {gameTabs.map(({ gameId, meta }) => {
                const isActive = activeGameId === gameId;
                const Icon = meta.icon;
                return (
                  <button
                    key={gameId}
                    type="button"
                    onClick={() => handleGameTab(gameId)}
                    className="flex items-center gap-2 px-5 py-1.5 rounded-full font-black text-sm border-[3px] border-black transition-all"
                    style={{
                      background: isActive ? meta.color : '#fff',
                      color: isActive ? '#fff' : '#000',
                      boxShadow: isActive
                        ? '1.5px 1.5px 0 #000'
                        : '3px 3px 0 #000',
                      transform: isActive ? 'translate(1px,1px)' : undefined,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {meta.label}
                  </button>
                );
              })}
            </nav>
          )}

          {/* コンテンツ：詳細モードは flex-1 min-h-0 で残り高さを占有してスクロールさせる */}
          <div className={mode === 'detail' ? 'flex-1 min-h-0' : undefined}>
            {mode === 'overview' && <OverviewTab data={data} />}
            {mode === 'detail' && activeDetail && (
              <GameDetailTab
                detail={activeDetail}
                tabColor={
                  activeGameId ? GAME_META[activeGameId]?.color : '#3b82f6'
                }
              />
            )}
          </div>
        </div>

        {/* ===== フッターボタン ===== */}
        <div className="flex justify-center gap-5 mt-4 flex-wrap">
          {mode === 'overview' ? (
            /* 総合結果モードのフッター */
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex items-center gap-2 h-12 px-8 bg-white border-[4.5px] border-black rounded-full font-black text-sm shadow-[4px_4px_0_#000] hover:translate-y-0.5 hover:shadow-none transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                もう一度診断
              </button>

              <button
                type="button"
                onClick={handleGoDetail}
                className="flex items-center gap-2 h-12 px-8 border-[4.5px] border-black rounded-full font-black text-sm shadow-[4px_4px_0_#000] hover:translate-y-0.5 hover:shadow-none transition-all text-white"
                style={{
                  background:
                    'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
                }}
              >
                詳細を見る →
              </button>
            </>
          ) : (
            /* 詳細モードのフッター */
            <>
              <button
                type="button"
                onClick={handleGoOverview}
                className="flex items-center gap-2 h-12 px-8 bg-white border-[4.5px] border-black rounded-full font-black text-sm shadow-[4px_4px_0_#000] hover:translate-y-0.5 hover:shadow-none transition-all"
              >
                ← 戻る
              </button>

              <SharePanel title={data.feedback.title} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
