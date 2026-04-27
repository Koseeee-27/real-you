import { BaselineScores } from '../types';
import { Game1Data, Game2Data, Game3Data } from '../schemas/gameData';
import { generateFeedback } from './feedbackGenerator';
import { buildPhaseSummaries } from "./phaseSummaryBuilder";

/**
 * 各 calculateGameN の戻り値型。
 *
 * 早期 return（data が undefined のとき）と通常 return の shape が一致することを
 * TypeScript で検出可能にするため、ローカル type として明示する。
 *
 * 命名は `details.metrics` 等に出す統計量（changedCount / averageSpeed 等）を含む点で
 * 5 軸スコアそのものではなく「ゲームごとの中間集計」を表す。
 */
type Game1Result = {
    caution: number;
    logic: number;
    calmness: number;
    changedCount: number;
    averageSpeed: number;
    reversalCount: number;
};

type Game2Result = {
    positivity: number;
    calmness: number;
    logic: number;
    avgReact: number;
    totalSpeech: number;
    avgVolume: number;
    logicWordsCount: number;
};

type Game3Result = {
    cooperativeness: number;
    positivity: number;
    caution: number;
    conformCount: number;
    avgReact: number;
};

/**
 * 作成日: 2026-02-20
 * 作成者: たまちゃ
 * 説明:
 * 3ゲームの行動データから5軸特性を連続値(0-100)で算出する統合分析ロジック。
 *
 * ▼評価軸定義
 * 慎重さ(caution):
 *   情報確認・迷い時間・再確認行動の多さから算出。
 *
 * 冷静さ(calmness):
 *   マウスのブレ、無駄操作、音量安定性、打鍵安定性から算出。
 *
 * 論理性(logic):
 *   再確認行動、論理接続詞使用、不要語の少なさから算出。
 *
 * 協調性(cooperativeness):
 *   同調率、譲り待機時間、本音葛藤行動から算出。
 *
 * 積極性(positivity):
 *   反応速度、発話量、即応性から算出。
 */

//共通ユーティリティ
const safeScore = (v: number) =>
  Math.min(100, Math.max(0, Math.round(v)));

const clamp = (v: number) => Math.max(0, Math.min(100, v));

const linear = (val: number, min: number, max: number) =>
  clamp(((val - min) / (max - min)) * 100);

const linearInv = (val: number, best: number, worst: number) =>
  clamp(100 - ((val - best) / (worst - best)) * 100);

const logNorm = (val: number, min: number, max: number) => {
  const safe = Math.max(min, Math.min(max, val));
  const num = Math.log(safe + 1) - Math.log(min + 1);
  const den = Math.log(max + 1) - Math.log(min + 1);
  return den === 0 ? 0 : clamp((num / den) * 100);
};

const sigmoidInv = (val: number, c: number, k = 0.4) =>
  clamp(100 - (100 / (1 + Math.exp(-k * (val - c)))));

//Game1 利用規約ゲーム
//慎重さ・論理性・冷静さを評価

