import { SorterGameData, sorterGameDataSchema } from '../../schemas/games/sorterGame';
import type { GameDetail } from '../../schemas/results';
import { linear, linearInv, buildTopDeviationMetrics } from '../scoreUtils';

/**
 * sorter_game の分析で使う閾値定数。
 * チームで合意後にここだけ変更すれば全スコア式に反映される。
 * 値は分析ロジック仕様書「閾値の根拠 Game 2」の初期値。
 */
const THRESHOLDS = {
    hesitation: { best: 200, worst: 4000 },
    cancelCount: { best: 0, worst: 5, fallback: 0 },
    wrongSortRate: { best: 0, worst: 0.3 },
    panicClick: { best: 0, worst: 10, fallback: 0 },
    adaptMs: { best: 0, worst: 20000, fallback: 20000 },
    concentration: { lo: 0, hi: 1 },
} as const;

/**
 * 各軸スコアの重み定数。
 * 合計が 1.0 になるよう維持すること。
 */
const WEIGHTS = {
    caution: { hesitation: 0.7, cancel: 0.3 },
    calmness: { wrongRate: 0.5, panic: 0.3, concentration: 0.2 },
    logic: { adapt: 0.7, concentration: 0.3 },
} as const;

/**
 * concentration の最低サンプル数閾値。
 * 誤仕分けが少なすぎる場合に中立値 0.5 を使う。
 * 仕様書「※注9」参照。実装段階で決定後に本書を更新する（暗定 3）。
 */
const MIN_SAMPLE_FOR_CONCENTRATION = 3;

export type SorterGameAnalyzeResult = {
    scores: { caution: number; calmness: number; logic: number; positivity: number };
    avgHesitationMs: number;
    wrongSortRate: number;
    concentration: number;
    /** 荷物1個あたりの平均判断時間（秒）。buildHighlights / feedbackGenerator で使用 */
    avgHesitation: number;
    /** 機械停止中のパニッククリック回数。buildHighlights / feedbackGenerator で使用 */
    panicCount: number;
    /** ルール変更後の適応時間（秒）。buildHighlights / feedbackGenerator で使用 */
    adaptTime: number;
};

function analyze(data: SorterGameData | undefined): SorterGameAnalyzeResult {
    if (!data)
        return {
            scores: { caution: 50, calmness: 50, logic: 50, positivity: 50 },
            avgHesitationMs: 0,
            wrongSortRate: 0,
            concentration: 0.5,
            avgHesitation: 0,
            panicCount: 0,
            adaptTime: 0,
        };

    // --- 誤仕分け率 ---
    const sortEventCount = data.events.filter((e) => e.eventType === 'sort').length;
    const wrongSortRate = Math.min(1, data.wrongSortCount / Math.max(1, sortEventCount));

    // --- 誤仕分け集中度（concentration）---
    // wrongPatterns の全エントリ数値を1配列にまとめ max/sum で算出
    const allCounts: number[] = [
        ...Object.values(data.wrongPatterns.urgent ?? {}),
        ...Object.values(data.wrongPatterns.fragile ?? {}),
        ...Object.values(data.wrongPatterns.heavy ?? {}),
    ].filter((v): v is number => typeof v === 'number');

    const sumCounts = allCounts.reduce((a, b) => a + b, 0);
    const concentration =
        data.wrongSortCount < MIN_SAMPLE_FOR_CONCENTRATION || sumCounts === 0
            ? 0.5
            : Math.max(...allCounts) / sumCounts;

    // --- 慎重さ ---
    // 平均判断時間(0.70) + やり直し・取り消し回数(0.30)
    const sCaution =
        linearInv(
            data.averageHesitationMs,
            THRESHOLDS.hesitation.best,
            THRESHOLDS.hesitation.worst,
        ) *
            WEIGHTS.caution.hesitation +
        linearInv(data.cancelCount, THRESHOLDS.cancelCount.best, THRESHOLDS.cancelCount.worst) *
            WEIGHTS.caution.cancel;

    // --- 冷静さ ---
    // 誤仕分け率(0.50) + 凍結中パニッククリック(0.30) + 誤仕分け集中度(冷静さ向け)(0.20)
    // 冷静さ向け集中度は linear（散発=パニック=低得点 / 一貫=落ち着き=高得点）
    const sCalmness =
        linearInv(wrongSortRate, THRESHOLDS.wrongSortRate.best, THRESHOLDS.wrongSortRate.worst) *
            WEIGHTS.calmness.wrongRate +
        linearInv(data.panicClickCount, THRESHOLDS.panicClick.best, THRESHOLDS.panicClick.worst) *
            WEIGHTS.calmness.panic +
        linear(concentration, THRESHOLDS.concentration.lo, THRESHOLDS.concentration.hi) *
            WEIGHTS.calmness.concentration;

    // --- 論理性 ---
    // ルール変更適応速度(0.70) + 誤仕分け集中度(論理性向け)(0.30)
    // 論理性向け集中度は linearInv（散らばり=高得点 / 一貫した誤認知=低得点）
    const adaptMs = data.ruleChangeAdaptMs ?? THRESHOLDS.adaptMs.fallback;
    const sLogic =
        linearInv(adaptMs, THRESHOLDS.adaptMs.best, THRESHOLDS.adaptMs.worst) * WEIGHTS.logic.adapt +
        linearInv(concentration, THRESHOLDS.concentration.lo, THRESHOLDS.concentration.hi) *
            WEIGHTS.logic.concentration;

    // --- 積極性 ---
    // ルール変更適応速度(1.00)
    const sPositivity = linearInv(adaptMs, THRESHOLDS.adaptMs.best, THRESHOLDS.adaptMs.worst);

    return {
        scores: {
            caution: Math.round(sCaution),
            calmness: Math.round(sCalmness),
            logic: Math.round(sLogic),
            positivity: Math.round(sPositivity),
        },
        avgHesitationMs: data.averageHesitationMs,
        wrongSortRate,
        concentration,
        avgHesitation: data.averageHesitationMs / 1000,
        panicCount: data.panicClickCount,
        adaptTime: adaptMs / 1000,
    };
}

