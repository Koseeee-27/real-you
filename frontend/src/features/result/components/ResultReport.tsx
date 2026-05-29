'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { GameId, ResultResponse } from '../types';
import { GAME_META } from '../data/gameMeta';
import GameDetailTab from './GameDetailTab';
import OverviewTab from './OverviewTab';
import SharePanel from './SharePanel';

type Mode = 'overview' | 'detail';

const SOUNDS = {
  BGM: '/sounds/result-bgm.mp3',
  TAB_CLICK: '/sounds/general-button-se.mp3',
  RETAKE: '/sounds/start-se.mp3',
};

/** ゲーム色 → CSS クラス名のマッピング */
const COLOR_TO_BTN_CLASS: Record<string, string> = {
  '#ef4444': 'btn-red',
  '#f97316': 'btn-orange',
  '#22c55e': 'btn-green',
  '#3b82f6': 'btn-blue',
  '#4d85ff': 'btn-blue',
};

type ResultReportProps = {
  data: ResultResponse;
};

export default function ResultReport({ data }: ResultReportProps) {
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
    /* 外側：トップページと同じ SVG 水玉背景 */
    <div
      className="slide-container bg-top-pattern"
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 35px',
        position: 'relative',
      }}
    >
      {/* メインカード */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: 1100,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ===== ホワイトカード ===== */}
        <div
          className="main-card"
          style={
            mode === 'detail'
              ? {
                  height: 'calc(100vh - 130px)',
                  overflow: 'hidden',
                  flexDirection: 'column',
                }
              : { flexDirection: 'column' }
          }
        >
          {/* 詳細モード：ゲームタブナビ */}
          {mode === 'detail' && (
            <nav
              className="game-nav-reconstructed"
              style={{ marginTop: 0, marginBottom: 12 }}
            >
              {gameTabs.map(({ gameId, meta }) => {
                const isActive = activeGameId === gameId;
                const Icon = meta.icon;
                const btnColorClass =
                  COLOR_TO_BTN_CLASS[meta.color] ?? 'btn-blue';
                return (
                  <button
                    key={gameId}
                    type="button"
                    onClick={() => handleGameTab(gameId)}
                    className={`game-tab-btn${isActive ? ` active ${btnColorClass}` : ''}`}
                  >
                    <Icon
                      style={{
                        width: 14,
                        height: 14,
                        color: isActive ? '#fff' : meta.color,
                      }}
                    />
                    {meta.label}
                  </button>
                );
              })}
            </nav>
          )}

          {/* コンテンツ */}
          <div
            style={mode === 'detail' ? { flex: 1, minHeight: 0 } : undefined}
          >
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
        <div className="footer-actions-reconstructed">
          {mode === 'overview' ? (
            /* 総合結果モードのフッター */
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="btn-action-new"
              >
                <RefreshCw style={{ width: 16, height: 16 }} />
                もう一度診断
              </button>

              <SharePanel title={data.feedback.title} userId={data.user_id} />

              <button
                type="button"
                onClick={handleGoDetail}
                className="btn-action-new btn-orange-grad btn-primary-large"
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
                className="btn-action-new"
              >
                ← 戻る
              </button>

              <SharePanel title={data.feedback.title} userId={data.user_id} />

              <button
                type="button"
                onClick={handleRetake}
                className="btn-action-new"
              >
                <RefreshCw style={{ width: 16, height: 16 }} />
                もう一度診断
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