function calculateGame1(data: Game1Data | undefined): Game1Result {
  // 早期 return は通常 return と同じ shape を返す（details.metrics 側で欠損プロパティに
  // アクセスして undefined がレスポンスに漏れるのを防ぐため）
  if (!data) return {
    caution: 50,
    logic: 50,
    calmness: 50,
    changedCount: 0,
    averageSpeed: 0,
    reversalCount: 0,
  };

  const totalTimeMs = (data.totalTime || 0) * 1000;

  const scrollEvents = data.scrollEvents || [];
  let totalDistance = 0;
  let reversalCount = 0;

  for (let i = 1; i < scrollEvents.length; i++) {
    const diff = scrollEvents[i].position - scrollEvents[i - 1].position;
    totalDistance += Math.abs(diff);
    if (diff < 0) reversalCount++;
  }

  // 末尾要素アクセスはインデックス指定で行う（tsconfig.lib が ES2021 のため Array.prototype.at が
  // 標準型定義に含まれない。any 経由の参照を排除した結果、`.at()` が型エラーになるため等価な
  // 書き方に置き換えた。挙動は同一（length=0 の場合は undefined → || 1 / || 0 で 0 になる）。
  const lastEvent = scrollEvents[scrollEvents.length - 1];
  const duration =
    (lastEvent?.timestamp || 1) -
    (scrollEvents[0]?.timestamp || 0);

  const speed = duration > 0 ? (totalDistance / duration) * 1000 : 0;

  // checkboxStates の各エントリは { checked, changed } 形式。
  // 型は Game1Data の indexed access で導出する（gameData.ts 側に新規 export を作らない）。
  const checkboxChanged = Object.values(data.checkboxStates)
    .filter((c) => c.changed).length;

  //慎重さ: 滞在時間・スクロール速度・迷い時間・チェック変更
  const sTime = logNorm(totalTimeMs, 2000, 30000);
  const sScroll = linearInv(speed, 800, 4000);
  const sHover = logNorm(data.agreeButtonHoverTimeMs ?? 0, 100, 3000);
  const sCheckbox = linear(checkboxChanged, 0, 3);

  const caution = Math.round(
    sTime * 0.3 +
    sScroll * 0.25 +
    sHover * 0.25 +
    sCheckbox * 0.2
  );

  //論理性: 再確認行動・逆行スクロール・ポップアップ処理
  const hiddenMatch =
    data.hiddenInput === "確認済み" ? 1 :
    data.hiddenInput ? 0.5 : 0;

  const sHidden = linear(hiddenMatch, 0, 1);
  const sReversal = linear(reversalCount, 0, 5);
  const sPopupDelay = logNorm(data.popupStats?.timeToClose ?? 0, 0, 2000);

  const logic = Math.round(
    sHidden * 0.4 +
    sReversal * 0.3 +
    sPopupDelay * 0.3
  );

  //冷静さ: マウスブレ・無駄クリック
  const sJitter = linearInv(data.popupStats?.mouseJitter ?? 0, 10, 200);
  const sClick = linearInv(data.popupStats?.clickCount ?? 1, 1, 5);

  const calmness = Math.round(
    sJitter * 0.6 +
    sClick * 0.4
  );

  return {
    caution,
    logic,
    calmness,
    changedCount: checkboxChanged,
    averageSpeed: speed,
    reversalCount,
  };
}

//Game2 AIチャット
//積極性・冷静さ・論理性を評価

function calculateGame2(data: Game2Data | undefined): Game2Result {
  // 早期 return は通常 return と同じ shape を返す（details.metrics 側で欠損プロパティに
  // アクセスして undefined がレスポンスに漏れるのを防ぐため）
  if (!data) return {
    positivity: 50,
    calmness: 50,
    logic: 50,
    avgReact: 0,
    totalSpeech: 0,
    avgVolume: 0,
    logicWordsCount: 0,
  };

  const turns = data.turns || [];

  // 仕様書「分析ロジック → Game 2 → Null 値（テキスト入力時）の扱い」に従い、
  // null フィールドを集計対象から除外する。全ターン null（= 全ターンテキスト入力）の
  // 場合は仕様書の代替値（avgReact=2000, totalSpeech=0, avgVolume=-30, silence=0）を返す。
  // null 検出には `filter((v): v is number => v !== null)` で型ナローイング。
  const reactValues = turns
    .map((t) => t.reactionTimeMs)
    .filter((v): v is number => v !== null);
  const avgReact =
    reactValues.length > 0
      ? reactValues.reduce((a, v) => a + v, 0) / reactValues.length
      : 2000;

  const totalSpeech = turns
    .map((t) => t.speechDurationMs)
    .filter((v): v is number => v !== null)
    .reduce((a, v) => a + v, 0);

  const volumeValues = turns
    .map((t) => t.volumeDb)
    .filter((v): v is number => v !== null);
  const avgVolume =
    volumeValues.length > 0
      ? volumeValues.reduce((a, v) => a + v, 0) / volumeValues.length
      : -30;

  const silence = turns
    .map((t) => t.silenceDurationMs)
    .filter((v): v is number => v !== null)
    .reduce((a, v) => a + v, 0);

  const silenceRate =
    totalSpeech > 0 ? silence / totalSpeech : 0;

  const fullText =
    turns.map((t) => t.transcribedText || "").join(" ");

  //積極性: 反応速度・発話量・音声使用
  const sReact = linearInv(avgReact, 200, 4000);
  const sSpeech = logNorm(totalSpeech, 2000, 20000);
  const sVoice = data.inputMethod === "voice" ? 100 : 0;

  const positivity = Math.round(
    sReact * 0.4 +
    sSpeech * 0.4 +
    sVoice * 0.2
  );

  //冷静さ: 音量安定・沈黙率・打鍵安定
  const sVolume = sigmoidInv(avgVolume, -15, 0.5);
  const sSilence = linearInv(silenceRate, 0.05, 0.5);
  const sTyping = linearInv(
    // 未計測時は中立値 200（linearInv の中央付近）にフォールバック。
    // 他の reducer と違い 0 にすると「打鍵ブレ極小＝満点」扱いになり
    // 冷静さが不当に上振れるため、意図的に ?? 0 とは揃えていない。
    data.textInputMetrics?.typingIntervalVariance ?? 200,
    50,
    500
  );

  const calmness = Math.round(
    sVolume * 0.4 +
    sSilence * 0.3 +
    sTyping * 0.3
  );

  //論理性: 論理接続詞・不要語
  const logicWords =
    (fullText.match(/なぜなら|つまり|しかし|なので|というのも/g) || []).length;

  const filler =
    (fullText.match(/えー|あの|その/g) || []).length;

  const sLogicWords = linear(logicWords, 0, 4);
  const sFiller = linearInv(filler, 0, 4);

  const logic = Math.round(
    sLogicWords * 0.6 +
    sFiller * 0.4
  );

  return { positivity, calmness, logic, avgReact, totalSpeech, avgVolume, logicWordsCount: logicWords };
}

