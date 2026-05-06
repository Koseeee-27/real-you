import { Game2Data, game2DataSchema } from '../../schemas/games/helpdeskGame';
import { linear, linearInv, logNorm, sigmoidInv } from '../scoreUtils';

/**
 * Game2（AI カスタマーサポート）の分析モジュール。
 *
 * Issue #100 で `scoreCalculator.ts` の `calculateGame2` と
 * `phaseSummaryBuilder.ts` の Phase 2 テキスト生成ロジックを 1 ファイルに凝集。
 *
 * - `analyze(data)`: 行動データから 5 軸の中間集計（積極性・冷静さ・論理性）を算出
 * - `buildSummary(data)`: 行動データを日本語の要約テキストに整形
 *
 * 後続 Issue #101 で `analysis/registry.ts` の `GAME_MODULES` に登録される予定。
 */

/**
 * `analyze()` の戻り値型。
 */
export type Game2Result = {
    positivity: number;
    calmness: number;
    logic: number;
    avgReact: number;
    totalSpeech: number;
    avgVolume: number;
    logicWordsCount: number;
};

/**
 * Game2 行動データ → 積極性・冷静さ・論理性の中間集計。
 *
 * 評価軸:
 * - 積極性(positivity): 反応速度・発話量・音声使用
 * - 冷静さ(calmness): 音量安定・沈黙率・打鍵安定
 * - 論理性(logic): 論理接続詞・不要語
 */
function analyze(data: Game2Data | undefined): Game2Result {
    // 早期 return は通常 return と同じ shape を返す（details.metrics 側で欠損プロパティに
    // アクセスして undefined がレスポンスに漏れるのを防ぐため）
    if (!data)
        return {
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
    const reactValues = turns.map((t) => t.reactionTimeMs).filter((v): v is number => v !== null);
    const avgReact =
        reactValues.length > 0 ? reactValues.reduce((a, v) => a + v, 0) / reactValues.length : 2000;

    const totalSpeech = turns
        .map((t) => t.speechDurationMs)
        .filter((v): v is number => v !== null)
        .reduce((a, v) => a + v, 0);

    const volumeValues = turns.map((t) => t.volumeDb).filter((v): v is number => v !== null);
    const avgVolume =
        volumeValues.length > 0
            ? volumeValues.reduce((a, v) => a + v, 0) / volumeValues.length
            : -30;

    const silence = turns
        .map((t) => t.silenceDurationMs)
        .filter((v): v is number => v !== null)
        .reduce((a, v) => a + v, 0);

    const silenceRate = totalSpeech > 0 ? silence / totalSpeech : 0;

    const fullText = turns.map((t) => t.transcribedText || '').join(' ');

    //積極性: 反応速度・発話量・音声使用
    const sReact = linearInv(avgReact, 200, 4000);
    const sSpeech = logNorm(totalSpeech, 2000, 20000);
    const sVoice = data.inputMethod === 'voice' ? 100 : 0;

    const positivity = Math.round(sReact * 0.4 + sSpeech * 0.4 + sVoice * 0.2);

    //冷静さ: 音量安定・沈黙率・打鍵安定
    const sVolume = sigmoidInv(avgVolume, -15, 0.5);
    const sSilence = linearInv(silenceRate, 0.05, 0.5);
    const sTyping = linearInv(
        // 未計測時は中立値 200（linearInv の中央付近）にフォールバック。
        // 他の reducer と違い 0 にすると「打鍵ブレ極小＝満点」扱いになり
        // 冷静さが不当に上振れるため、意図的に ?? 0 とは揃えていない。
        data.textInputMetrics?.typingIntervalVariance ?? 200,
        50,
        500,
    );

    const calmness = Math.round(sVolume * 0.4 + sSilence * 0.3 + sTyping * 0.3);

    //論理性: 論理接続詞・不要語
    const logicWords = (fullText.match(/なぜなら|つまり|しかし|なので|というのも/g) || []).length;

    const filler = (fullText.match(/えー|あの|その/g) || []).length;

    const sLogicWords = linear(logicWords, 0, 4);
    const sFiller = linearInv(filler, 0, 4);

    const logic = Math.round(sLogicWords * 0.6 + sFiller * 0.4);

    return {
        positivity,
        calmness,
        logic,
        avgReact,
        totalSpeech,
        avgVolume,
        logicWordsCount: logicWords,
    };
}

/**
 * Game2 行動データ → 結果画面に表示するサマリーテキスト。
 *
 * 例: 「AIの理不尽な対応に即座に反応し、音声で堂々と反論を展開しました。」
 *
 * 旧 `phaseSummaryBuilder.ts` の Phase 2 ロジックをそのまま移管。
 */
function buildSummary(data: Game2Data | undefined): string {
    if (!data) return 'データなし';

    const turns = data.turns || [];

    // 仕様書「分析ロジック → Game 2 → Null 値（テキスト入力時）の扱い → サマリーテキスト
    // （phase_summaries）も同じ方針」に従い、null（= テキスト入力ターン）を除外して平均を取る。
    // analyze 内 reactValues 集計部分と同じ集計方針で揃え、テキストとスコアで評価が
    // 食い違わないようにする。
    //
    // 判定軸として `turns[i].inputMethod === 'text'` は使わず `reactionTimeMs === null`
    // のみで判定する。これは仕様書「Game 2 Null 値の扱い → 注: ターン単位の
    // `Game2Turn.inputMethod` について」で「現状の集計ロジックは "null 判定" で同等の効果が
    // 得られるため、スコア計算では inputMethod を直接参照しない」と明記された方針に揃えた
    // ためで、analyze と同じ判定基準になる。
    const reactValues = turns.map((t) => t.reactionTimeMs).filter((v): v is number => v !== null);

    // turns 0 件のケース（ゲーム未プレイ等）は仕様書未定義のため、便宜上「全ターンテキスト
    // 相当」に統一して反応速度に言及しないテキストを返す。analyze も同条件で
    // avgReact=2000 にフォールバックする方針で整合している。
    const allTextOrEmpty = reactValues.length === 0;
    const allVoice = turns.length > 0 && reactValues.length === turns.length;

    if (allTextOrEmpty) {
        // 全ターンテキスト: 反応速度に言及しない（仕様書例文に準拠）
        return 'テキストで冷静に反論を展開しました。';
    }

    const avgReaction = reactValues.reduce((a, v) => a + v, 0) / reactValues.length;
    const reactionText =
        avgReaction < 800 ? 'AIの理不尽な対応に即座に反応し' : 'AIの対応に対して一呼吸おいてから';

    if (allVoice) {
        return `${reactionText}、音声で堂々と反論を展開しました。`;
    }

    // 混在: null 除外平均で反応速度を判定し、method は Game2Data 直下の inputMethod を採用。
    // 直下フィールドを使う根拠は analyze の sVoice 算出と同じ方針（音声選択を 0/100
    // で評価する積極性スコアが Game2Data.inputMethod を参照しているため、サマリー側もそろえる）。
    // 「主に音声/テキストどちらだったか」をターン多数決で決める方が正確という議論はあるが、
    // 仕様書未定義のためスコアと同じ判定軸に揃える。
    const method = data.inputMethod === 'voice' ? '音声で堂々と' : 'テキストで冷静に';
    return `${reactionText}、${method}反論を展開しました。`;
}

/**
 * Game2（AI カスタマーサポート）モジュール。
 */
export const helpdeskGameModule = {
    id: 'helpdesk_game' as const,
    title: 'AIカスタマーサポート',
    schema: game2DataSchema,
    analyze,
    buildSummary,
};
