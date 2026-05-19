'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import ErrorScreen from '@/components/common/ErrorScreen';
import type { SorterGameData } from '@/features/games/types';
import { submitGame } from '@/lib/api';
import {
  MAX_RETRY_COUNT,
  isApiClientError,
  isRestartCode,
} from '@/lib/api/error';
import {
  GAME_DURATION_MS,
  SORTER_AUDIO_PATHS,
  SORTER_UI_COLORS,
} from '../data/sorterConstants';
import { useSorterGame } from '../hooks/useSorterGame';
import Belt from './Belt';
import BinTray from './BinTray';
import OnboardingSlides from './OnboardingSlides';
import PackageItem from './PackageItem';
import SorterCountdownOverlay from './SorterCountdownOverlay';
import SorterEventBanner from './SorterEventBanner';
import SorterHUD from './SorterHUD';
import SorterResultOverlay from './SorterResultOverlay';

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * `ErrorScreen` に渡す variant。
 * - `'retry'`   … 一時的な通信エラー（5xx / ネットワーク失敗）想定
 * - `'restart'` … `RESTART_CODES`、user_id 欠損、リトライ上限超過
 */
type ErrorVariant = 'retry' | 'restart';

/**
 * 荷物仕分けゲーム（sorter_game / game_type=4）のオーケストレーター。
 *
 * GroupChatGameFlow / HelpdeskGameFlow と同流儀で:
 *   - BGM の初期化（パス未設定なら生成しない）
 *   - `submitGame({ user_id, game_type: 4, data })` の retry/restart 分岐
 *   - `duplicate_submission` は次画面へ自動進行
 *   - 成功時は結果画面 + 「次のゲームへ ▶」ボタン → 押下で `/games/group-chat` へ遷移
 *
 * UI 構成は以下のサブコンポーネントに分割:
 *   - `SorterHUD`              … タイトル / 残り時間 / SCORE + 状態バッジ列
 *   - `Belt` + `PackageItem`   … U 字経路ベルトと荷物
 *   - `BinTray`                … 3 つの仕分け先
 *   - `SorterEventBanner`      … ルール変更 / 凍結予告 / 復旧 / 速度 2 倍 / MISS
 *   - `OnboardingSlides`       … 開始前 4 スライド
 *   - `SorterCountdownOverlay` … 3-2-1-START
 *   - `SorterResultOverlay`    … 結果画面
 */