//Game3 空気読みチャット
//協調性・積極性・慎重さを評価

function calculateGame3(data: Game3Data | undefined): Game3Result {
  // 早期 return は通常 return と同じ shape を返す（details.metrics 側で欠損プロパティに
  // アクセスして undefined がレスポンスに漏れるのを防ぐため）
  if (!data) return {
    cooperativeness: 50,
    positivity: 50,
    caution: 50,
    conformCount: 0,
    avgReact: 0,
  };

  const stages = data.stages || [];

  const conformCount = stages.filter(
    (s) => s.selectedOptionId === 1 || s.selectedOptionId === 2
  ).length;

  const conformRate =
    conformCount / (stages.length || 1);

  const avgReact =
    stages.reduce((a, s) => a + (s.reactionTimeMs ?? 0), 0) /
    (stages.length || 1);

  const reactionVariance =
    stages.reduce((a, s) =>
      a + Math.pow((s.reactionTimeMs ?? 0) - avgReact, 2), 0) /
    (stages.length || 1);

  //協調性: 同調率・譲り待機・本音葛藤
  const sConform = linear(conformRate, 0, 1);
  const sWait = logNorm(data.typingIndicatorReactTimeMs ?? 0, 0, 5000);

  const hoverCount = data.hoveredOptions ?? 0;

  const sHover = linear(hoverCount, 0, 5);

  const cooperativeness = Math.round(
    sConform * 0.5 +
    sWait * 0.3 +
    sHover * 0.2
  );

  //積極性: 即応性
  const positivity = Math.round(
    linearInv(avgReact, 1000, 8000)
  );

  //慎重さ: チュートリアル確認・反応安定
  const sTutorial = logNorm(data.tutorialViewTime ?? 0, 1000, 15000);
  const sVariance = linearInv(reactionVariance, 500, 5000);

  const caution = Math.round(
    sTutorial * 0.5 +
    sVariance * 0.5
  );

  return { cooperativeness, positivity, caution, conformCount, avgReact };
}

//統合生成

