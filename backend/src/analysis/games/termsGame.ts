import { TermsGameData, termsGameDataSchema } from '../../schemas/games/termsGame';
import type { GameDetail } from '../../schemas/results';
import { linear, linearInv, logNorm, buildTopDeviationMetrics } from '../scoreUtils';

/**
 * 利用規約ゲーム（terms_game）の分析モジュール。
 *
 * Issue #100 で `scoreCalculator.ts` 側にあった analyze ロジックと
 * 旧 `phaseSummaryBuilder.ts` の Phase 1 テキスト生成ロジックを 1 ファイルに凝集した。
 * Issue #102 で旧 `scoreCalculator.ts` の `details: [...]` 内の terms_game 要素
 * （title / feature_scores / metrics）も `buildDetails` として本ファイルに移管し、
 * scoreCalculator は薄い統合層に縮小した。
 *
 * - `analyze(data)`: 行動データから 5 軸の中間集計（慎重さ・論理性・冷静さ）と
 *   要約に使う中間メトリクスを算出
 * - `buildSummary(data)`: 行動データを日本語の要約テキストに整形
 * - `buildDetails(data, result)`: 結果画面の details 用構造体（feature_scores / metrics）を構築
 */

/**
 * `analyze()` の戻り値型。
 *
 * Issue #102 で構造を 2 階層に変更:
 * - `scores`: Partial<BaselineScores> 相当。aggregator の入力 / game_breakdown の
 *   `scores` フィールドにそのまま使える（軸-ゲーム対応はモジュール側に集約）。
 * - 残りのフィールド: 要約・details で使う中間統計量（averageSpeed 等）。
 *
 * 旧構造（フラット）から `scores` を分離する目的は、scoreCalculator が
 * 「軸スコアと中間メトリクス」を判別するロジックを持たずに済むようにするため。
 * scores キーは `keyof BaselineScores` の部分集合で、当該ゲームが測定する軸のみ。
 */
export type TermsGameAnalyzeResult = {
    scores: { caution: number; logic: number; calmness: number };
    changedCount: number;
    averageSpeed: number;
    reversalCount: number;
    /** 規約画面の滞在時間（秒）。feedbackGenerator / buildHighlights で使用 */
    totalTime: number;
};

/**
 * scrollEvents から平均スクロール速度（px/s）と逆行スクロール回数を算出する内部 helper。
 *
 * `analyze()` と `buildSummary()` の両方から呼ばれる。旧構造では analyze ロジック
 * の戻り値経由で要約生成側に averageSpeed を引き渡していたが、
 * モジュール分割後は両関数が独立呼び出しになるため、内部で再計算する。
 * O(N) で軽量、計測値も同一になる。
 */
function computeScrollMetrics(scrollEvents: TermsGameData['scrollEvents']) {
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
    const duration = (lastEvent?.timestamp || 1) - (scrollEvents[0]?.timestamp || 0);

    const averageSpeed = duration > 0 ? (totalDistance / duration) * 1000 : 0;

    return { averageSpeed, reversalCount };
}

/**
 * 利用規約ゲームの行動データ → 慎重さ・論理性・冷静さの中間集計。
 *
 * 評価軸:
 * - 慎重さ(caution): 滞在時間・スクロール速度・迷い時間・チェック変更
 * - 論理性(logic): 再確認行動・逆行スクロール・ポップアップ処理
 * - 冷静さ(calmness): マウスブレ・無駄クリック
 */
