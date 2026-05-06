import type { GameId } from '../schemas/results';
import { BaselineScores, SCORE_KEYS } from '../types';
import { safeScore } from './scoreUtils';

/**
 * 軸統合（ゲーム横断のスコア合算）の汎用ロジック（Issue #102 / Phase 3b）。
 *
 * 設計方針:
 * - 「各軸ごとに、その軸を測定した全ゲームの平均」を取る純粋関数として定義する。
 *   軸-ゲーム対応はゲームモジュール側（`analyze()` の戻り値 `scores` キー）に
 *   集約されているため、本ファイルはどのゲームがどの軸を測るかを意識しない。
 * - 旧 `scoreCalculator.ts` でハードコードしていた軸ごとの平均計算
 *   （例: `(g1.caution + g3.caution) / 2`）を本関数に置き換える。
 *   入力同一なら出力も同一になることを Issue #102 完了条件で要求しているため、
 *   `safeScore`（既存の clamp + Math.round）で 0-100 整数化する点も維持する。
 *
 * 仕様の確認:
 * - 軸ごとの集計対象は「scores[axis] !== undefined」のゲームのみ。
 *   undefined（測定対象外）は集計から除外する。
 * - 全ゲームで未測定の軸は中立値 50 を返す（旧実装ではコード上発生しないが、
 *   将来的に「全ゲームで測られない軸」が追加されたケースの安全弁として設定）。
 * - 平均は単純算術平均。重み付けはしない。
 */

/**
 * 軸統合の入力単位。
 *
 * `game_id` は集計値そのものには影響しないが、デバッグ・ログ整合のために
 * 各 contribution が「どのゲームから来たか」を明示する。
 * `scores` は当該ゲームで測定した軸のみを含む `Partial<BaselineScores>`。
 *
 * 形状は `schemas/results.ts` の `gameBreakdownSchema` の各要素と同一のため、
 * scoreCalculator では `game_breakdown` 配列をそのまま `aggregateScores` に
 * 渡せる（同じ型として扱える）。
 */
export type GameContribution = {
    readonly game_id: GameId;
    readonly scores: Partial<BaselineScores>;
};

/**
 * 全ゲームで未測定の軸に対するフォールバック値。
 *
 * 5 軸スコアの仕様上「測定不能」を表す中立値は 50（各ゲームモジュールの
 * 早期 return も 50 を返している）。本値はあくまで保険であり、現状の
 * 3 ゲーム構成では全 contributions に必ずいずれかの軸が含まれるため到達しない。
 */
const NEUTRAL_SCORE = 50;

/**
 * 5 軸の列挙（`SCORE_KEYS` から導出）。
 *
 * `BaselineScores` のキーと一致することを `satisfies` で保証する。
 * 軸の追加・削除は `types/index.ts` の `SCORE_KEYS` 1 箇所で完結する。
 */
const AXES = Object.values(SCORE_KEYS) satisfies readonly (keyof BaselineScores)[];

/**
 * 各軸ごとに、その軸を測定したゲームのスコア平均を取って 5 軸スコアを構築する。
 *
 * 例: contributions = [
 *   { game_id: 'terms_game',     scores: { caution: 60, logic: 70, calmness: 55 } },
 *   { game_id: 'helpdesk_game',  scores: { positivity: 65, calmness: 50, logic: 75 } },
 *   { game_id: 'group_chat_game', scores: { cooperativeness: 80, positivity: 70, caution: 45 } },
 * ]
 * → caution        = round((60 + 45) / 2) = 53
 * → calmness       = round((55 + 50) / 2) = 53
 * → logic          = round((70 + 75) / 2) = 73
 * → cooperativeness = round(80) = 80
 * → positivity     = round((65 + 70) / 2) = 68
 *
 * 入力が空 / 全軸 undefined の場合は全軸 NEUTRAL_SCORE を返す。
 */
export function aggregateScores(contributions: readonly GameContribution[]): BaselineScores {
    // 全軸を NEUTRAL_SCORE で初期化してから AXES ループで上書きする。
    // 型注釈 `BaselineScores` により未来の軸追加（例: BaselineScores に新軸が追加されたが
    // SCORE_KEYS / AXES に追加し忘れた場合）でコンパイル時に検出できるとともに、
    // 万一 AXES が漏れていても result の値が undefined / NaN にならず NEUTRAL_SCORE に
    // フォールバックする（aggregator 利用先での `gaps` 計算で NaN が伝播するのを防ぐ）。
    const result: BaselineScores = {
        caution: NEUTRAL_SCORE,
        calmness: NEUTRAL_SCORE,
        logic: NEUTRAL_SCORE,
        cooperativeness: NEUTRAL_SCORE,
        positivity: NEUTRAL_SCORE,
    };
    for (const axis of AXES) {
        const values = contributions
            .map((c) => c.scores[axis])
            .filter((v): v is number => v !== undefined);
        if (values.length > 0) {
            result[axis] = safeScore(values.reduce((sum, v) => sum + v, 0) / values.length);
        }
    }
    return result;
}
