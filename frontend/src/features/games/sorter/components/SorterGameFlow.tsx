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
import { useBgmOverride } from '@/components/audio/useBgmOverride';
import type { BgmKey } from '@/components/audio/audioManifest';
import { SORTER_AUDIO_PATHS, SORTER_UI_COLORS } from '../data/sorterConstants';
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
 *   - `SorterHUD`              … 状態バッジ群（左）/ タイマー pill（中央）/ SCORE パネル（右）
 *   - `Belt` + `PackageItem`   … U 字経路ベルトと荷物
 *   - `BinTray`                … 3 つの仕分け先
 *   - `SorterEventBanner`      … 危機感オーバーレイ / ルール変更 / 凍結予告 / 復旧 / 速度 2 倍
 *   - `SorterMissBadge`        … 流出時の MISS バッジ（流出口基準）
 *   - `OnboardingSlides`       … 開始前 2 スライド
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

  // ベルトコンテナの実測幅。PackageItem の U 字経路アニメに渡す
  const beltContainerRef = useRef<HTMLDivElement | null>(null);
  const [beltWidth, setBeltWidth] = useState(0);

  /**
   * 現在ドラッグ中の荷物 ID 集合。
   * belt レイヤーと BinTray は別 stacking context（belt: z-0 / BinTray: z-10）に分かれており、
   * 荷物側でいくら z を上げても belt コンテナ（z-0）が BinTray（z-10）の背面に沈むため、
   * 荷物を bin まで運ぶと bin の背面に隠れてしまう。これを防ぐため、ドラッグ中だけ
   * belt レイヤー自体を BinTray より前面（z-30）に引き上げる。
   * 単一ポインタ前提だが、取り残し防止のため Set で出入りを管理し、空になったら通常 z に戻す。
   */
  const [draggingPackageIds, setDraggingPackageIds] = useState<Set<number>>(
    () => new Set()
  );

  const handlePackageDragStateChange = (id: number, dragging: boolean) => {
    setDraggingPackageIds((prev) => {
      // 状態が変わらないなら同じ参照を返して不要な再 render を避ける
      if (dragging === prev.has(id)) return prev;
      const next = new Set(prev);
      if (dragging) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  /**
   * ドラッグ中、ポインタ直下の仕分け先（bin）種別。bin 外なら null。
   * PackageItem の pointermove から通知され、BinTray に渡して該当 bin をハイライトする。
   * 「ここでドロップできる」を視覚的に示すための一時状態。
   */
  const [hoveredBinType, setHoveredBinType] = useState<PackageType | null>(
    null
  );

  const handleHoverBinChange = (binType: PackageType | null) => {
    // 同じ種別なら再 render を避ける
    setHoveredBinType((prev) => (prev === binType ? prev : binType));
  };

  function playSE(path: string) {
    const audio = new Audio(path);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  }

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
    router.push('/');
  }

  /** 結果画面の「次のゲームへ ▶」ボタンで次ゲーム（空気読み）に手動遷移する */
  function handleProceedToNext() {
    playSE(SORTER_AUDIO_PATHS.generalSE);
    router.push('/games/group-chat');
  }

  // ゲームロジック本体
  const {
    phase,
    outcome,
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
    ruleGuideBinType,
    isRuleChanged,
    isFrozen,
    isSpeedUp,
    handlePackageClick,
    handleBinClick,
    handlePackageGrab,
    handlePackageDrop,
    handlePackageOutflow,
    handleOnboardingStart,
  } = useSorterGame({ onComplete: handleComplete });

  // 「いま鳴らすべき BGM」を phase / isFrozen / isSpeedUp から決めて共通基盤に宣言する。
  // 優先順位:
  //   - オンボーディング〜カウントダウン中 … 共通 BGM（トップページ等と同じ start）
  //   - 終了（ended）                       … 無音（結果表示中は BGM を流さない）
  //   - プレイ中の機械停止（isFrozen）      … 停止 BGM
  //   - プレイ中の速度2倍（isSpeedUp）      … 2倍速 BGM
  //   - プレイ中のそれ以外                  … 通常 BGM
  // 再生・切替・自動再生制限の解除は AudioController が担う。
  const bgmKey: BgmKey | null =
    phase === 'onboarding' || phase === 'countdown'
      ? 'start'
      : phase === 'ended'
        ? null
        : isFrozen
          ? 'sorterFreeze'
          : isSpeedUp
            ? 'sorterSpeedUp'
            : 'sorterNormal';
  useBgmOverride(bgmKey);

  /**
   * belt レイヤーを前面化（z-30）すべきか。
   * ドラッグ中の荷物が 1 つでもあり、かつ機械停止中でないとき。
   * 機械停止突入時は D&D 無効化のため前面化を解除する（指を押したまま frozen に入った
   * ケースでも belt を通常 z に戻し、凍結演出より荷物が前に出ないようにする）。
   */
  const shouldLiftBelt = draggingPackageIds.size > 0 && !isFrozen;

  // SE を鳴らすラッパー（オンボーディング完了 = スタートボタン）。
  // 戻る / 次へボタンは共通 `SlideModal` 側の実装に乗せたため、現状 SE は鳴らない
  // （`SlideModal` に SE フックの口が無いため、意図的な regression として受け入れる）。
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
  // フック側の返り値（荷物が除去されたか）をそのまま PackageItem に返す。
  // 握り潰すと PackageItem 側で「未除去なら流れに戻す」判定ができず取り残しが起きるため、必ず return する。
  const onPackageDrop = (id: number, binType: PackageType | null): boolean => {
    if (!isFrozen && binType != null) {
      playSE(SORTER_AUDIO_PATHS.generalSE);
    }
    return handlePackageDrop(id, binType);
  };

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden px-4 pt-2 pb-4 sm:px-6"
      style={{
        // ゲーム独自の緑背景（共通ユーティリティ `bg-page-pattern` の黄色とは意図的に別色）
        backgroundColor: SORTER_UI_COLORS.pageBg,
        backgroundImage: 'radial-gradient(circle, #fff 2px, transparent 2px)',
        backgroundSize: '20px 20px',
      }}
    >
      {/*
        === 上部 HUD（固定高さ 88px + 絶対配置レイヤー）===
        左に状態バッジ群（強調・出現アニメ + 継続パルス）、中央にタイマー（pill 形、警告時に発光 + pulse）、
        右に SCORE パネル（数値主役で進捗を直感化）。
        ルートの物理高さはバッジ数に依らず 88px 固定（SorterHUD 側で h-[88px] + 絶対配置）。
        これにより下のベルト位置がバッジの 0/1/2 変化に影響されない
        （「バッジ複数表示時にベルトが押し下げられる」事象を構造的に防ぐ）。
        タイトル枠は廃止し、上余白も詰めて盤面を上に寄せる。
      */}
      <SorterHUD
        displayScore={displayScore}
        elapsedTimeMs={elapsedTimeMs}
        isFrozen={isFrozen}
        isRuleChanged={isRuleChanged}
        isSpeedUp={isSpeedUp}
      />

      {/*
        === 盤面ラッパー（ベルト + 仕分けエリア [BinTray] を包む relative コンテナ）===
        危機感オーバーレイ（SorterEventBanner 内）をこのラッパー直下に absolute inset-0 で
        重ねることで、上段のベルトだけでなく下段の bin エリアまで「やばい感」を覆える。
        HUD は外に置いたままにして、タイマー / スコアの可読性を最優先する。
        flex-1 でこのラッパーが HUD と下部余白の間を縦いっぱいに占める。
        z-0 で stacking context を確立し、内部の z-20（EventBanner）が HUD など外側に漏れないよう閉じ込める。

        縦配分（上から詰める）:
          ベルト（内容高 = BELT_HEIGHT_PX、shrink-0）
            → 伸縮スペーサー（flex-1）で余白を仕分けエリアの手前に集約
            → 仕分けエリア（BinTray、shrink-0）
      */}
      <div className="relative z-0 mt-3 flex flex-1 flex-col">
        {/*
          === ベルトと荷物（画面端まで広げる）===
          通常は z-0。ドラッグ中だけ z-30 に引き上げ、運んでいる荷物が BinTray（z-10）の
          前面に出るようにする（belt と BinTray は別 stacking context のため、荷物単体の
          z 引き上げでは bin を越えられない）。ドロップ / 取り消し / 中断 / 凍結突入で
          ドラッグ集合が空になれば z-0 に戻る。
          shrink-0 で内容高（BELT_HEIGHT_PX）を保ち、余白は下の spacer に逃がす。
        */}
        <div
          ref={beltContainerRef}
          className={`relative w-full shrink-0 ${
            shouldLiftBelt ? 'z-30' : 'z-0'
          }`}
        >
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
                    onDragStateChange={handlePackageDragStateChange}
                    onHoverBinChange={handleHoverBinChange}
                  />
                ))}
              </div>
            </div>
          )}

          {/* MISS バッジ（流出口=ベルト左下基準のためベルトコンテナ内に置く） */}
          <SorterMissBadge missBadgeKey={lastOutflowAt} />
        </div>

        {/*
          伸縮スペーサー。ベルトと仕分けエリアの間の余白を集約し、仕分けエリアを下寄せにする。
          これによりベルト直下の余白を吸収しつつ、bin が画面下部に安定して配置される。
        */}
        <div className="min-h-0 flex-1" aria-hidden />

        {/*
          === 仕分けエリア（BinTray のみ）===
          mb-4 で画面下端と bin の補助ラベル（「特急」「取扱注意」「重量物」）が
          詰まりすぎない余白を確保。relative + z-10 で BinTray の重なり順を確保する
          （static だと z-10 が効かない）。
          ルール凡例はユーザー判断で削除（HUD のバッジで「ルール変更中: 特急 → 重量物」が
          表示されるため、常時表示の凡例は冗長）。
        */}
        <div className="relative z-10 mb-4 shrink-0">
          <BinTray
            isFrozen={isFrozen}
            onBinClick={onBinClick}
            lastFeedback={lastFeedback}
            // 機械停止中はドロップ操作が無効なのでハイライトも出さない
            hoveredBinType={isFrozen ? null : hoveredBinType}
            // 機械停止中は bin が操作不能なので誤投入ガイドも出さない
            guideBinType={isFrozen ? null : ruleGuideBinType}
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
      <OnboardingSlides open={phase === 'onboarding'} onStart={onStart} />

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
    </div>
  );
}
