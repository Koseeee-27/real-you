import type { GameId } from '../schemas/results';
import { BaselineScores } from '../types';
import { aggregateScores } from './aggregator';
import { generateFeedback } from './feedbackGenerator';
import { GAME_MODULES, NORMAL_FLOW } from './registry';
import { safeScore } from './scoreUtils';

/**
 * 結果レスポンスを組み立てる薄い統合層（Issue #102 で縮小）。
 *
 * 旧 `scoreCalculator.ts`（約 250 行）はゲームごとの計算・要約・details 構築を
 * 直接抱えていたが、Phase 1〜3 を通じて以下のように責務を移譲した:
 *
 * - 各ゲームの分析・要約・details 構築 → `analysis/games/<game>.ts`
 * - 軸統合（5 軸スコアの合算）            → `analysis/aggregator.ts`
 * - ゲームの登録・順序                    → `analysis/registry.ts`
 *
 * 本ファイルに残るのは:
 *   - registry でループしてモジュール出力（breakdown / summary / detail）を集約
 *   - aggregator で 5 軸スコアを算出
 *   - gaps と accuracy_score の単純計算
 *   - feedbackGenerator の呼び出し
 *
 * これにより「軸-ゲーム対応の変更」「新ゲームの追加」は当該モジュール
 * （`analysis/games/<game>.ts`）と registry への登録のみで完結する。
 *
 * ▼評価軸定義
 * 慎重さ(caution):       情報確認・迷い時間・再確認行動
 * 冷静さ(calmness):      マウスのブレ・無駄操作・音量安定性・打鍵安定性
 * 論理性(logic):         再確認行動・論理接続詞使用・不要語の少なさ
 * 協調性(cooperativeness): 同調率・譲り待機時間・本音葛藤行動
 * 積極性(positivity):    反応速度・発話量・即応性
 */

/**
 * ゲーム ID → 該当ゲームの行動データ（zod-parsed 後の `unknown`）の対応マップ。
 *
 * resultService 側で `GAME_MODULES[gameId].schema` で parse 済みの値が入る。
 * 値の具体型（TermsGameData 等）は registry レベルでは保持できないため `unknown` だが、
 * 各モジュールの adapter（`termsGameModule.analyze` 等）が具体型に narrow する。
 *
 * 未送信ゲームの値は undefined（`incomplete_games` ガード後は実質起こらないが、
 * モジュール側の早期 return で安全に扱える）。
 *
 * NORMAL_FLOW に含まれない GameId（例: helpdesk_game）は欠落してよいため Partial。
 * resultService が NORMAL_FLOW をループして詰めるため、NORMAL_FLOW 外のキーは存在しない。
 */
export type GameDataByGameId = Readonly<Partial<Record<GameId, unknown>>>;

/**
 * 5 軸スコアからベースラインとの差分を計算する。負値はベースライン下回り。
 */
function computeGaps(scores: BaselineScores, baseline: BaselineScores): BaselineScores {
    return {
        caution: scores.caution - baseline.caution,
        calmness: scores.calmness - baseline.calmness,
        logic: scores.logic - baseline.logic,
        cooperativeness: scores.cooperativeness - baseline.cooperativeness,
        positivity: scores.positivity - baseline.positivity,
    };
}

/**
 * gaps の絶対値平均から自己認識精度（0-100 の整数）を算出する。
 * `safeScore` は 0-100 への clamp と Math.round を行う既存ユーティリティ。
 */
function computeAccuracyScore(gaps: BaselineScores): number {
    const totalAbsGap =
        Math.abs(gaps.caution) +
        Math.abs(gaps.calmness) +
        Math.abs(gaps.logic) +
        Math.abs(gaps.cooperativeness) +
        Math.abs(gaps.positivity);
    return safeScore(100 - totalAbsGap / 5);
}

/**
 * 3 ゲームの行動データから 5 軸スコア・gaps・feedback・details 等の結果レスポンス
 * オブジェクトを組み立てる。
 *
 * 配列順は `NORMAL_FLOW`（terms_game → sorter_game → group_chat_game の通常フロー）に
 * 合わせる。FE は配列内を `find(game_id === '...')` で参照する設計のため、配列順は
 * セマンティクスに影響しないが、API レスポンスの安定化のため固定順で出力する。
 */
export function generateAnalysisResult(
    userId: string,
    selfMbti: string | undefined,
    dataByGameId: GameDataByGameId,
    baseline_scores: BaselineScores,
) {
    // モジュールごとの出力を一度の loop で組み立てる。各モジュールの adapter が
    // unknown データを内部の concrete 型に narrow するため、ここでは型を意識しない。
    const moduleOutputs = NORMAL_FLOW.map((gameId) => {
        const gameModule = GAME_MODULES[gameId];
        const data = dataByGameId[gameId];
        const analyzeResult = gameModule.analyze(data);
        return {
            breakdown: { game_id: gameId, scores: analyzeResult.scores },
            summary: { game_id: gameId, summary: gameModule.buildSummary(data) },
            detail: gameModule.buildDetails(data, analyzeResult),
        };
    });

    const game_breakdown = moduleOutputs.map((m) => m.breakdown);
    const phase_summaries = moduleOutputs.map((m) => m.summary);
    const details = moduleOutputs.map((m) => m.detail);

    const scores = aggregateScores(game_breakdown);
    const gaps = computeGaps(scores, baseline_scores);
    const accuracy_score = computeAccuracyScore(gaps);
    const feedback = generateFeedback(scores, gaps);

    return {
        user_id: userId,
        self_mbti: selfMbti,
        scores,
        baseline_scores,
        gaps,
        game_breakdown,
        accuracy_score,
        feedback,
        phase_summaries,
        details,
    };
}
