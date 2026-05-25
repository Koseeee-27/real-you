'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import ErrorScreen from '@/components/common/ErrorScreen';
import type { PackageType, SorterGameData } from '@/features/games/types';
import { submitGame } from '@/lib/api';
import {
  MAX_RETRY_COUNT,
  isApiClientError,
  isRestartCode,
} from '@/lib/api/error';
import {
  SORTER_AUDIO_PATHS,
  SORTER_UI_COLORS,
  TIME_CAP_MS,
} from '../data/sorterConstants';
import { useSorterGame } from '../hooks/useSorterGame';
import Belt from './Belt';
import BinTray from './BinTray';
import OnboardingSlides from './OnboardingSlides';
import PackageItem from './PackageItem';
import SorterCountdownOverlay from './SorterCountdownOverlay';
import SorterEventBanner from './SorterEventBanner';
import SorterHUD from './SorterHUD';
import SorterMissBadge from './SorterMissBadge';
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
 *   - `duplicate_submission` は `success` と同じ扱い（結果画面のボタン押下で次画面へ）
 *   - 成功時は結果画面 + 「次のゲームへ ▶」ボタン → 押下で `/games/group-chat` へ遷移
 *
 * UI 構成は以下のサブコンポーネントに分割:
 *   - `SorterHUD`              … タイトル / 残り時間 / SCORE + 状態バッジ列
 *   - `Belt` + `PackageItem`   … U 字経路ベルトと荷物
 *   - `BinTray`                … 3 つの仕分け先
 *   - `SorterEventBanner`      … 危機感オーバーレイ / ルール変更 / 凍結予告 / 復旧 / 速度 2 倍
 *   - `SorterMissBadge`        … 流出時の MISS バッジ（流出口基準）
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
    outcome,
    onboardingSlideIndex,
    countdownValue,
    packages,
    selectedPackageId,
    elapsedTimeMs,
    displayScore,
    lastOutflowAt,
    lastFeedback,
    showRuleChangeNotice,
    showSpeedUpBanner,
    freezeStage,
    isRuleChanged,
    isFrozen,
    isSpeedUp,
    isInGame,
    handlePackageClick,
    handleBinClick,
    handlePackageGrab,
    handlePackageDrop,
    handlePackageOutflow,
    handleOnboardingNext,
    handleOnboardingPrev,
    handleOnboardingStart,
  } = useSorterGame({ onComplete: handleComplete });

  // SE を鳴らすラッパー（オンボーディング操作）
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

  // SE を鳴らすラッパー（ゲーム本編操作）。
  // 「実際に選択 / 仕分けが起きるとき」だけ鳴らす。
  // 同じ荷物の再クリック（選択解除）や frozen 中のパニッククリックでは鳴らさない。
  const onPackageClick = (id: number) => {
    // 新しく選択するときだけ SE。再クリック（解除）・凍結中は鳴らさない。
    if (!isFrozen && selectedPackageId !== id) {
      playSE(SORTER_AUDIO_PATHS.generalSE);
    }
    handlePackageClick(id);
  };
  const onBinClick = (binType: PackageType) => {
    // 荷物を選択した状態で仕分けが実行されるときだけ SE。
    // bin の空打ち（未選択）・凍結中は鳴らさない。
    if (!isFrozen && selectedPackageId != null) {
      playSE(SORTER_AUDIO_PATHS.generalSE);
    }
    handleBinClick(binType);
  };

  // SE を鳴らすラッパー（D&D 操作）。
  // 掴んだとき（新規選択）に SE。凍結中・既に同じ荷物を掴んでいる場合は鳴らさない。
  const onPackageGrab = (id: number) => {
    if (!isFrozen && selectedPackageId !== id) {
      playSE(SORTER_AUDIO_PATHS.generalSE);
    }
    handlePackageGrab(id);
  };
  // ドロップ確定。振り分け先に入れたとき（仕分け実行）だけ SE。
  // 取り消し（binType=null）・凍結中は鳴らさない。
  const onPackageDrop = (id: number, binType: PackageType | null) => {
    if (!isFrozen && binType != null) {
      playSE(SORTER_AUDIO_PATHS.generalSE);
    }
    handlePackageDrop(id, binType);
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
      {/* === 上部 HUD: タイトル / 目標スコア進捗バー / 上限タイマー（控えめ） + 状態バッジ === */}
      <SorterHUD
        displayScore={displayScore}
        elapsedTimeMs={elapsedTimeMs}
        isFrozen={isFrozen}
        isRuleChanged={isRuleChanged}
        isSpeedUp={isSpeedUp}
      />

      {/*
        === 盤面ラッパー（ベルト + 仕分け先を包む relative コンテナ）===
        危機感オーバーレイ（SorterEventBanner 内）をこのラッパー直下に absolute inset-0 で
        重ねることで、上段のベルトだけでなく下段の bin エリアまで「やばい感」を覆える。
        HUD は外に置いたままにして、タイマー / スコアの可読性を最優先する。
        flex-1 でこのラッパーが HUD と下部余白の間を縦いっぱいに占める。
        z-0 で stacking context を確立し、内部の z-20（EventBanner）が HUD など外側に漏れないよう閉じ込める。
      */}
      <div className="relative z-0 mt-4 flex flex-1 flex-col">
        {/* === ベルトと荷物（画面端まで広げる）=== */}
        <div ref={beltContainerRef} className="relative z-0 w-full flex-1">
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
                    isFrozen={isFrozen}
                    onClick={onPackageClick}
                    onGrab={onPackageGrab}
                    onDrop={onPackageDrop}
                    onOutflow={handlePackageOutflow}
                  />
                ))}
              </div>
            </div>
          )}

          {/* MISS バッジ（流出口=ベルト左下基準のためベルトコンテナ内に置く） */}
          <SorterMissBadge missBadgeKey={lastOutflowAt} />
        </div>

        {/*
          仕分け先。mb-6 で画面下端の fixed タイマーゲージと bin の補助ラベル
          （「特急」「取扱注意」「重量物」）が重ならない余白を確保する。
          relative を付けて positioned 要素にすることで z-10 を有効化し、bin の
          重なり順を明示的に制御する（static のままだと z-10 は効かない）。
        */}
        <div className="relative z-10 mt-4 mb-6 px-4">
          <BinTray
            isFrozen={isFrozen}
            onBinClick={onBinClick}
            lastFeedback={lastFeedback}
          />
        </div>

        {/*
          危機感オーバーレイ + 上部イベントバナー群（ルール変更 / 凍結予告 / 復旧 / 速度 2 倍）。
          盤面ラッパー全体（ベルト + bin）を覆い、bin エリアまで赤暗く染める。
          z-20 で BinTray（relative z-10）より前面。bin を relative z-10 にしてあるため
          この z 比較が成立する。内部で danger-overlay < バナーの重なりを保つ。
        */}
        <SorterEventBanner
          freezeStage={freezeStage}
          showRuleChangeNotice={showRuleChangeNotice}
          showSpeedUpBanner={showSpeedUpBanner}
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
          outcome={outcome}
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

      {/*
        === 上限タイマーゲージ（底辺の細いバー、控えめ表示） ===
        勝敗の主軸は目標スコア進捗（HUD）なので、上限 60 秒は底辺の細いバーで
        「残り時間」を控えめに示すに留める（playtest で見せ方は調整）。
      */}
      {isInGame && (
        <div
          aria-hidden
          className="fixed bottom-0 left-0 z-0 h-1 transition-all duration-100"
          style={{
            width: `${Math.max(0, 100 - (elapsedTimeMs / TIME_CAP_MS) * 100)}%`,
            backgroundColor: SORTER_UI_COLORS.danger,
          }}
        />
      )}
    </div>
  );
}
