import { BaselineScores } from '../types';

export type GameMetrics = {
    totalTime?: number;
    panicCount?: number;
    adaptTime?: number;
    avgHesitation?: number;
};

type FeedbackPattern = {
    title: string;
    subtitle: string;
    buildDescription: (accuracy: number, metrics: GameMetrics) => string;
};

type AxisFeedback = {
    high: FeedbackPattern;
    low: FeedbackPattern;
};

const FEEDBACK_PATTERNS: Record<keyof BaselineScores, AxisFeedback> = {
    caution: {
        high: {
            title: '影の参謀',
            subtitle: '黙って全部見てから動く、縁の下の策士',
            buildDescription: (accuracy, { totalTime }) => {
                const ratio =
                    totalTime !== undefined ? (totalTime / 15).toFixed(1) : '？';
                return [
                    `あなたの自己認識一致度は${accuracy}%。`,
                    '「もっと大胆に動ける」と思っていたかもしれません。',
                    `でも規約ゲームで、あなたは平均の${ratio}倍の時間をかけて読んでいました。`,
                    'その慎重さは、意識していないところで顔を出しています。',
                ].join('\n');
            },
        },
        low: {
            title: '特攻隊長',
            subtitle: '細かいことは気にしない、とにかく前へ進む人',
            buildDescription: (accuracy, { totalTime }) => {
                const time =
                    totalTime !== undefined ? `${totalTime.toFixed(1)}` : '？';
                return [
                    `あなたの自己認識一致度は${accuracy}%。`,
                    '「慎重に考えてから動く」つもりだったかもしれません。',
                    `でも規約ゲームで、あなたはわずか${time}秒で同意ボタンを押していました。`,
                    '考える前に体が動く、それがあなたの本能です。',
                ].join('\n');
            },
        },
    },
    calmness: {
        high: {
            title: '無敵のポーカーフェイス',
            subtitle: '内心どうあれ外には一切出さない、天然の冷静派',
            buildDescription: (accuracy, { panicCount }) => {
                const count = panicCount !== undefined ? `${panicCount}` : '？';
                return [
                    `あなたの自己認識一致度は${accuracy}%。`,
                    '「感情が出やすい」と思っていたかもしれません。',
                    'でも仕分けゲームで機械が止まった3秒間、',
                    `あなたのクリック数は${count}回でした。平均は約3回です。`,
                ].join('\n');
            },
        },
        low: {
            title: '感情のジェットコースター',
            subtitle: '気持ちが顔に出る、でもそれが人間らしさの正体',
            buildDescription: (accuracy, { panicCount }) => {
                const count = panicCount !== undefined ? `${panicCount}` : '？';
                return [
                    `あなたの自己認識一致度は${accuracy}%。`,
                    '「冷静に対処できる」と思っていたかもしれません。',
                    'でも仕分けゲームで機械が止まった3秒間、',
                    `あなたは${count}回クリックしていました。その焦りがデータに残っています。`,
                ].join('\n');
            },
        },
    },
    logic: {
        high: {
            title: '頭の中の設計士',
            subtitle: '話す前に構造が見えている、無意識に筋道を立てるタイプ',
            buildDescription: (accuracy, { adaptTime }) => {
                const time =
                    adaptTime !== undefined ? `${adaptTime.toFixed(1)}` : '？';
                return [
                    `あなたの自己認識一致度は${accuracy}%。`,
                    '「直感で動くタイプ」と思っていたかもしれません。',
                    'でも仕分けゲームでルールが変わった後、',
                    `あなたはわずか${time}秒で新ルールに適応していました。`,
                ].join('\n');
            },
        },
        low: {
            title: '直感で生きる哺乳類',
            subtitle: '理屈より先に体が動く、本能で正解を掴むタイプ',
            buildDescription: (accuracy, { adaptTime }) => {
                const time =
                    adaptTime !== undefined ? `${adaptTime.toFixed(1)}` : '？';
                return [
                    `あなたの自己認識一致度は${accuracy}%。`,
                    '「論理的に考えるタイプ」と思っていたかもしれません。',
                    'でも仕分けゲームでルールが変わった後も、',
                    `あなたは${time}秒間、以前のルールで動き続けていました。`,
                ].join('\n');
            },
        },
    },
    cooperativeness: {
        high: {
            title: '空気の支配者',
            subtitle: '無意識に場の空気を作り、周りを動かしている人',
            buildDescription: (accuracy) =>
                [
                    `あなたの自己認識一致度は${accuracy}%。`,
                    '「自分のペースで動くタイプ」と思っていたかもしれません。',
                    'でもチャットゲームで他の人が動き出した瞬間、',
                    'あなたの選択が変わっていました。',
                ].join('\n'),
        },
        low: {
            title: '孤高の一匹狼',
            subtitle: '群れない、媚びない、でも結果は出すタイプ',
            buildDescription: (accuracy) =>
                [
                    `あなたの自己認識一致度は${accuracy}%。`,
                    '「周りに合わせるタイプ」と思っていたかもしれません。',
                    'でもチャットゲームで周りが動き出しても、',
                    'あなたの選択はブレませんでした。',
                ].join('\n'),
        },
    },
    positivity: {
        high: {
            title: '暴走する機関車',
            subtitle: '気づいたら先頭にいる、止まり方を知らない人',
            buildDescription: (accuracy) =>
                [
                    `あなたの自己認識一致度は${accuracy}%。`,
                    '「慎重に様子を見るタイプ」と思っていたかもしれません。',
                    'でもチャットゲームで、あなたは同期より先に動いていました。',
                    '止まり方を知らない、それがあなたの本能です。',
                ].join('\n'),
        },
        low: {
            title: '石橋の建築家',
            subtitle: '渡る前に橋を設計し直す、慎重すぎる完璧主義者',
            buildDescription: (accuracy, { avgHesitation }) => {
                const avg =
                    avgHesitation !== undefined ? `${avgHesitation.toFixed(1)}` : '？';
                const diffVal = avgHesitation !== undefined ? avgHesitation - 1.5 : null;
                // avgHesitation が平均（1.5秒）以下の場合は「長く」という文言が使えないため、
                // 「データなし」ではなく「平均並み」として別文言で落とす。
                const lastLine =
                    diffVal !== null && diffVal > 0
                        ? `平均より${diffVal.toFixed(1)}秒長く、全部確認してから動くタイプです。`
                        : `判断は平均並みでしたが、自己認識より慎重な行動パターンが出ています。`;
                return [
                    `あなたの自己認識一致度は${accuracy}%。`,
                    '「積極的に動けるタイプ」と思っていたかもしれません。',
                    `でも仕分けゲームで、あなたの平均判断時間は${avg}秒。`,
                    lastLine,
                ].join('\n');
            },
        },
    },
};

