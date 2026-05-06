import { Game3Data, game3DataSchema } from '../../schemas/games/groupChatGame';
import { linear, linearInv, logNorm } from '../scoreUtils';

/**
 * Game3（空気読みグループチャット）の分析モジュール。
 *
 * Issue #100 で `scoreCalculator.ts` の `calculateGame3` と
 * `phaseSummaryBuilder.ts` の Phase 3 テキスト生成ロジックを 1 ファイルに凝集。
 *
 * - `analyze(data)`: 行動データから 5 軸の中間集計（協調性・積極性・慎重さ）を算出
 * - `buildSummary(data)`: 行動データを日本語の要約テキストに整形
 *
 * 後続 Issue #101 で `analysis/registry.ts` の `GAME_MODULES` に登録される予定。
 */

/**
 * `analyze()` の戻り値型。
 */
export type Game3Result = {
    cooperativeness: number;
    positivity: number;
    caution: number;
    conformCount: number;
    avgReact: number;
};

/**
 * Game3 行動データ → 協調性・積極性・慎重さの中間集計。
 *
 * 評価軸:
 * - 協調性(cooperativeness): 同調率・譲り待機・本音葛藤
 * - 積極性(positivity): 即応性
 * - 慎重さ(caution): チュートリアル確認・反応安定
 */
function analyze(data: Game3Data | undefined): Game3Result {
    // 早期 return は通常 return と同じ shape を返す（details.metrics 側で欠損プロパティに
    // アクセスして undefined がレスポンスに漏れるのを防ぐため）
    if (!data)
        return {
            cooperativeness: 50,
            positivity: 50,
            caution: 50,
            conformCount: 0,
            avgReact: 0,
        };

    const stages = data.stages || [];

    const conformCount = stages.filter(
        (s) => s.selectedOptionId === 1 || s.selectedOptionId === 2,
    ).length;

    const conformRate = conformCount / (stages.length || 1);

    const avgReact =
        stages.reduce((a, s) => a + (s.reactionTimeMs ?? 0), 0) / (stages.length || 1);

    const reactionVariance =
        stages.reduce((a, s) => a + Math.pow((s.reactionTimeMs ?? 0) - avgReact, 2), 0) /
        (stages.length || 1);

    //協調性: 同調率・譲り待機・本音葛藤
    const sConform = linear(conformRate, 0, 1);
    const sWait = logNorm(data.typingIndicatorReactTimeMs ?? 0, 0, 5000);

    const hoverCount = data.hoveredOptions ?? 0;

    const sHover = linear(hoverCount, 0, 5);

    const cooperativeness = Math.round(sConform * 0.5 + sWait * 0.3 + sHover * 0.2);

    //積極性: 即応性
    const positivity = Math.round(linearInv(avgReact, 1000, 8000));

    //慎重さ: チュートリアル確認・反応安定
    const sTutorial = logNorm(data.tutorialViewTime ?? 0, 1000, 15000);
    const sVariance = linearInv(reactionVariance, 500, 5000);

    const caution = Math.round(sTutorial * 0.5 + sVariance * 0.5);

    return { cooperativeness, positivity, caution, conformCount, avgReact };
}

/**
 * Game3 行動データ → 結果画面に表示するサマリーテキスト。
 *
 * 例: 「グループの空気を敏感に察知して周りに合わせ、即決でアクションを起こしました。」
 *
 * 旧 `phaseSummaryBuilder.ts` の Phase 3 ロジックをそのまま移管。
 */
function buildSummary(data: Game3Data | undefined): string {
    if (!data) return 'データなし';

    const stages = data.stages || [];

    // 多数派（仮に選択肢1と2を多数派とする）を選んだ回数で同調率を算出
    const conformCount = stages.filter(
        (s) => s.selectedOptionId === 1 || s.selectedOptionId === 2,
    ).length;
    const conformRate = (conformCount / (stages.length || 1)) * 100;

    const socialText =
        conformRate >= 60
            ? 'グループの空気を敏感に察知して周りに合わせ'
            : '周りに流されず我が道をゆく選択肢を取り';

    // 平均反応速度から速度感を表現する。
    // Phase 3 の reactionTimeMs は仕様上 null が来ない（タイムアウト時も実時間 ≈ 10000ms で記録される）。
    // 防御的に `?? 2000`（中立値）でフォールバックし、stages 0 件のときも 2000ms を使う。
    const avgReaction =
        stages.length > 0
            ? stages.reduce((sum, s) => sum + (s.reactionTimeMs ?? 2000), 0) / stages.length
            : 2000;
    const speedText =
        avgReaction < 2000 ? '即決でアクションを起こしました。' : '慎重にタイミングを伺いました。';

    return `${socialText}、${speedText}`;
}

/**
 * Game3（空気読みグループチャット）モジュール。
 */
export const groupChatGameModule = {
    id: 'group_chat_game' as const,
    title: '空気読みグループチャット',
    schema: game3DataSchema,
    analyze,
    buildSummary,
};
