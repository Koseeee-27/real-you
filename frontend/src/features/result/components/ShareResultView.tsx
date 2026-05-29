'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { GameId, ResultResponse } from '../types';
import { GAME_META } from '../data/gameMeta';
import BipolarSlider from './BipolarSlider';
import OverviewTab from './OverviewTab';
import GameDetailTab from './GameDetailTab';
import { renderComment, computeBiggestGap } from '../utils/commentUtils';
import { SITE_URL } from '@/constants/site';

type ShareResultViewProps = {
  data: ResultResponse;
};

type Mode = 'overview' | 'detail';

const COLOR_TO_BTN_CLASS: Record<string, string> = {
  '#ef4444': 'btn-red',
  '#f97316': 'btn-orange',
  '#22c55e': 'btn-green',
  '#3b82f6': 'btn-blue',
  '#4d85ff': 'btn-blue',
};

const AXES = [
  'caution',
  'calmness',
  'logic',
  'cooperativeness',
  'positivity',
] as const;

// ===== SNS 共有ヘルパー =====

function buildShareText(title: string, shareUrl: string): string {
  return `私の行動解析結果は「${title}」でした！\n#技育博 #RealYou #本当の私じゃだめですか\n${shareUrl}`;
}

type SnsPanelProps = {
  title: string;
  userId: string;
};

function SnsShareButtons({ title, userId }: SnsPanelProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const shareUrl = `${SITE_URL}/share/${userId}`;
  const text = buildShareText(title, shareUrl);

  const shareToX = () => {
    const params = new URLSearchParams({ text });
    window.open(
      `https://twitter.com/intent/tweet?${params}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const shareToLine = () => {
    const params = new URLSearchParams({ text, url: shareUrl });
    window.open(
      `https://social-plugins.line.me/lineit/share?${params}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      if (ok) {
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 2000);
      }
    }
  }, [text]);

  return (
    <div className="share-sns-row">
      <button type="button" onClick={shareToX} className="share-sns-btn">
        <span className="share-sns-icon">𝕏</span>
        <span>Xでシェア</span>
      </button>
      <button type="button" onClick={shareToLine} className="share-sns-btn">
        <span className="share-sns-icon">💬</span>
        <span>LINE</span>
      </button>
      <button type="button" onClick={handleCopy} className="share-sns-btn">
        <span className="share-sns-icon">{copied ? '✓' : '📋'}</span>
        <span>{copied ? 'コピー済！' : 'テキストコピー'}</span>
      </button>
    </div>
  );
}

// ===== メインコンポーネント =====

