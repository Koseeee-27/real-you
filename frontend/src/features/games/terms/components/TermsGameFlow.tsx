'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import type {
  TermsGameData,
  PopupStats,
  ScrollEvent,
  TermsErrorEvent,
  TermsPostErrorClick,
  TermsCheckboxEvent,
} from '@/features/games/types';
import { termsGameDataAtom } from '@/stores/games';
import PopupAd from './PopupAd';
import PopupTerms from './PopupTerms';
import ErrorDialog from './ErrorDialog';
import LoadingScreen from '@/components/common/LoadingScreen';
// TODO: バックエンド接続時にコメントアウトを解除する
// import { submitGame } from '@/lib/api';

// ポップアップ広告が表示されるまでの遅延時間（ms）
const POPUP_DELAY_MS = 5_000;
// スクロールイベントの記録間隔（ms）。パフォーマンスのため間引く
const SCROLL_THROTTLE_MS = 200;
// 「最下部まで到達した」と判定するスクロール割合（90%）
const REACHED_BOTTOM_THRESHOLD = 0.9;
// 第5条「読みました」未チェックで同意を試みた際のエラー理由。
// BE 分析（termsGame.ts）が完全一致で判定するため固定値（仕様書「データ構造」準拠）。
const ERROR_REASON_MISSING_READ_CONFIRM = 'missing_read_confirm';
// エラー差し戻しダイアログの表示メッセージ（表示専用。BE 判定は ERROR_REASON_* で行う）
const ERROR_DIALOG_MESSAGE = '「読みました」にチェックを入れてください';
// 「同意しない」押下時に同意を促す案内ダイアログのメッセージ
const DISAGREE_DIALOG_MESSAGE = '先に進むには、規約への同意が必要です';