function buildSummary(data: SorterGameData | undefined): string {
    if (!data) return 'データなし';

    const adaptText =
        data.ruleChangeAdaptMs != null
            ? `ルール変更には ${(data.ruleChangeAdaptMs / 1000).toFixed(1)} 秒で適応しました。`
            : 'ルール変更には適応できませんでした。';

    const panicText =
        data.panicClickCount > 5
            ? 'システム障害中に焦りが見られました。'
            : 'システム障害中も落ち着いて待てました。';

    return `${adaptText}${panicText}`;
}

function buildHighlights(data: SorterGameData | undefined, result: SorterGameAnalyzeResult) {
    return [
        {
            text: `荷物1つを仕分けるまでの平均判断時間は${result.avgHesitation.toFixed(1)}秒。`,
            comparison: '平均は約1.5秒',
            reason: '判断の速さから〈慎重さ／積極性〉がわかるため',
        },
        {
            text: `ルールが変わってから正しく仕分けできるまで${result.adaptTime.toFixed(1)}秒かかりました。`,
            comparison: '平均は約5秒',
            reason: '新ルールへの適応速度から〈論理性〉がわかるため',
        },
        {
            text: `機械が止まっている間、${result.panicCount}回クリックしていました。`,
            comparison: '平均は約3回',
            reason: '操作できない状況での連打から〈冷静さ〉がわかるため',
        },
    ];
    void data;
}

/** 荷物仕分けゲームの解析コメント（軸スコアの根拠を複数文で説明） */
function buildAnalysisComment(data: SorterGameData, result: SorterGameAnalyzeResult): string[] {
    const comments: string[] = [];

    // 冷静さ（panicClickCount）
    const panicCount = result.panicCount;
    if (panicCount <= 2) {
        comments.push(`システム障害の5秒間もクリックは${panicCount}回と落ち着いた対応。この冷静さが「冷静さ」の高スコアにつながっています。`);
    } else if (panicCount > 4) {
        comments.push(`システム障害中に${panicCount}回クリック（平均3回）。焦りが行動に表れ、「冷静さ」のスコアに影響しています。`);
    } else {
        comments.push(`システム障害中のクリックは${panicCount}回と平均的でした。`);
    }

    // 論理性（ruleChangeAdaptMs / adaptTime）
    if (data.ruleChangeAdaptMs === null) {
        comments.push(`ルール変更後も完全適応には至りませんでした。この行動が「論理性」のスコアに影響しています。`);
    } else if (result.adaptTime < 4) {
        comments.push(`ルール変更後わずか${result.adaptTime.toFixed(1)}秒で正解。素早い適応力が「論理性」の高スコアにつながっています。`);
    } else if (result.adaptTime > 6) {
        comments.push(`ルール変更後${result.adaptTime.toFixed(1)}秒間は旧ルールで動き続けました。切り替えに時間がかかり「論理性」のスコアに影響しています。`);
    } else {
        comments.push(`ルール変更への適応は${result.adaptTime.toFixed(1)}秒と平均的でした。`);
    }

    // 慎重さ（avgHesitation）
    const avg = result.avgHesitation;
    if (avg > 2.0) {
        comments.push(`平均判断時間${avg.toFixed(1)}秒（平均1.5秒）。確認してから動く慎重さが「慎重さ」の高スコアにつながっています。`);
    } else {
        comments.push(`平均判断時間${avg.toFixed(1)}秒と素早い判断が続きました。テンポよく動く行動パターンが「慎重さ」のスコアに表れています。`);
    }

    // 積極性（avgHesitation — 慎重さと逆方向）
    if (avg < 1.0) {
        comments.push(`迷わずどんどん仕分けるスピード感が「積極性」の高スコアにつながっています。`);
    } else if (avg > 2.0) {
        comments.push(`じっくり確認するスタイルのため、「積極性」はやや控えめのスコアになっています。`);
    }

    return comments;
}