export default function SorterGameFlow() {
  const router = useRouter();
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [errorVariant, setErrorVariant] = useState<ErrorVariant>('retry');
  /**
   * ゲーム完了時の送信データ。結果画面の統計表示でも参照するため state で保持。
   * `handleRetry` で再送信するときの payload としても使う。
   */
  const [pendingData, setPendingData] = useState<SorterGameData | null>(null);
  const retryCountRef = useRef(0);

  // BGM 管理（既存ゲームと同流儀）
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  // ベルトコンテナの実測幅。PackageItem の U 字経路アニメに渡す
  const beltContainerRef = useRef<HTMLDivElement | null>(null);
  const [beltWidth, setBeltWidth] = useState(0);

  function playSE(path: string) {
    const audio = new Audio(path);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  }

  // BGM の初期化と再生管理
  //
  // `SORTER_AUDIO_PATHS.bgm` が空文字列（BGM 未決定）の場合は `new Audio()` を
  // 生成せず、コンソールに 404 ノイズを残さない。BGM が決まったら定数に
  // ファイル名を入れるだけで自動的に再生される。
  useEffect(() => {
    if (!SORTER_AUDIO_PATHS.bgm) return;

    const bgm = new Audio(SORTER_AUDIO_PATHS.bgm);
    bgm.loop = true;
    bgm.volume = 0.3;
    bgmRef.current = bgm;

    const playBGM = () => {
      bgm.play().catch(() => {});
      window.removeEventListener('click', playBGM);
    };
    window.addEventListener('click', playBGM);
    playBGM();

    return () => {
      bgm.pause();
      window.removeEventListener('click', playBGM);
    };
  }, []);

  // ベルトコンテナの幅を ResizeObserver で実測
  useEffect(() => {
    const el = beltContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setBeltWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /**
   * submitGame(game_type=4) 呼び出しの共通処理。
   * GroupChatGameFlow と同流儀のエラー分岐。
   */
  async function submitSorterGame(data: SorterGameData) {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      setErrorVariant('restart');
      setSubmitStatus('error');
      return;
    }

    try {
      await submitGame({
        user_id: userId,
        game_type: 4,
        data,
      });
      retryCountRef.current = 0;
      setSubmitStatus('success');
      // 次画面への遷移は結果画面の「次のゲームへ ▶」ボタンで手動。自動遷移は行わない。
    } catch (err: unknown) {
      // 既にサーバ側で受理済みなら成功扱い（同じく手動ボタンで次画面へ）
      const isDuplicate =
        isApiClientError(err) && err.code === 'duplicate_submission';
      if (isDuplicate) {
        retryCountRef.current = 0;
        setSubmitStatus('success');
        return;
      }

      if (isApiClientError(err) && isRestartCode(err.code)) {
        setErrorVariant('restart');
      } else if (retryCountRef.current >= MAX_RETRY_COUNT) {
        setErrorVariant('restart');
      } else {
        setErrorVariant('retry');
      }
      setSubmitStatus('error');
    }
  }

  async function handleComplete(data: SorterGameData) {
    setPendingData(data);
    setSubmitStatus('loading');
    bgmRef.current?.pause();
    await submitSorterGame(data);
  }

  async function handleRetry() {
    playSE(SORTER_AUDIO_PATHS.generalSE);
    if (!pendingData) return;
    retryCountRef.current += 1;
    setSubmitStatus('loading');
    await submitSorterGame(pendingData);
  }

  function handleGoTop() {
    playSE(SORTER_AUDIO_PATHS.generalSE);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_id');
    }
    bgmRef.current?.pause();
    router.push('/');
  }

  /** 結果画面の「次のゲームへ ▶」ボタンで次ゲーム（空気読み）に手動遷移する */
  function handleProceedToNext() {
    playSE(SORTER_AUDIO_PATHS.generalSE);
    bgmRef.current?.pause();
    router.push('/games/group-chat');
  }

  // ゲームロジック本体
  const {
    phase,
    onboardingSlideIndex,
    countdownValue,
    packages,
    selectedPackageId,
    remainingTimeMs,
    displayScore,
    lastOutflowAt,
    lastFeedback,
    showSpeedUpBanner,
    isRuleChanged,
    isFrozen,
    isSpeedUp,
    isInGame,
    handlePackageClick,
    handleBinClick,
    handlePackageOutflow,
    handleOnboardingNext,
    handleOnboardingPrev,
    handleOnboardingStart,
  } = useSorterGame({ onComplete: handleComplete });

  // SE を鳴らすラッパー
  const onPrev = () => {
    playSE(SORTER_AUDIO_PATHS.generalSE);
    handleOnboardingPrev();
  };
  const onNext = () => {
    playSE(SORTER_AUDIO_PATHS.generalSE);
    handleOnboardingNext();
  };
  const onStart = () => {
    playSE(SORTER_AUDIO_PATHS.generalSE);
    handleOnboardingStart();
  };

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden py-4"
      style={{
        // ゲーム独自の緑背景（共通ユーティリティ `bg-page-pattern` の黄色とは意図的に別色）
        backgroundColor: SORTER_UI_COLORS.pageBg,
        backgroundImage: 'radial-gradient(circle, #fff 2px, transparent 2px)',
        backgroundSize: '20px 20px',
      }}
    >
      {/* === 上部 HUD: タイトル / 残り時間 / SCORE + 状態バッジ === */}
      <SorterHUD
        remainingTimeMs={remainingTimeMs}
        displayScore={displayScore}
        isFrozen={isFrozen}
        isRuleChanged={isRuleChanged}
        isSpeedUp={isSpeedUp}
      />

      {/* === ベルトと荷物（画面端まで広げる）=== */}
      <div ref={beltContainerRef} className="relative z-0 mt-4 w-full flex-1">
        <Belt isSpeedUp={isSpeedUp} />

        {/* 荷物群（beltWidth が確定してからレンダリング） */}
        {beltWidth > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 pointer-events-auto">
              {packages.map((pkg) => (
                <PackageItem
                  key={pkg.id}
                  pkg={pkg}
                  beltWidth={beltWidth}
                  isSelected={selectedPackageId === pkg.id}
                  onClick={handlePackageClick}
                  onOutflow={handlePackageOutflow}
                />
              ))}
            </div>
          </div>
        )}

        {/* MISS バッジ + ルール変更 / 凍結予告 / 復旧 / 速度 2 倍 のバナー群 */}
        <SorterEventBanner
          phase={phase}
          showSpeedUpBanner={showSpeedUpBanner}
          missBadgeKey={lastOutflowAt}
        />
      </div>

      {/*
        仕分け先。mb-6 で画面下端の fixed タイマーゲージと bin の補助ラベル
        （「特急」「取扱注意」「重量物」）が重ならない余白を確保する。
      */}
      <div className="z-10 mt-4 mb-6 px-4">
        <BinTray
          isFrozen={isFrozen}
          onBinClick={handleBinClick}
          lastFeedback={lastFeedback}
        />
      </div>

      {/* === オンボーディング === */}
      {phase === 'onboarding' && (
        <OnboardingSlides
          slideIndex={onboardingSlideIndex}
          onPrev={onPrev}
          onNext={onNext}
          onStart={onStart}
        />
      )}

      {/* === カウントダウン === */}
      {phase === 'countdown' && (
        <SorterCountdownOverlay countdownValue={countdownValue} />
      )}

      {/* === 結果画面（送信中 → 成功で「次のゲームへ ▶」ボタン表示） === */}
      {phase === 'ended' && submitStatus !== 'error' && (
        <SorterResultOverlay
          submitStatus={submitStatus}
          finalScore={displayScore}
          pendingData={pendingData}
          onProceedToNext={handleProceedToNext}
        />
      )}

      {/* === エラー時の ErrorScreen === */}
      {phase === 'ended' &&
        submitStatus === 'error' &&
        (errorVariant === 'restart' ? (
          <ErrorScreen variant="restart" onGoTop={handleGoTop} />
        ) : (
          <ErrorScreen variant="retry" onRetry={handleRetry} />
        ))}

      {/* === タイマーゲージ（底辺の細いバー、ゲーム本編中のみ表示） === */}
      {isInGame && (
        <div
          aria-hidden
          className="fixed bottom-0 left-0 z-0 h-2 transition-all duration-100"
          style={{
            width: `${(remainingTimeMs / GAME_DURATION_MS) * 100}%`,
            backgroundColor: SORTER_UI_COLORS.danger,
          }}
        />
      )}
    </div>
  );
}
