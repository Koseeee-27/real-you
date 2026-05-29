'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { GameId, ResultResponse } from '../types';
import { GAME_META } from '../data/gameMeta';
import GameDetailTab from './GameDetailTab';
import OverviewTab from './OverviewTab';

type Mode = 'overview' | 'detail';

/** ゲーム色 → CSS クラス名のマッピング（ResultReport と同一） */
const COLOR_TO_BTN_CLASS: Record<string, string> = {
  '#ef4444': 'btn-red',
  '#f97316': 'btn-orange',
  '#22c55e': 'btn-green',
  '#3b82f6': 'btn-blue',
  '#4d85ff': 'btn-blue',
};

type ShareResultViewProps = {
  data: ResultResponse;
};

/**
 * 共有リンク（/share/[userId]）専用の「閲覧専用」結果ビュー。
 *
 * ResultReport をベースに、訪問者向けに以下を除外/差し替えた読み取り専用版:
 * - BGM 自動再生・効果音なし
 * - 「もう一度診断」ボタン（訪問者の localStorage を消す副作用）なし
 * - シェアパネルなし
 * - フッターの主要 CTA を「自分も診断する →」(トップへの導線) に差し替え
 *
 * 総合（5軸グラフ）と詳細（ゲームごとのタブ）の表示は本人の結果画面と同じ
 * OverviewTab / GameDetailTab を再利用する。
 */
export default function ShareResultView({ data }: ShareResultViewProps) {
  const [mode, setMode] = useState<Mode>('overview');
  const [activeGameId, setActiveGameId] = useState<GameId | null>(
    data.details[0]?.game_id ?? null
  );

  const handleGoDetail = () => {
    setMode('detail');
    setActiveGameId(data.details[0]?.game_id ?? null);
  };
  const handleGoOverview = () => setMode('overview');
  const handleGameTab = (gameId: GameId) => setActiveGameId(gameId);

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
          <div style={mode === 'detail' ? { flex: 1, minHeight: 0 } : undefined}>
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
              <Link
                href="/"
                className="btn-action-new"
                style={{ textDecoration: 'none' }}
              >
                自分も診断する →
              </Link>

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

              <Link
                href="/"
                className="btn-action-new btn-orange-grad btn-primary-large"
                style={{ textDecoration: 'none' }}
              >
                自分も診断する →
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