/** 荷物仕分けゲームの行動データカード用 褒め言葉マップ */
const SORTER_PRAISE_MAP: Record<string, { above: string; below: string }> = {
    '平均判断時間(ms)': {
        above: '丁寧に確認してから動く慎重さが光る！確実性を重視する信頼できるタイプ。',
        below: '瞬時に正解を掴む直感力が抜群！スピーディーに動ける行動力の持ち主。',
    },
    '誤仕分け率(%)': {
        above: 'スピードを優先して果敢に挑む積極性がある！大胆に行動できるチャレンジャー。',
        below: '高い正確性でこなす集中力が光る！プレッシャーの中でも精度を保てる実力派。',
    },
    '流出ミス(回)': {
        above: '一つひとつに集中して向き合う丁寧さがある！深い集中力の持ち主。',
        below: '全体を見渡しながら判断できる俯瞰力がある！マルチタスクが得意なタイプ。',
    },
    'パニッククリック(回)': {
        above: '全力で解決しようとする熱意と行動力がある！諦めない粘り強さが武器。',
        below: 'トラブルにも動じない冷静な判断力！どんな状況でも平常心を保てる強さがある。',
    },
    'ルール適応速度(ms)': {
        above: '一度身についたルールを丁寧に守る一貫性がある！確実にこなす安定感が武器。',
        below: '新ルールへの素早い切り替えが光る！柔軟な思考と高い学習能力の持ち主。',
    },
};

function buildDetails(data: SorterGameData | undefined, result: SorterGameAnalyzeResult): GameDetail {
    const metrics = [
        {
            label: '平均判断時間(ms)',
            user: Math.round(result.avgHesitationMs),
            average: 1500,
            category: 'time',
        },
        {
            label: '誤仕分け率(%)',
            user: Math.round(result.wrongSortRate * 100),
            average: 15,
            category: 'sort',
        },
        {
            label: '流出ミス(回)',
            user: data?.outflowMissCount ?? 0,
            average: 2,
            category: 'sort',
        },
        {
            label: 'パニッククリック(回)',
            user: data?.panicClickCount ?? THRESHOLDS.panicClick.fallback,
            average: 3,
            category: 'input',
        },
        {
            label: 'ルール適応速度(ms)',
            user: data?.ruleChangeAdaptMs ?? THRESHOLDS.adaptMs.fallback,
            average: 5000,
            category: 'time',
        },
    ];

    return {
        game_id: sorterGameModule.id,
        title: sorterGameModule.title,
        feature_scores: [
            { axis: 'caution', name: '慎重さ', score: result.scores.caution },
            { axis: 'calmness', name: '冷静さ', score: result.scores.calmness },
            { axis: 'logic', name: '論理性', score: result.scores.logic },
            { axis: 'positivity', name: '積極性', score: result.scores.positivity },
        ],
        metrics,
        analysis_comment: data ? buildAnalysisComment(data, result) : [],
        top_deviation_metrics: buildTopDeviationMetrics(metrics, SORTER_PRAISE_MAP),
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
    buildHighlights: (data: unknown, result: unknown) =>
        buildHighlights(data as SorterGameData | undefined, result as SorterGameAnalyzeResult),
};