function analyze(data: TermsGameData | undefined): TermsGameAnalyzeResult {
    // 早期 return は通常 return と同じ shape を返す（buildDetails 側で欠損プロパティに
    // アクセスして undefined がレスポンスに漏れるのを防ぐため）
    if (!data)
        return {
            scores: { caution: 50, logic: 50, calmness: 50 },
            changedCount: 0,
            averageSpeed: 0,
            reversalCount: 0,
            totalTime: 0,
        };

    const totalTimeMs = (data.totalTime || 0) * 1000;

    const scrollEvents = data.scrollEvents || [];
    const { averageSpeed: speed, reversalCount } = computeScrollMetrics(scrollEvents);

    // checkboxStates の各エントリは { checked, changed } 形式。
    // 型は TermsGameData の indexed access で導出する（gameData.ts 側に新規 export を作らない）。
    const checkboxChanged = Object.values(data.checkboxStates).filter((c) => c.changed).length;

    //慎重さ: 滞在時間・スクロール速度・迷い時間・チェック変更
    const sTime = logNorm(totalTimeMs, 2000, 30000);
    const sScroll = linearInv(speed, 800, 4000);
    const sHover = logNorm(data.agreeButtonHoverTimeMs ?? 0, 100, 3000);
    const sCheckbox = linear(checkboxChanged, 0, 3);

    const caution = Math.round(sTime * 0.3 + sScroll * 0.25 + sHover * 0.25 + sCheckbox * 0.2);

    //論理性: 再確認行動・逆行スクロール・ポップアップ処理
    const hiddenMatch = data.hiddenInput === '確認済み' ? 1 : data.hiddenInput ? 0.5 : 0;

    const sHidden = linear(hiddenMatch, 0, 1);
    const sReversal = linear(reversalCount, 0, 5);
    const sPopupDelay = logNorm(data.popupStats?.timeToClose ?? 0, 0, 2000);

    const logic = Math.round(sHidden * 0.4 + sReversal * 0.3 + sPopupDelay * 0.3);

    //冷静さ: マウスブレ・無駄クリック
    // 仕様書「分析ロジック → エッジケースの扱い → Game 1 の個別フォールバック」に従い、
    // popupStats 欠損時は worst 値（linearInv の第 3 引数）にフォールバックする。
    // popupStats はポップアップが timeout で表示されない場合（高速スクロール時）や送信失敗時に欠損するが、
    // どちらも「測定不能 / 冷静ではない」として 0 点扱いとする（best 値だと 100 点になり不当に高得点となる）。
    const sJitter = linearInv(data.popupStats?.mouseJitter ?? 200, 10, 200);
    const sClick = linearInv(data.popupStats?.clickCount ?? 5, 1, 5);

    const calmness = Math.round(sJitter * 0.6 + sClick * 0.4);

    return {
        scores: { caution, logic, calmness },
        changedCount: checkboxChanged,
        averageSpeed: speed,
        reversalCount,
        totalTime: data.totalTime ?? 0,
    };
}

/**
 * 利用規約ゲームの行動データ → 結果画面に表示するサマリーテキスト。
 *
 * 例: 「規約をじっくりと読み込み、わずか12.3秒で同意ボタンを押しました。メルマガの罠に見事に引っかかりました。」
 */
function buildSummary(data: TermsGameData | undefined): string {
    if (!data) return 'データなし';

    const timeSec = (data.totalTime ?? 0).toFixed(1);
    // scrollEvents から自前で算出（旧構造では analyze ロジックの戻り値経由で受け取っていた）。
    // 仕様書上、FE は scrollEvents のみ送信する設計のため、raw_data には scrollMetrics は無い。
    const { averageSpeed: speed } = computeScrollMetrics(data.scrollEvents || []);
    const speedText =
        speed > 2000 ? '爆速でスクロールし' : speed < 1000 ? 'じっくりと読み込み' : '平均的な速度で確認し';

    // 仕様書「データ構造 → TermsGameData → checkboxStates」で mailMagazine は { checked, changed } 形式
    // mailMagazine は初期値 ON のため checked === true が「外し忘れ＝罠にひっかかった」判定
    let trapText = '';
    const mailChecked = data.checkboxStates?.mailMagazine?.checked;
    if (mailChecked) trapText = 'メルマガの罠に見事に引っかかりました。';
    else trapText = '不要なチェックは見逃さず外しました。';

    return `規約を${speedText}、わずか${timeSec}秒で同意ボタンを押しました。${trapText}`;
}

/**
 * 利用規約ゲームの行動データ + analyze 結果 → 結果画面 details 用の構造体。
 *
 * Issue #102 で旧 `scoreCalculator.ts` の `details: [...]` の terms_game 要素を移管。
 * scoreCalculator が「どの軸を測るか」「どのメトリクスを表示するか」を意識せず
 * モジュール側から `GameDetail` を完成形で受け取れるようにした。挙動は完全同一。
 *
 * `feature_scores` / `metrics` の各値は仕様書「データ構造」→ `GameDetail` 準拠。
 * `metrics` の平均値・カテゴリは旧 scoreCalculator の値をそのまま転記している。
 */
