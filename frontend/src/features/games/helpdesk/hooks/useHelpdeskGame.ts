'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Game2Data,
  Game2Turn,
  TextInputMetrics,
} from '@/features/games/types';
import {
  GAME_TOPIC,
  INSTRUCTION_TEXT,
  MAX_TURNS,
  SUPPORT_RESPONSES,
  TURN_TIME_LIMIT_MS,
} from '../data/supportResponses';
import type { AudioMetricsResult } from './useAudioMetrics';
import { useAudioMetrics } from './useAudioMetrics';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useTypingMetrics } from './useTypingMetrics';

/**
 * ゲームの進行状態。
 *
 * instruction      → 開始前の指示ポップアップ表示中
 * support-speaking → サポート担当の発言をチャットに追加中
 * user-input       → ユーザーの音声/テキスト入力待ち（20秒タイマー稼働）
 * submitting       → 全ラリー完了、Game2Data を組み立てて onComplete に渡す
 * completed        → 送信完了、次の画面への遷移待ち
 * error            → エラー発生（将来の API 連携用）
 */
export type GamePhase =
  | 'instruction'
  | 'support-speaking'
  | 'user-input'
  | 'submitting'
  | 'completed'
  | 'error';

/** チャットタイムラインに表示する1件のメッセージ */
export interface ChatMessage {
  role: 'support' | 'user';
  text: string;
}

/**
 * Game 2（カスタマーサポートチャット）全体のステート管理フック。
 *
 * useSpeechRecognition / useAudioMetrics / useTypingMetrics を統合し、
 * 以下のフローを制御する:
 *
 *   instruction → support-speaking ⇄ user-input （3ラリー） → submitting → completed
 *
 * 音声入力時は 20 秒で自動終了、テキスト入力時は送信ボタンで終了。
 */