const BALANCE_PATTERN: FeedbackPattern = {
    title: '自分を知る者',
    subtitle: '行動と認識が一致している、本当の意味で自分を理解している人',
    buildDescription: (accuracy) =>
        [
            `あなたの自己認識一致度は${accuracy}%。`,
            '自己申告とゲームでの行動がほぼ一致していました。',
            '自分の本質を正確に把握している人は、実はとても少ない。',
            'あなたはその数少ない一人です。',
        ].join('\n'),
};

const AXIS_NAMES: Record<keyof BaselineScores, string> = {
    caution: '慎重さ',
    calmness: '冷静さ',
    logic: '論理性',
    cooperativeness: '協調性',
    positivity: '積極性',
};

export function generateFeedback(
    scores: BaselineScores,
    gaps: BaselineScores,
    accuracy: number,
    gameMetrics: GameMetrics,
): { title: string; subtitle: string; description: string; gap_point: string } {
    const gapEntries = (Object.keys(gaps) as Array<keyof BaselineScores>).map((key) => ({
        key,
        value: gaps[key],
        abs: Math.abs(gaps[key]),
    }));
    gapEntries.sort((a, b) => b.abs - a.abs);
    const maxGap = gapEntries[0];

    if (maxGap.abs <= 10) {
        return {
            title: BALANCE_PATTERN.title,
            subtitle: BALANCE_PATTERN.subtitle,
            description: BALANCE_PATTERN.buildDescription(accuracy, gameMetrics),
            gap_point: 'なし（バランス型）',
        };
    }

    const axisKey = maxGap.key;
    // gap > 0 → 実測がベースラインより高い（high 方向のあだ名）
    // gap < 0 → 実測がベースラインより低い（low 方向のあだ名）
    const pattern =
        maxGap.value > 0
            ? FEEDBACK_PATTERNS[axisKey].high
            : FEEDBACK_PATTERNS[axisKey].low;

    // scores は現状使用しないが、シグネチャ上は渡す（将来的な参照のため）
    void scores;

    return {
        title: pattern.title,
        subtitle: pattern.subtitle,
        description: pattern.buildDescription(accuracy, gameMetrics),
        gap_point: AXIS_NAMES[axisKey],
    };
}