export function generateAnalysisResult(
  userId: string,
  selfMbti: string | undefined,
  game1Raw: Game1Data | undefined,
  game2Raw: Game2Data | undefined,
  game3Raw: Game3Data | undefined,
  baseline_scores: BaselineScores
) {
  const g1 = calculateGame1(game1Raw);
  const g2 = calculateGame2(game2Raw);
  const g3 = calculateGame3(game3Raw);

  const phaseSummaries = buildPhaseSummaries(
    game1Raw,
    game2Raw,
    game3Raw,
    { averageSpeed: g1.averageSpeed }
  );

  const scores = {
  caution: safeScore((g1.caution + g3.caution) / 2),
  calmness: safeScore((g1.calmness + g2.calmness) / 2),
  logic: safeScore((g1.logic + g2.logic) / 2),
  cooperativeness: safeScore(g3.cooperativeness),
  positivity: safeScore((g2.positivity + g3.positivity) / 2)
};

  const gaps = {
    caution: scores.caution - baseline_scores.caution,
    calmness: scores.calmness - baseline_scores.calmness,
    logic: scores.logic - baseline_scores.logic,
    cooperativeness: scores.cooperativeness - baseline_scores.cooperativeness,
    positivity: scores.positivity - baseline_scores.positivity
  };

  const avgGap =
    (Math.abs(gaps.caution) +
     Math.abs(gaps.calmness) +
     Math.abs(gaps.logic) +
     Math.abs(gaps.cooperativeness) +
     Math.abs(gaps.positivity)) / 5;

  const accuracy_score = safeScore(100 - avgGap);
const feedback = generateFeedback(scores, gaps);

  return {
    user_id: userId,
    self_mbti: selfMbti,
    scores: scores,
    baseline_scores: baseline_scores,
    gaps: gaps,
    game_breakdown: {
      game_1: { caution: g1.caution, logic: g1.logic, calmness: g1.calmness },
      game_2: { positivity: g2.positivity, calmness: g2.calmness, logic: g2.logic },
      game_3: { cooperativeness: g3.cooperativeness, positivity: g3.positivity, caution: g3.caution }
    },
    accuracy_score: accuracy_score,
    feedback: feedback,
    phase_summaries: phaseSummaries, // buildPhaseSummaries関数で作ったテキストを渡す
    
    details: {
      game_1: {
        title: "利用規約ゲーム",
        feature_scores: [
          { axis: "caution", name: "慎重さ", score: g1.caution },
          { axis: "logic", name: "論理性", score: g1.logic },
          { axis: "calmness", name: "冷静さ", score: g1.calmness }
        ],
        // g1.averageSpeed / g1.reversalCount は calculateGame1() 内で scrollEvents から算出済み
        // （仕様書上、FE は scrollEvents のみ送信する設計のため、raw_data には scrollMetrics は無い）
        metrics: [
          { label: "読了速度(px/s)", user: Math.round(g1.averageSpeed ?? 0), average: 800, category: "scroll" },
          { label: "総滞在時間(秒)", user: Number((game1Raw?.totalTime ?? 0).toFixed(1)), average: 15.0, category: "time" },
          { label: "決断前迷い(ms)", user: game1Raw?.agreeButtonHoverTimeMs ?? 0, average: 1200, category: "mouse" },
          { label: "チェック変更(回)", user: g1.changedCount, average: 3.2, category: "input" },
          { label: "逆行確認(回)", user: g1.reversalCount ?? 0, average: 2.1, category: "scroll" },
          { label: "マウスブレ(px)", user: game1Raw?.popupStats?.mouseJitter ?? 0, average: 12.0, category: "mouse" },
          { label: "無駄クリック(回)", user: game1Raw?.popupStats?.clickCount ?? 0, average: 1.5, category: "mouse" }
        ]
      },
      game_2: {
        title: "AIカスタマーサポート",
        feature_scores: [
          { axis: "positivity", name: "積極性", score: g2.positivity },
          { axis: "calmness", name: "冷静さ", score: g2.calmness },
          { axis: "logic", name: "論理性", score: g2.logic }
        ],
        metrics: [
          { label: "反応潜時(ms)", user: Math.round(g2.avgReact ?? 0), average: 2500, category: "time" },
          { label: "発話時間(秒)", user: Number(((g2.totalSpeech ?? 0) / 1000).toFixed(1)), average: 4.2, category: "time" },
          { label: "平均音量(dB)", user: Number((g2.avgVolume ?? 0).toFixed(1)), average: -25.0, category: "voice" },
          { label: "論理的接続詞(回)", user: g2.logicWordsCount ?? 0, average: 0.5, category: "logic" }
        ]
      },
      game_3: {
        title: "空気読みグループチャット",
        feature_scores: [
          { axis: "cooperativeness", name: "協調性", score: g3.cooperativeness },
          { axis: "positivity", name: "積極性", score: g3.positivity }
        ],
        metrics: [
          { label: "同調率(%)", user: Math.round(((g3.conformCount ?? 0) / (game3Raw?.stages?.length || 1)) * 100), average: 75, category: "social" },
          { label: "反応潜時(ms)", user: Math.round(g3.avgReact ?? 0), average: 3500, category: "time" },
          { label: "本音ホバー(回)", user: game3Raw?.hoveredOptions ?? 0, average: 2.4, category: "mouse" },
          { label: "譲り合い待機(ms)", user: game3Raw?.typingIndicatorReactTimeMs ?? 0, average: 2000, category: "time" }
        ]
      }
    }
};
}