export default function ShareResultView({ data }: ShareResultViewProps) {
  const { feedback, scores, baseline_scores, details } = data;

  // PC: タブ切替
  const [mode, setMode] = useState<Mode>('overview');
  const [activeGameId, setActiveGameId] = useState<GameId | null>(
    data.details[0]?.game_id ?? null
  );

  // モバイル: アコーディオン
  const [openGameId, setOpenGameId] = useState<string | null>(null);

  const gap = computeBiggestGap(scores, baseline_scores);

  const gameTabs = data.details.flatMap((detail) => {
    const meta = GAME_META[detail.game_id];
    if (!meta) return [];
    return [{ gameId: detail.game_id, meta, detail }];
  });
  const activeDetail =
    gameTabs.find((t) => t.gameId === activeGameId)?.detail ?? null;

  const toggleGame = (gameId: string) =>
    setOpenGameId((prev) => (prev === gameId ? null : gameId));

  return (
    <>
      {/* =========================================================
          PC レイアウト（≥768px）— ResultReport 相当
          ========================================================= */}
      <div className="share-pc-only">
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
            {/* ホワイトカード */}
            <div
              className="main-card"
              style={
                mode === 'detail'
                  ? {
                      height: 'calc(100vh - 160px)',
                      overflow: 'hidden',
                      flexDirection: 'column',
                    }
                  : { flexDirection: 'column' }
              }
            >
              {/* 詳細モード: ゲームタブナビ */}
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
                        onClick={() => setActiveGameId(gameId)}
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
                style={
                  mode === 'detail' ? { flex: 1, minHeight: 0 } : undefined
                }
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

            {/* フッター */}
            <div
              className="footer-actions-reconstructed"
              style={{ flexWrap: 'wrap', gap: 12 }}
            >
              {mode === 'overview' ? (
                <>
                  <Link
                    href="/"
                    className="btn-action-new"
                    style={{ textDecoration: 'none' }}
                  >
                    自分も診断する →
                  </Link>

                  <SnsShareButtons
                    title={feedback.title}
                    userId={data.user_id}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setMode('detail');
                      setActiveGameId(data.details[0]?.game_id ?? null);
                    }}
                    className="btn-action-new btn-orange-grad btn-primary-large"
                  >
                    詳細を見る →
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setMode('overview')}
                    className="btn-action-new"
                  >
                    ← 戻る
                  </button>

                  <SnsShareButtons
                    title={feedback.title}
                    userId={data.user_id}
                  />

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
      </div>

      {/* =========================================================
          モバイルレイアウト（<768px）— 縦積み
          ========================================================= */}
      <div className="share-mobile-only">
        <div className="share-page">
          <div className="share-app-label">Real You 行動解析REPORT</div>

          {/* 2カラム on タブレット+ / 1カラム on SP */}
          <div className="share-main-grid">
            {/* 左: タイトル + ギャップ + コメント */}
            <div className="share-col">
              <div className="share-title-card">
                <p className="share-preface">
                  ゲームが導き出した、あなたの本当の姿は...
                </p>
                <h1 className="share-title">
                  <span className="orange-highlight">{feedback.title}</span>
                </h1>
                {feedback.subtitle && (
                  <p className="share-subtitle">{feedback.subtitle}</p>
                )}
              </div>

              {gap && (
                <div className="share-card">
                  <span className="share-tag">最大のギャップ</span>
                  {gap.gap <= 10 ? (
                    <p className="share-gap-body">
                      自己認識と行動は
                      <span className="gap-actual">ほぼ一致</span>！
                    </p>
                  ) : gap.sameSide ? (
                    <p className="share-gap-body">
                      自覚以上に
                      <span className="gap-actual">「{gap.actualLabel}」</span>
                      でした！
                    </p>
                  ) : (
                    <p className="share-gap-body">
                      自分では
                      <span className="gap-self">「{gap.selfLabel}」</span>
                      のつもり、でも実際は
                      <span className="gap-actual">「{gap.actualLabel}」</span>
                      ！
                    </p>
                  )}
                </div>
              )}

              <div className="share-card">
                <span className="share-tag">解析コメント</span>
                <div className="comment-body-text">
                  {feedback.description.split('\n').map((line, i) => (
                    <p key={i} className="comment-sentence-block">
                      {renderComment(line)}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* 右: 5軸スライダー */}
            <div className="share-col">
              <div className="share-card">
                <span className="share-tag">5つの性格軸</span>
                <div className="slider-legend-row" style={{ marginBottom: 12 }}>
                  <span className="legend-item">
                    <span className="legend-tri-actual">▼</span> 実測（本能）
                  </span>
                  <span className="legend-item">
                    <span className="legend-tri-self">▼</span> 自己申告
                  </span>
                </div>
                {AXES.map((axis) => (
                  <BipolarSlider
                    key={axis}
                    axis={axis}
                    score={scores[axis]}
                    baselineScore={baseline_scores[axis]}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ゲーム別詳細（アコーディオン） */}
          <div className="share-games-section">
            <p className="share-section-label">ゲーム別くわしい結果</p>

            {details.map((detail) => {
              const meta = GAME_META[detail.game_id];
              if (!meta) return null;
              const Icon = meta.icon;
              const isOpen = openGameId === detail.game_id;

              return (
                <div key={detail.game_id} className="share-accordion">
                  <button
                    type="button"
                    className="share-accordion-header"
                    style={{ borderLeftColor: meta.color }}
                    onClick={() => toggleGame(detail.game_id)}
                    aria-expanded={isOpen}
                    aria-controls={`accordion-body-${detail.game_id}`}
                  >
                    <div className="share-accordion-title">
                      <Icon
                        style={{
                          width: 18,
                          height: 18,
                          color: meta.color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ color: meta.color, fontWeight: 900 }}>
                        {meta.label}
                      </span>
                      <span
                        style={{ color: '#666', fontSize: 13, fontWeight: 700 }}
                      >
                        {detail.title}
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronUp size={18} color="#666" />
                    ) : (
                      <ChevronDown size={18} color="#666" />
                    )}
                  </button>

                  {isOpen && (
                    <div
                      id={`accordion-body-${detail.game_id}`}
                      className="share-accordion-body"
                    >
                      <div className="share-accordion-inner-grid">
                        <div>
                          <p className="share-subsection-label">
                            このゲームで見えた性格
                          </p>
                          {detail.feature_scores.map((fs) => (
                            <BipolarSlider
                              key={fs.axis}
                              axis={fs.axis}
                              score={fs.score}
                            />
                          ))}
                        </div>
                        <div>
                          <p className="share-subsection-label">解析コメント</p>
                          <div
                            className="comment-body-text"
                            style={{ fontSize: 13, lineHeight: 1.75 }}
                          >
                            {detail.analysis_comment.map((line, i) => (
                              <p key={i} className="comment-sentence-block">
                                {renderComment(line)}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>

                      {detail.top_deviation_metrics.length > 0 && (
                        <>
                          <p
                            className="share-subsection-label"
                            style={{ marginTop: 14 }}
                          >
                            行動データ
                          </p>
                          <div className="share-data-grid">
                            {detail.top_deviation_metrics.map((m, i) => (
                              <div key={i} className="share-data-item">
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 900,
                                    color: '#000',
                                    marginBottom: 4,
                                  }}
                                >
                                  {m.label}
                                </div>
                                <div
                                  style={{
                                    fontSize: 22,
                                    fontWeight: 800,
                                    color: '#f87171',
                                  }}
                                >
                                  {m.user}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: '#475569',
                                    fontWeight: 700,
                                    marginBottom: 6,
                                  }}
                                >
                                  平均：{m.average}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    background: '#fffce8',
                                    border: '1px dashed #f87171',
                                    padding: '6px 8px',
                                    borderRadius: 8,
                                    color: '#334155',
                                    lineHeight: 1.5,
                                  }}
                                >
                                  {m.praise}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* モバイルフッター */}
          <div className="share-footer">
            <p className="share-footer-copy">
              あなたも3つのゲームで、本当の自分を暴き出してみよう。
            </p>
            <Link href="/" className="share-cta-btn">
              自分も診断する →
            </Link>
            <SnsShareButtons title={feedback.title} userId={data.user_id} />
            <p className="share-footer-brand">Real You — 行動解析REPORT</p>
          </div>
        </div>
      </div>
    </>
  );
}