function buildHighlights(data: TermsGameData | undefined, result: TermsGameAnalyzeResult) {
    const totalTime = data?.totalTime ?? 0;
    const AVERAGE_READ_TIME = 15; // 秒
    const readTimeText =
        totalTime < AVERAGE_READ_TIME
            ? `「同意する」ボタンを押すまで、規約をわずか${totalTime.toFixed(1)}秒しか見ませんでした。`
            : `「同意する」ボタンを押すまで、規約を${totalTime.toFixed(1)}秒かけてじっくり読んでいました。`;

    return [
        {
            text: readTimeText,
            comparison: '平均は約15秒',
            reason: '読む時間の長さから〈慎重さ・論理性〉がわかるため',
        },
        {
            text: `同意ボタンに手を伸ばしてから押すまでの迷いは${((data?.agreeButtonHoverTimeMs ?? 0) / 1000).toFixed(1)}秒。`,
            comparison: '平均は約1.2秒',
            reason: 'クリック前の躊躇から〈大胆さ／慎重さ〉がわかるため',
        },
        {
            text: `規約を上にスクロールして読み返した回数は${result.reversalCount}回。`,
            comparison: '平均は2.1回',
            reason: '読み返しの有無から〈慎重さ〉がわかるため',
        },
    ];
}

/** 利用規約ゲームの解析コメント（軸スコアの根拠を複数文で説明） */
function buildAnalysisComment(data: TermsGameData, result: TermsGameAnalyzeResult): string[] {
    const comments: string[] = [];
    const totalTime = result.totalTime;
    const ratio = (totalTime / 15).toFixed(1);

    // 慎重さ
    if (totalTime > 30) {
        comments.push(`規約を${totalTime.toFixed(1)}秒かけて読み込みました（平均の約${ratio}倍）。この丁寧な読み込み行動が「慎重さ」の高評価につながっています。`);
    } else if (totalTime >= 15) {
        comments.push(`規約の滞在時間は${totalTime.toFixed(1)}秒と平均的でした。バランスよく確認する行動が「慎重さ」に反映されています。`);
    } else {
        comments.push(`規約をわずか${totalTime.toFixed(1)}秒で読み進めました。スピード重視の行動パターンが「慎重さ」のスコアに表れています。`);
    }

    // 冷静さ
    const clickCount = data.popupStats?.clickCount ?? 0;
    if (clickCount <= 2) {
        comments.push(`ポップアップ出現時のクリックは${clickCount}回と最小限。落ち着いた対応が「冷静さ」の高スコアにつながっています。`);
    } else if (clickCount > 3) {
        comments.push(`ポップアップ出現時に${clickCount}回クリック（平均3回）。予期せぬ状況への反応が「冷静さ」のスコアに影響しています。`);
    } else {
        comments.push(`ポップアップへの対応は${clickCount}回と平均的でした。`);
    }

    // 論理性
    if (data.hiddenInput === '確認済み') {
        comments.push(`隠しフィールドにも気づき「確認済み」と記入。細部まで確認する行動が「論理性」の高評価につながっています。`);
    } else if (result.reversalCount >= 3) {
        comments.push(`規約を${result.reversalCount}回読み返すなど、徹底した確認行動が「論理性」の高スコアにつながっています。`);
    } else {
        comments.push(`読み返し${result.reversalCount}回と、流れを重視したテンポよい進め方が「論理性」のスコアに表れています。`);
    }

    return comments;
}