export function useHelpdeskGame(options: {
  onComplete: (data: Game2Data) => void;
}) {
  const { onComplete } = options;

  // --- UI に直接反映するステート ---
  const [inputMethod, setInputMethod] = useState<'voice' | 'text'>('voice');
  const [currentTurn, setCurrentTurn] = useState(0); // 0〜2（3ラリー）
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]); // 表示用メッセージ履歴
  const [turns, setTurns] = useState<Game2Turn[]>([]); // 収集データ用ターンログ
  const [gamePhase, setGamePhase] = useState<GamePhase>('instruction');
  const [remainingTimeMs, setRemainingTimeMs] = useState(TURN_TIME_LIMIT_MS);

  // --- 再レンダリング不要なデータを ref で管理 ---
  const inputMethodRef = useRef(inputMethod);
  const timerIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingAudioMetricsRef = useRef<AudioMetricsResult | null>(null); // 録音停止〜onResult の間に一時保持
  const typingVariancesRef = useRef<number[]>([]); // テキスト入力ターンごとの分散を蓄積
  const skipNextVoiceResultRef = useRef(false); // テキスト切替時に onResult を無視するフラグ
  const submittedRef = useRef(false); // buildAndSubmit の二重実行防止

  // --- 子フック ---
  const { startRecording, stopRecording } = useAudioMetrics();
  const {
    onKeyDown,
    getVarianceAndReset,
    reset: resetTyping,
  } = useTypingMetrics();

  // =========================================================
  // ターン進行
  // =========================================================

  /**
   * ユーザーの1ターンが完了したあとに呼ばれる。
   * 次のターンがあれば support-speaking へ、最終ターンなら submitting へ遷移。
   */
  const advanceAfterUserTurn = useCallback(() => {
    setCurrentTurn((prev) => {
      const nextTurn = prev + 1;
      if (nextTurn >= MAX_TURNS) {
        setGamePhase('submitting');
      } else {
        const supportText = SUPPORT_RESPONSES[nextTurn];
        setChatHistory((prevChat) => [
          ...prevChat,
          { role: 'support', text: supportText },
        ]);
        setGamePhase('support-speaking');
        setRemainingTimeMs(TURN_TIME_LIMIT_MS);
      }
      return nextTurn;
    });
  }, []);

  // =========================================================
  // 音声入力の結果ハンドラ
  // =========================================================

  /**
   * useSpeechRecognition の onResult コールバック。
   * 録音が stop() されると、蓄積されたテキストがここに渡される。
   *
   * 1. pendingAudioMetricsRef から音声メトリクスを取り出す
   * 2. turns / chatHistory に追加
   * 3. advanceAfterUserTurn() で次フェーズへ
   *
   * テキスト入力へ切り替えた場合は skipNextVoiceResultRef で無視する。
   */
  const handleVoiceResult = useCallback(
    (transcribedText: string) => {
      if (skipNextVoiceResultRef.current) {
        skipNextVoiceResultRef.current = false;
        pendingAudioMetricsRef.current = null;
        return;
      }
      const metrics = pendingAudioMetricsRef.current;
      setTurns((prev) => {
        const turnIndex = prev.length + 1;
        return [
          ...prev,
          {
            turnIndex,
            inputMethod: 'voice',
            reactionTimeMs: metrics?.reactionTimeMs ?? null,
            speechDurationMs: metrics?.speechDurationMs ?? null,
            silenceDurationMs: metrics?.silenceDurationMs ?? null,
            volumeDb: metrics?.volumeDb ?? null,
            transcribedText: transcribedText || '(無音)',
          },
        ];
      });
      setChatHistory((prev) => [
        ...prev,
        { role: 'user', text: transcribedText || '(無音)' },
      ]);
      pendingAudioMetricsRef.current = null;
      advanceAfterUserTurn();
    },
    [advanceAfterUserTurn]
  );

  const speech = useSpeechRecognition({
    onResult: handleVoiceResult,
  });
  // エフェクトの依存配列で speech.xxx を使うと lint が speech 全体を要求するため展開
  const speechStart = speech.start;
  const speechStop = speech.stop;
  const speechAbort = speech.abort;

  // =========================================================
  // ゲーム終了 → Game2Data 組み立て
  // =========================================================

  // ステートの最新値をエフェクト外から参照するための ref
  const turnsRef = useRef(turns);
  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);
  useEffect(() => {
    inputMethodRef.current = inputMethod;
  }, [inputMethod]);

  /**
   * 全ターンのデータを Game2Data にまとめて onComplete へ渡す。
   * onComplete は副作用なのでアップデータ関数の外で呼ぶ
   * （Strict Mode でアップデータが2回呼ばれても副作用は1回だけにする）。
   */
  const buildAndSubmit = useCallback(() => {
    const currentTurns = turnsRef.current;
    const hasTextTurn = currentTurns.some((t) => t.inputMethod === 'text');
    const textInputMetrics: TextInputMetrics | null = hasTextTurn
      ? {
          typingIntervalVariance:
            typingVariancesRef.current.length > 0
              ? typingVariancesRef.current.reduce((a, b) => a + b, 0) /
                typingVariancesRef.current.length
              : 0,
        }
      : null;
    const game2Data: Game2Data = {
      inputMethod: inputMethodRef.current,
      turnCount: currentTurns.length,
      turns: currentTurns,
      textInputMetrics,
    };
    onComplete(game2Data);
    setGamePhase('completed');
  }, [onComplete]);

  /** gamePhase が submitting になったら一度だけ buildAndSubmit を実行 */
  useEffect(() => {
    if (gamePhase === 'submitting' && !submittedRef.current) {
      submittedRef.current = true;
      queueMicrotask(buildAndSubmit);
    }
  }, [gamePhase, buildAndSubmit]);

  // =========================================================
  // 全リソースクリーンアップ（ゲーム終了時 & アンマウント時）
  // =========================================================

  useEffect(() => {
    return () => {
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
      speechAbort();
      stopRecording();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [speechAbort, stopRecording]);

  // =========================================================
  // サポート担当の TTS 読み上げ → user-input へ遷移
  // =========================================================

  // チャット履歴への追加は advanceAfterUserTurn / startGame 側で実施済み。
  // このエフェクトは TTS（外部システム）へのサブスクリプションのみ行う。
  //
  // TODO: バックエンド接続時に POST /api/voice/respond を呼び出し、
  // ユーザー発言 + 会話履歴を送信して AI 生成応答を取得する。
  // 現在は SUPPORT_RESPONSES のハードコードで代替。
  useEffect(() => {
    if (gamePhase !== 'support-speaking') return;
    const supportText = SUPPORT_RESPONSES[currentTurn];

    let cancelled = false;
    let fallbackId = 0;

    const transitionToInput = () => {
      if (!cancelled) {
        setGamePhase('user-input');
        setRemainingTimeMs(TURN_TIME_LIMIT_MS);
      }
    };

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(supportText);
      utterance.lang = 'ja-JP';
      utterance.rate = 1.1;
      utterance.onend = transitionToInput;
      utterance.onerror = transitionToInput;
      window.speechSynthesis.speak(utterance);
    } else {
      // TTS 非対応: 次フレームで非同期遷移
      fallbackId = requestAnimationFrame(transitionToInput);
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(fallbackId);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [gamePhase, currentTurn]);

  // =========================================================
  // user-input フェーズ: 録音開始 & 20秒タイマー
  // =========================================================

  /**
   * 音声モードの場合:
   *   1. useAudioMetrics.startRecording() でマイク取得 & 計測開始
   *   2. useSpeechRecognition.start() で音声認識開始
   *   3. 100ms 間隔のタイマーでカウントダウン。0 になったら自動で録音停止
   *   4. 録音停止 → speech.onend → handleVoiceResult でターン記録
   *
   * テキストモードの場合:
   *   タイマー不要（自動終了なし）。
   */
  useEffect(() => {
    if (gamePhase !== 'user-input') return;
    if (inputMethod !== 'voice') return;

    const run = async () => {
      const ok = await startRecording();
      if (ok) {
        speechStart();
      } else {
        setInputMethod('text');
      }
    };
    run();

    // 20秒カウントダウン（音声のみ時間切れで自動終了）
    const start = Date.now();
    timerIdRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, TURN_TIME_LIMIT_MS - elapsed);
      setRemainingTimeMs(remaining);
      if (remaining <= 0 && timerIdRef.current) {
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
        // 時間切れ → 録音停止（メトリクスを保存、speech.onend → handleVoiceResult へ）
        speechStop();
        pendingAudioMetricsRef.current = stopRecording();
      }
    }, 100);

    // クリーンアップ: フェーズが変わったらタイマー・録音・認識をすべて停止
    return () => {
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
      speechAbort();
      stopRecording();
    };
  }, [
    gamePhase,
    inputMethod,
    startRecording,
    stopRecording,
    speechStart,
    speechStop,
    speechAbort,
  ]);

  // =========================================================
  // ユーザー操作ハンドラ
  // =========================================================

  /** 音声入力中にユーザーが手動で「送信」を押した場合 */
  const endVoiceTurnManually = useCallback(() => {
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
    speechStop();
    pendingAudioMetricsRef.current = stopRecording();
  }, [speechStop, stopRecording]);

  /**
   * テキスト入力のターンを送信する。
   * タイピング分散を計測して記録し、ターンデータを追加して次フェーズへ。
   */
  const submitTextTurn = useCallback(
    (text: string) => {
      const variance = getVarianceAndReset();
      typingVariancesRef.current.push(variance);
      setTurns((prev) => {
        const turnIndex = prev.length + 1;
        return [
          ...prev,
          {
            turnIndex,
            inputMethod: 'text',
            reactionTimeMs: null,
            speechDurationMs: null,
            silenceDurationMs: null,
            volumeDb: null,
            transcribedText: text.trim() || '(未入力)',
          },
        ];
      });
      setChatHistory((prev) => [
        ...prev,
        { role: 'user', text: text.trim() || '(未入力)' },
      ]);
      advanceAfterUserTurn();
    },
    [getVarianceAndReset, advanceAfterUserTurn]
  );

  /** 指示ポップアップから「相談を始める」を押したとき */
  const startGame = useCallback(() => {
    if (gamePhase !== 'instruction') return;
    const supportText = SUPPORT_RESPONSES[0];
    setChatHistory((prev) => [...prev, { role: 'support', text: supportText }]);
    setGamePhase('support-speaking');
  }, [gamePhase]);

  /**
   * 音声 → テキスト入力に切り替える。
   * 録音中であれば停止し、その結果は skipNextVoiceResultRef で無視する。
   */
  const switchToText = useCallback(() => {
    if (inputMethod === 'text') return;
    if (gamePhase === 'user-input' && speech.isListening) {
      skipNextVoiceResultRef.current = true;
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
      speechStop();
      pendingAudioMetricsRef.current = stopRecording();
    }
    setInputMethod('text');
  }, [inputMethod, gamePhase, speech.isListening, speechStop, stopRecording]);

  // =========================================================
  // 外部に公開する値・関数
  // =========================================================

  return {
    gameTopic: GAME_TOPIC,
    instructionText: INSTRUCTION_TEXT,
    inputMethod,
    setInputMethod,
    currentTurn,
    chatHistory,
    turns,
    gamePhase,
    remainingTimeMs,
    turnTimeLimitMs: TURN_TIME_LIMIT_MS,
    maxTurns: MAX_TURNS,
    speech,
    startGame,
    endVoiceTurnManually,
    submitTextTurn,
    switchToText,
    onKeyDown,
    resetTyping,
    isVoiceSupported: speech.isSupported,
  };
}