export default function TermsGameFlow() {
  const router = useRouter();
  const setTermsGameData = useSetAtom(termsGameDataAtom);

  const [checkboxStates, setCheckboxStates] = useState({
    readConfirm: false,
    mailMagazine: true,
    thirdPartyShare: true,
  });
  // 第12条の隠し指示「確認済み」の入力値
  const [hiddenInputValue, setHiddenInputValue] = useState('');
  // ポップアップ広告の表示状態
  const [showPopup, setShowPopup] = useState(false);
  // 利用規約モーダル表示状態（初期で表示）
  const [showTermsModal] = useState(true);
  // エラー差し戻しダイアログの表示状態（二段構え同意プロセスの2段目）
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  // 「同意しない」押下時の同意要求ダイアログの表示状態
  const [showDisagreeDialog, setShowDisagreeDialog] = useState(false);
  // ゲーム完了フラグ（trueで完了画面を表示→次のゲームへ遷移）
  const [isCompleted, setIsCompleted] = useState(false);

  //BGM再生用のref
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  // --- 以下は再レンダリング不要なデータをrefで管理 ---
  // ゲーム開始時刻（totalTime算出用）
  const startTimeRef = useRef(0);
  // スクロール位置+経過時間のログ配列
  const scrollEventsRef = useRef<ScrollEvent[]>([]);
  // 最下部到達フラグ
  const reachedBottomRef = useRef(false);
  // 前回スクロール記録時刻（スロットリング用）
  const lastScrollRecordRef = useRef(0);
  // スクロール領域のDOM参照
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // ポップアップが表示された時刻（timeToClose算出用）。レンダー時にJSXへ渡すためstateで管理
  const [popupAppearedAt, setPopupAppearedAt] = useState(0);
  // ポップアップへの対応データ。
  // 未表示・操作中断（閉じる前に同意/不同意）の場合は null のまま残し、
  // 送信ペイロードから popupStats フィールドを省略する（BE 側で worst 値扱いとなる）。
  const popupStatsRef = useRef<PopupStats | null>(null);
  // 「同意する」ボタンにホバーし始めた時刻
  const agreeHoverStartRef = useRef(0);
  // 各チェックボックスがユーザーによって変更されたかの追跡
  const checkboxChangedRef = useRef({
    readConfirm: false,
    mailMagazine: false,
    thirdPartyShare: false,
  });
  // エラーが一度でも発火したか。afterError 判定と postErrorClicks 記録の起点
  const hasErrorOccurredRef = useRef(false);
  // エラー発火イベントのログ
  const errorEventsRef = useRef<TermsErrorEvent[]>([]);
  // エラー後のクリックストリーム（連打検出用）
  const postErrorClicksRef = useRef<TermsPostErrorClick[]>([]);
  // チェックボックス操作のタイムスタンプログ（afterError フラグ付き）
  const checkboxEventsRef = useRef<TermsCheckboxEvent[]>([]);
  // 「同意しない」を一度でも押したか。最終的に同意で遷移しても finalAction を 'disagree' に確定させる（本音を残す）
  const hasPressedDisagreeRef = useRef(false);

  useEffect(() => {
    const bgm = new Audio('/sounds/start-bgm.mp3');
    bgm.loop = true;
    bgm.volume = 0.3;
    bgmRef.current = bgm;

    const playBGM = () => {
      bgm.play().catch(() => {
        /* 自動再生制限用 */
      });
      window.removeEventListener('click', playBGM);
    };

    window.addEventListener('click', playBGM);

    return () => {
      bgm.pause();
      window.removeEventListener('click', playBGM);
    };
  }, []);

  useEffect(() => {
    startTimeRef.current = Date.now();
    scrollEventsRef.current.push({
      position: 0,
      timestamp: 0,
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPopupAppearedAt(Date.now());
      setShowPopup(true);
    }, POPUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const now = Date.now();
    if (now - lastScrollRecordRef.current < SCROLL_THROTTLE_MS) return;
    lastScrollRecordRef.current = now;

    const elapsed = now - startTimeRef.current;
    const position = container.scrollTop;

    scrollEventsRef.current.push({ position, timestamp: elapsed });

    const scrollRatio =
      position / (container.scrollHeight - container.clientHeight);
    if (scrollRatio >= REACHED_BOTTOM_THRESHOLD) {
      reachedBottomRef.current = true;
    }
  }, []);

  // ゲーム開始からの経過時間（ms）。各種イベントログの timestamp に使う
  const getElapsedMs = useCallback(() => Date.now() - startTimeRef.current, []);

  // エラー発火後のクリックのみ記録する（postErrorClicks は Hawkes 連鎖の対象＝
  // errorEvents 以降のクリックを見るため、エラー前のクリックは記録しない）
  const recordPostErrorClick = useCallback(
    (type: TermsPostErrorClick['type']) => {
      if (!hasErrorOccurredRef.current) return;
      postErrorClicksRef.current.push({ timestamp: getElapsedMs(), type });
    },
    [getElapsedMs]
  );

  const handleCheckboxChange = useCallback(
    (
      key: 'readConfirm' | 'mailMagazine' | 'thirdPartyShare',
      checked: boolean
    ) => {
      const se = new Audio('/sounds/check-box-se.mp3');
      se.volume = 0.4;
      se.play().catch(() => {});
      checkboxChangedRef.current[key] = true;
      setCheckboxStates((prev) => ({ ...prev, [key]: checked }));

      const afterError = hasErrorOccurredRef.current;
      checkboxEventsRef.current.push({
        timestamp: getElapsedMs(),
        target: key,
        newState: { checked, changed: true },
        afterError,
      });
      // エラー後のチェックボックス操作はクリックストリームにも記録する
      if (afterError) recordPostErrorClick('checkbox');
    },
    [getElapsedMs, recordPostErrorClick]
  );

  const handleHiddenInputChange = useCallback((value: string) => {
    setHiddenInputValue(value);
  }, []);

  const handlePopupClose = useCallback(
    (clickCount: number, timeToClose: number, mouseJitter: number) => {
      popupStatsRef.current = { clickCount, timeToClose, mouseJitter };
      setShowPopup(false);
    },
    []
  );

  // モーダル内スクロール領域を親で扱えるようにするためのコールバック
  const setModalScrollRef = useCallback((el: HTMLDivElement | null) => {
    scrollContainerRef.current = el;
  }, []);

  const handleAgreeHoverStart = useCallback(() => {
    if (agreeHoverStartRef.current === 0) {
      agreeHoverStartRef.current = Date.now();
    }
  }, []);

  const getAgreeButtonHoverTimeMs = useCallback(() => {
    if (agreeHoverStartRef.current === 0) return 0;
    return Date.now() - agreeHoverStartRef.current;
  }, []);

  const buildTermsGameData = useCallback(
    (action: 'agree' | 'disagree'): TermsGameData => {
      const totalTime = Math.round(getElapsedMs() / 1000);

      return {
        totalTime,
        finalAction: action,
        reachedBottom: reachedBottomRef.current,
        scrollEvents: scrollEventsRef.current,
        hiddenInput: hiddenInputValue || null,
        checkboxStates: {
          readConfirm: {
            checked: checkboxStates.readConfirm,
            changed: checkboxChangedRef.current.readConfirm,
          },
          mailMagazine: {
            checked: checkboxStates.mailMagazine,
            changed: checkboxChangedRef.current.mailMagazine,
          },
          thirdPartyShare: {
            checked: checkboxStates.thirdPartyShare,
            changed: checkboxChangedRef.current.thirdPartyShare,
          },
        },
        // null の場合はフィールド自体を未送信にする（JSON.stringify が undefined を省略）。
        popupStats: popupStatsRef.current ?? undefined,
        agreeButtonHoverTimeMs: getAgreeButtonHoverTimeMs(),
        // 空配列のときはフィールドを省略する（popupStats と同方針: データがあるときのみ送る）。
        errorEvents:
          errorEventsRef.current.length > 0
            ? errorEventsRef.current
            : undefined,
        postErrorClicks:
          postErrorClicksRef.current.length > 0
            ? postErrorClicksRef.current
            : undefined,
        checkboxEvents:
          checkboxEventsRef.current.length > 0
            ? checkboxEventsRef.current
            : undefined,
      };
    },
    [hiddenInputValue, checkboxStates, getAgreeButtonHoverTimeMs, getElapsedMs]
  );

  const handleAction = useCallback(
    (action: 'agree' | 'disagree') => {
      const se = new Audio('/sounds/general-button-se.mp3');
      se.play().catch(() => {});

      // 「同意しない」: 遷移せず、押した事実を保持して同意を促す案内ダイアログを表示。
      // 一度でも押されたら finalAction は最終的に 'disagree' に確定する（後述の遷移処理参照）。
      if (action === 'disagree') {
        hasPressedDisagreeRef.current = true;
        setShowDisagreeDialog(true);
        return;
      }

      // 二段構えの2段目: 同意時に第5条「読みました」が未チェックならエラー差し戻し。
      // （ここに来る時点で action === 'agree' は確定）
      if (!checkboxStates.readConfirm) {
        // 2回目以降の無効な同意クリックは連打として記録する
        // （初回はこの時点で hasError=false のため recordPostErrorClick は記録しない）。
        recordPostErrorClick('agree');
        errorEventsRef.current.push({
          timestamp: getElapsedMs(),
          reason: ERROR_REASON_MISSING_READ_CONFIRM,
          scrollPositionAtError: scrollContainerRef.current?.scrollTop ?? 0,
        });
        hasErrorOccurredRef.current = true;
        setShowErrorDialog(true);
        return;
      }

      // 遷移は「同意する」かつ第5条チェック済みのときのみ。
      // 一度でも「同意しない」を押していれば、翻意して同意しても本音として 'disagree' を残す。
      const finalAction = hasPressedDisagreeRef.current ? 'disagree' : 'agree';
      const data = buildTermsGameData(finalAction);
      setTermsGameData(data);

      setIsCompleted(true);

      if (bgmRef.current) {
        bgmRef.current.pause();
      }

      setTimeout(() => {
        router.push('/diagnosis');
      }, 2000);
    },
    [
      checkboxStates.readConfirm,
      recordPostErrorClick,
      getElapsedMs,
      buildTermsGameData,
      setTermsGameData,
      router,
    ]
  );

  if (isCompleted) {
    return <LoadingScreen message="MBTI診断へ移動中..." />;
  }

  return (
    <div className="bg-page-pattern flex h-screen flex-col">
      <div className="flex-1" />

      {showPopup && (
        <PopupAd onClose={handlePopupClose} appearedAt={popupAppearedAt} />
      )}

      {showTermsModal && (
        <PopupTerms
          onCheckboxChange={handleCheckboxChange}
          onHiddenInputChange={handleHiddenInputChange}
          checkboxStates={checkboxStates}
          hiddenInputValue={hiddenInputValue}
          setScrollContainerRef={setModalScrollRef}
          onScroll={handleScroll}
          onAction={handleAction}
          onAgreeHoverStart={handleAgreeHoverStart}
        />
      )}

      {showErrorDialog && (
        <ErrorDialog
          message={ERROR_DIALOG_MESSAGE}
          onConfirm={() => {
            recordPostErrorClick('errorDialog');
            setShowErrorDialog(false);
          }}
          onDialogClick={() => recordPostErrorClick('errorDialog')}
          onOverlayClick={() => recordPostErrorClick('other')}
        />
      )}

      {showDisagreeDialog && (
        <ErrorDialog
          message={DISAGREE_DIALOG_MESSAGE}
          onConfirm={() => setShowDisagreeDialog(false)}
        />
      )}
    </div>
  );
}
