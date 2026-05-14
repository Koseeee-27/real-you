import type { ZodType } from 'zod';
import type { GameDetail } from '../../schemas/results';

// TODO: #114 で sorterGameDataSchema を作成後に正式 import に切り替える
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SorterGameData = any;

const sorterGameDataSchemaStub = {
    safeParse: (d: unknown) => ({ success: true as const, data: d }),
};

const sorterGameDataSchema = sorterGameDataSchemaStub as unknown as ZodType;

export type SorterGameAnalyzeResult = {
    scores: { caution: number; calmness: number; logic: number; positivity: number };
};

function analyze(data: SorterGameData | undefined): SorterGameAnalyzeResult {
    if (!data) return { scores: { caution: 50, calmness: 50, logic: 50, positivity: 50 } };
    // TODO: #115 で本実装
    return { scores: { caution: 50, calmness: 50, logic: 50, positivity: 50 } };
}

function buildSummary(_data: SorterGameData | undefined): string {
    // TODO: #115 で本実装
    return '荷物仕分けゲームをプレイしました。';
}

function buildDetails(_data: SorterGameData | undefined, result: SorterGameAnalyzeResult): GameDetail {
    return {
        game_id: sorterGameModule.id,
        title: sorterGameModule.title,
        feature_scores: [
            { axis: 'caution', name: '慎重さ', score: result.scores.caution },
            { axis: 'calmness', name: '冷静さ', score: result.scores.calmness },
            { axis: 'logic', name: '論理性', score: result.scores.logic },
            { axis: 'positivity', name: '積極性', score: result.scores.positivity },
        ],
        metrics: [],
    };
}

export const sorterGameModule = {
    id: 'sorter_game' as const,
    title: '荷物仕分けゲーム',
    schema: sorterGameDataSchema,
    analyze: (data: unknown) => analyze(data as SorterGameData | undefined),
    buildSummary: (data: unknown) => buildSummary(data as SorterGameData | undefined),
    buildDetails: (data: unknown, result: unknown) =>
        buildDetails(data as SorterGameData | undefined, result as SorterGameAnalyzeResult),
};