/** 利用規約ゲームの行動データカード用 褒め言葉マップ */
const TERMS_PRAISE_MAP: Record<string, { above: string; below: string }> = {
    '読了速度(px/s)': {
        above: '情報を素早くスキャンできる！要点把握が得意な情報処理の達人。',
        below: '一語一句じっくり読む丁寧さがある！テキストを大切にする知性の持ち主。',
    },
    '総滞在時間(秒)': {
        above: '時間をかけてでも確実に読み込む粘り強さがある！細部を見逃さない知性の持ち主。',
        below: '必要な情報を素早く見抜ける！切れ味鋭い情報処理の持ち主。',
    },
    '決断前迷い(ms)': {
        above: '最後まで確認してから決断するリスク管理力が高い！',
        below: '迷いのない決断力がある！自信を持って動けるタイプ。',
    },
    'チェック変更(回)': {
        above: '細かい設定も見逃さない几帳面さが光る！契約書も安心して任せられるタイプ。',
        below: '直感で正解を掴む嗅覚がある！シンプルに判断できるタイプ。',
    },
    '逆行確認(回)': {
        above: '念入りに読み返す確認力が高い！ミスを未然に防ぐ慎重さの持ち主。',
        below: '一度で理解できる高い読解力がある！集中力と記憶力が優秀。',
    },
    'マウスブレ(px)': {
        above: '細やかな反応力の持ち主！感受性が豊かで変化に敏感。',
        below: '落ち着いた操作が示す安定したメンタル！プレッシャーに強い。',
    },
    '無駄クリック(回)': {
        above: '念入りに確認しに行く徹底力がある！しっかり確かめてから進む安心派。',
        below: '効率的な操作でムダのない動き！最小限のアクションで目標を達成できるタイプ。',
    },
};

function buildDetails(data: TermsGameData | undefined, result: TermsGameAnalyzeResult): GameDetail {
    const metrics = [
        {
            label: '読了速度(px/s)',
            user: Math.round(result.averageSpeed ?? 0),
            average: 800,
            category: 'scroll',
        },
        {
            label: '総滞在時間(秒)',
            user: Number((data?.totalTime ?? 0).toFixed(1)),
            average: 15.0,
            category: 'time',
        },
        {
            label: '決断前迷い(ms)',
            user: data?.agreeButtonHoverTimeMs ?? 0,
            average: 1200,
            category: 'mouse',
        },
        {
            label: 'チェック変更(回)',
            user: result.changedCount,
            average: 3.2,
            category: 'input',
        },
        {
            label: '逆行確認(回)',
            user: result.reversalCount ?? 0,
            average: 2.1,
            category: 'scroll',
        },
        {
            label: 'マウスブレ(px)',
            user: data?.popupStats?.mouseJitter ?? 0,
            average: 12.0,
            category: 'mouse',
        },
        {
            label: '無駄クリック(回)',
            user: data?.popupStats?.clickCount ?? 0,
            average: 1.5,
            category: 'mouse',
        },
    ];

    return {
        game_id: termsGameModule.id,
        title: termsGameModule.title,
        feature_scores: [
            { axis: 'caution', name: '慎重さ', score: result.scores.caution },
            { axis: 'logic', name: '論理性', score: result.scores.logic },
            { axis: 'calmness', name: '冷静さ', score: result.scores.calmness },
        ],
        metrics,
        analysis_comment: data ? buildAnalysisComment(data, result) : [],
        top_deviation_metrics: buildTopDeviationMetrics(metrics, TERMS_PRAISE_MAP),
    };
}

/**
 * 利用規約ゲーム（terms_game）モジュール。
 *
 * `analysis/registry.ts` の `GAME_MODULES` から参照される。
 * `id` は `phase_summaries` / `details` / `game_breakdown` 配列内の `game_id` として
 * 使われる文字列 ID（Phase 1 / Issue #97 で導入）と一致させる。
 *
 * registry の `GameModuleEntry` 型は各メソッドを `(data: unknown) => ...` として
 * 受け取るため、内部の typed 関数を薄いアダプタで unknown 入力に対応させる
 * （`gameService.ts` の `parseGameData` と同じトラスト境界パターン）。
 * data は registry の schema で zod-parsed されたものが境界を経て届く前提。
 */
export const termsGameModule = {
    id: 'terms_game' as const,
    title: '利用規約ゲーム',
    schema: termsGameDataSchema,
    analyze: (data: unknown) => analyze(data as TermsGameData | undefined),
    buildSummary: (data: unknown) => buildSummary(data as TermsGameData | undefined),
    buildDetails: (data: unknown, result: unknown) =>
        buildDetails(data as TermsGameData | undefined, result as TermsGameAnalyzeResult),
    buildHighlights: (data: unknown, result: unknown) =>
        buildHighlights(data as TermsGameData | undefined, result as TermsGameAnalyzeResult),
};
