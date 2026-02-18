import { PhaseSummaries } from '../types';

/**
 * 各フェーズの行動データから、結果画面に表示するサマリーテキストを生成する
 *
 * ★ たまちゃへ：ここを実装してください
 * - 各ゲームの raw_data を受け取って、ユーザーの行動を日本語テキストにまとめる
 * - 例: 「利用規約を12秒で同意しました。読了率8%」
 * - raw_data の構造は ANALYSIS_GUIDE.md を参照
 */
export function buildPhaseSummaries(
    game1Raw: any | undefined,
    game2Raw: any | undefined,
    game3Raw: any | undefined,
): PhaseSummaries {
    // TODO: たまちゃが実装する
    // raw_data の中身を読んで、行動を日本語で要約する

    return {
        phase_1: game1Raw ? '分析結果を準備中...' : 'データなし',
        phase_2: game2Raw ? '分析結果を準備中...' : 'データなし',
        phase_3: game3Raw ? '分析結果を準備中...' : 'データなし',
    };
}
