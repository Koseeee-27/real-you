import { TermsGameData, termsGameDataSchema } from '../../schemas/games/termsGame';
import type { GameDetail } from '../../schemas/results';
import { linear, linearInv, logNorm } from '../scoreUtils';

/**
 * 利用規約ゲーム（terms_game）の分析モジュール。
 *
 * Issue #100 で `scoreCalculator.ts` 側にあった analyze ロジックと
 * 旧 `phaseSummaryBuilder.ts` の Phase 1 テキスト生成ロジックを 1 ファイルに凝集した。
 * Issue #102 で旧 `scoreCalculator.ts` の `details: [...]` 内の terms_game 要素を移管。
 *
 * 【アップデート】
 * 単純な滞在時間や移動距離による静的な評価を廃止し、取得可能な31個の全データポイントを
 * 認知科学およびHCI（ヒューマンコンピューターインタラクション）で実証された6つの
 * 数理モデルへ入力する動的解析エンジンへ改修した。
 *
 * - `analyze(data)`: 行動データから HCIモデルに基づき5軸のスコアと中間メトリクスを算出
 * - `buildSummary(data)`: 行動データを日本語の要約テキストに整形
 * - `buildDetails(data, result)`: 結果画面の details 用構造体を構築
 */

/**
 * `analyze()` の戻り値型。
 *
 * Issue #102 で構造を 2 階層に変更。
 * - `scores`: Partial<BaselineScores> 相当。aggregator の入力としてそのまま使える。
 * 新ロジック導入により、評価対象を既存の3軸から5軸（cooperativeness, positivityを追加）へ拡張。
 * - 残りのフィールド: 要約・details で使う中間統計量。HCIモデルの算出結果を反映するため
 * `invalidButtonClickCount` と `randomToggleCount` を追加した。
 */
export type TermsGameAnalyzeResult = {
    scores: { caution: number; logic: number; calmness: number; cooperativeness: number; positivity: number };
    changedCount: number;
    averageSpeed: number;
    reversalCount: number;
    invalidButtonClickCount: number;
    randomToggleCount: number;
};

/**
 * [1] 意思決定のドリフト拡散モデル (DDM) & [5] Lévy flight (レヴィ飛行)
 *
 * 滞在時間やスクロールの時系列データを解析し、情報収集の推進力と探索の最適性を算出する。
 *
 * 活用データ:
 * - `totalTime`: アクティブ時間の分母
 * - `scrollEvents[].position`: 総移動距離（ドリフト率の分子）、ステップ長（Lévy飛行）
 * - `scrollEvents[].timestamp`: 速度算出用の期間
 * - `agreeButtonHoverTimeMs`: 決断境界（慎重さ）の閾値
 */
function computeLevyFlightAndDDM(data: TermsGameData) {
    const scrollEvents = data.scrollEvents || [];
    let totalDistance = 0;
    let longJumps = 0;
    let microSteps = 0;
    let reversalCount = 0;

    for (let i = 1; i < scrollEvents.length; i++) {
        const diff = Math.abs(scrollEvents[i].position - scrollEvents[i - 1].position);
        const signedDiff = scrollEvents[i].position - scrollEvents[i - 1].position;
        totalDistance += diff;
        
        // 負の変位（上方向へのスクロール）を逆行確認としてカウント
        if (signedDiff < 0) reversalCount++;

        // Lévy flightの冪乗近似: 1000px以上の大局的ジャンプと、10px以上の局所的探索の比率を測る
        if (diff > 1000) longJumps++;
        else if (diff > 10) microSteps++;
    }

    // DDM: 入力の下限を保証して安全に計算する
    const totalTimeMs = Math.max(0, (data.totalTime || 0) * 1000);
    // 非決定時間(1000ms) を除外したアクティブ時間を算出。最低1msを保証してゼロ除算を回避
    const activeTime = Math.max(1, totalTimeMs - 1000);

    // ドリフト率 v (情報収集効率)。高いほど決断へ向かう推進力（積極性）があると解釈する
    const driftRate = totalDistance / activeTime;

    // 決断境界 a (ホバー時間)。負数の可能性を防ぐ
    const boundaryA = Math.max(0, data.agreeButtonHoverTimeMs || 0);

    const levyRatio = microSteps > 0 ? longJumps / microSteps : 0;

    const lastEvent = scrollEvents[scrollEvents.length - 1];
    const firstTimestamp = scrollEvents[0]?.timestamp ?? lastEvent?.timestamp ?? 0;
    const duration = lastEvent ? Math.max(1, lastEvent.timestamp - firstTimestamp) : 1;
    const averageSpeed = (totalDistance > 0 && duration > 0) ? (totalDistance / duration) * 1000 : 0;

    return { driftRate, boundaryA, levyRatio, reversalCount, averageSpeed };
}

/**
 * [2] Hawkes過程 (自己励起型点過程によるパニック連鎖モデル)
 *
 * エラーというストレスイベントを起点とし、その後の無秩序なクリックが
 * どのように連鎖・減衰していくかを指数関数を用いてモデル化する。
 *
 * 活用データ:
 * - `errorEvents[].timestamp`: パニック励起の起点時間
 * - `postErrorClicks[].timestamp`: 起点からの遅延時間（減衰計算用）
 * - `postErrorClicks[].type`: クリック種別（励起強度 α の重み付け用）
 */
function computeHawkesProcess(data: TermsGameData) {
    const errorEvents = data.errorEvents || [];
    const postErrorClicks = data.postErrorClicks || [];
    
    let intensity = 0;
    const beta = 0.002; // 時間経過に伴うパニックの指数減衰パラメータ
    
    errorEvents.forEach((err) => {
        postErrorClicks.forEach((click) => {
            if (click.timestamp > err.timestamp) {
                const dt = Math.max(0, click.timestamp - err.timestamp);
                let alpha = 1.0;

                // クリックの種別によってパニックの度合い（励起強度）を変動させる
                switch (click.type) {
                    case 'agree': alpha = 2.0; break;       // 無効と分かっているボタンの連打はパニック度最大
                    case 'errorDialog': alpha = 1.5; break; // エラーダイアログへの苛立ち
                    case 'other': alpha = 1.0; break;       // ランダムな場所のクリック
                    case 'checkbox': alpha = 0.5; break;    // 解決に向けた操作は冷静とみなす
                }

                // アンダーフロー対策: 非常に小さい寄与は切り捨てる
                const contribution = alpha * Math.exp(-beta * dt);
                intensity += contribution < 1e-10 ? 0 : contribution;
            }
        });
    });
    
    return intensity;
}

/**
 * [3] Fittsの法則の拡張 (運動制御ノイズ評価)
 *
 * ポップアップを閉じる操作における、目標到達難易度と運動制御ノイズの比率を評価する。
 *
 * 活用データ:
 * - `popupStats.mouseJitter`: 基本の運動ノイズ
 * - `popupStats.clickCount`: ミスクリックによる追加のノイズペナルティ
 * - `popupStats.timeToClose`: 目標到達時間
 */
function computeFittsLaw(data: TermsGameData) {
    //データ欠損時は中立の比率11を返す。
    if (!data.popupStats) return 11;
    // popupStats は高速スクロール時などに欠損する可能性があるため、フォールバック値を設定
    const jitter = Math.max(0, data.popupStats.mouseJitter);
    const timeToClose = Math.max(1, data.popupStats.timeToClose);
    const clickCount = Math.max(1, Math.trunc(data.popupStats.clickCount));

    // 基本のジッターにミスクリック1回あたり50pxのペナルティを合成し、実効的な運動ノイズとする
    const effectiveJitter = jitter + Math.max(0, clickCount - 1) * 50;
    
    // ターゲットまでの難易度(ID)が一定とした場合のノイズ比率。大きいほど正確（冷静）と解釈
    const fittsRatio = timeToClose / Math.max(1, effectiveJitter);
    
    return fittsRatio;
}

/**
 * [4] Hick-Hymanの法則 (認知情報処理の効率化モデル)
 *
 * 複数の選択肢（チェックボックス）の中から必要な情報を特定して処理するまでの
 * 反応時間(RT)と、処理した情報量(エントロピー)の比率から論理的処理効率を導出する。
 *
 * 活用データ:
 * - `checkboxEvents[].timestamp`: 操作反応時間(RT)の算出
 * - `checkboxEvents[].newState.checked/changed`: 動的な状態遷移の複雑さ
 * - `checkboxStates[].changed`: 最終的に確定した情報量（エントロピー）の算出
 */
function computeHickHyman(data: TermsGameData) {
    const checkboxEvents = data.checkboxEvents || [];
    
    let totalRT = 0;
    let validEvents = 0;
    let dynamicEntropy = 0;
    
    // 操作ごとの反応時間（RT）を合算。放置・離席とみられる10秒以上の間隔はノイズとしてカットする
        checkboxEvents.forEach((event, i) => {
        const dt = i === 0 ? event.timestamp : event.timestamp - checkboxEvents[i - 1].timestamp;
    
        if (dt > 0 && dt < 10000) {
        totalRT += dt;
        validEvents++;
        }
        
        // 状態遷移の複雑さをエントロピーの重みとして加算（ONへの変更や、状態の反転は負荷が高いとみなす）
        const stateComplexity = checkboxEvents[i].newState.checked ? 1.2 : 0.8;
        const actionComplexity = checkboxEvents[i].newState.changed ? 1.5 : 1.0;
        dynamicEntropy += stateComplexity * actionComplexity;
    });
    
    // 各条項の最終的な変更フラグを取得（undefined を排除して安全に判定）
    const rcChanged = data.checkboxStates?.readConfirm?.changed ? 1 : 0;
    const mmChanged = data.checkboxStates?.mailMagazine?.changed ? 1 : 0;
    const tpChanged = data.checkboxStates?.thirdPartyShare?.changed ? 1 : 0;
    const finalChanges = rcChanged + mmChanged + tpChanged;
    
        const entropyValue = (dynamicEntropy + 1) * (finalChanges + 1);
        const totalEntropy = entropyValue > 0 ? Math.log2(entropyValue) : 0;
    
    // 処理効率: RT / Entropy。値が小さいほど、複雑な処理を短時間で論理的にさばけたことを意味する
    const processingEfficiency = totalEntropy > 0 && validEvents > 0 ? totalRT / totalEntropy : 15000;
    
    return { processingEfficiency, finalChanges };
}

/**
 * [6] 吸収状態までのMFPT (マルコフ連鎖における平均初回通過時間・最短経路逸脱度)
 *
 * エラー発生から目標達成（同意）に至るまでのリカバリー手順の無駄のなさと、
 * システムのデフォルト設定（現状維持バイアス）への順応度を総合的に評価する。
 *
 * 活用データ:
 * - `errorEvents[].reason / scrollPositionAtError`: エラー原因と復帰の初期コスト
 * - `checkboxEvents[].target / afterError`: 最短経路からの逸脱判定
 * - `postErrorClicks`: リカバリーステップ数の加算
 * - `checkboxStates`, `finalAction`, `reachedBottom`: 各種ボーナス・順応判定
 */
function computeMFPT(data: TermsGameData) {
    const errorEvents = data.errorEvents || [];
    const checkboxEvents = data.checkboxEvents || [];
    const postErrorClicks = data.postErrorClicks || [];
    
    let totalRecoverySteps = 0;
    let pathDeviation = 0;
    let panicMisclickCount = 0; // 追加: 1秒以内の反射的な誤操作をカウント
    
    // エラーからのリカバリー経路を評価
    if (errorEvents.length > 0 && errorEvents[0]) {
        const firstErrorTime = errorEvents[0].timestamp;
        const targetReason = errorEvents[0].reason || 'missing_read_confirm';
        
        // エラー発生位置が遠い（2000px以上）場合、戻るためのスクロールをリカバリーの初期コストとして加算
        const errorPosPenalty = errorEvents[0].scrollPositionAtError > 2000 ? 1 : 0; 
        totalRecoverySteps += errorPosPenalty;
        
        //二重カウント防止のため、エラー発生後のクリックでチェックボックス以外の操作をリカバリー手順として加算
        totalRecoverySteps += postErrorClicks.filter(
            (c) => c.timestamp > firstErrorTime && c.type !== 'checkbox'
        ).length;

        checkboxEvents.filter((c) => c.afterError && c.timestamp > firstErrorTime).forEach((c) => {
            totalRecoverySteps++;
            if (c.target === 'readConfirm' && targetReason.includes('read_confirm')) {
                if (!c.newState.checked) {
                    const timeSinceError = c.timestamp - firstErrorTime;
                    if (timeSinceError < 1000) {
                        // 1秒以内の操作は「論理的逸脱」ではなく「焦りによるミスクリック」として処理
                        panicMisclickCount++;
                    } else {
                        // 熟考後のOFF操作は明確な「論理的逸脱」としてペナルティ
                        pathDeviation += 2;
                    }
                }
            } else {
                // エラー原因に無関係なターゲットの操作（迷走）
                pathDeviation += 1;
                if (c.newState.changed) pathDeviation += 0.5;
            }
        });
    }

    // 各条項の最終的な吸収状態（目標達成）を確認
    const rcChecked = data.checkboxStates?.readConfirm?.checked ? 1 : 0;
    const mmChecked = data.checkboxStates?.mailMagazine?.checked ? 1 : 0;
    const tpChecked = data.checkboxStates?.thirdPartyShare?.checked ? 1 : 0;

    // 現状維持バイアスの順応度（デフォルトONの不利益な条件を、波風を立てずそのまま受け入れた数）
    const statusQuoCompliance = mmChecked + tpChecked; 
    
    // UIルールと目標達成の絶対加点用フラグ
    const finalAbsorbed = data.finalAction === 'agree' ? 1 : 0;
    const goalReached = rcChecked === 1 ? 1 : 0;
    const reachedBottomBonus = data.reachedBottom ? 1 : 0;

    return { totalRecoverySteps, pathDeviation, statusQuoCompliance, finalAbsorbed, goalReached, reachedBottomBonus, panicMisclickCount }
}

/**
 * 利用規約ゲームの行動データ → 5軸の最終スコアと中間統計量の算出。
 *
 * 評価軸（HCI数理モデル適用版）:
 * - 慎重さ(caution): DDM決断境界(ホバー時間) + Lévy飛行逆行深さ
 * - 冷静さ(calmness): Hawkesパニック連鎖の少なさ + Fitts運動制御ノイズの少なさ
 * - 論理性(logic): Hick-Hyman処理効率 + MFPT経路逸脱の少なさ + 静的隠しトラップ発見
 * - 協調性(cooperativeness): MFPTリカバリー(即順応) + 現状維持バイアス + UI同調・目標達成ボーナス
 * - 積極性(positivity): DDMドリフト率(決断の推進力) + Lévy飛行のジャンプ割合
 */
function analyze(data: TermsGameData | undefined): TermsGameAnalyzeResult {
    // 早期 return は通常 return と同じ shape を返す（欠損プロパティへのアクセス防止）
    if (!data) {
        return {
            scores: { caution: 50, logic: 50, calmness: 50, cooperativeness: 50, positivity: 50 },
            changedCount: 0, averageSpeed: 0, reversalCount: 0, invalidButtonClickCount: 0, randomToggleCount: 0,
        };
    }

    // 各HCI数理モデルの計算を実行
    const ddm = computeLevyFlightAndDDM(data);
    const hawkesIntensity = computeHawkesProcess(data);
    const fittsRatio = computeFittsLaw(data);
    const hick = computeHickHyman(data);
    const mfpt = computeMFPT(data);

    // 慎重さ: ホバー時間の長さと、再確認のための逆行回数から評価
    const sDDMCaution = logNorm(ddm.boundaryA, 100, 3000);
    const sLevyCaution = linear(ddm.reversalCount, 0, 5);
    const caution = Math.round(sDDMCaution * 0.7 + sLevyCaution * 0.3);

    // 冷静さ: エラー後のパニック連打の少なさと、ポップアップ操作の的確さから評価
    const effectiveHawkesIntensity = hawkesIntensity + (mfpt.panicMisclickCount * 2.0);
    const sHawkesCalmness = linearInv(effectiveHawkesIntensity, 0, 5);
    const sFittsCalmness = linear(fittsRatio, 2, 20);
    const calmness = Math.round(sHawkesCalmness * 0.6 + sFittsCalmness * 0.4);

    // 論理性: チェック変更の処理効率、エラー後の迷走の少なさ、隠し指示への気づきから評価
    const sHickLogic = linearInv(hick.processingEfficiency, 500, 10000);
    const sMfptLogic = linearInv(mfpt.pathDeviation, 0, 3);
        // 隠し指示の入力判定（文字列比較の仕様）
        // フロントエンドにてエスケープ済み、あるいは純粋な文字列として送信される前提に基づき、
        // "確認済み" という文字列との完全一致により 100% のボーナスを付与する意図的な実装。
    const sHidden = linear(data.hiddenInput === '確認済み' ? 1 : data.hiddenInput ? 0.5 : 0, 0, 1);
    const logic = Math.round(sHickLogic * 0.4 + sMfptLogic * 0.4 + sHidden * 0.2);

    // 協調性: 仕様書「ボーナス加点」に基づき、基底スコアに到達フラグ（各10点）を絶対加算する
    const sMfptCoop = linearInv(mfpt.totalRecoverySteps, 0, 5);
    const sStatusQuo = linear(mfpt.statusQuoCompliance, 0, 2);
    const cooperativeness = Math.round(
        sMfptCoop * 0.3 + 
        sStatusQuo * 0.4 + 
        (mfpt.reachedBottomBonus * 10) + 
        (mfpt.goalReached * 10) + 
        (mfpt.finalAbsorbed * 10)
    );

    // 積極性: 読むスピード（情報収集の推進力）と、自発的なジャンプ探索の多さから評価
    const sPositivityDrift = linear(ddm.driftRate * 1000, 100, 5000);
    const sLevyPositivity = linear(ddm.levyRatio, 0, 0.5);
    const positivity = Math.round(sPositivityDrift * 0.7 + sLevyPositivity * 0.3);

    // Details表示用メトリクス（エラー後の同意連打回数）
    const invalidButtonClickCount = (data.postErrorClicks || []).filter((c) => c.type === 'agree').length;

    return {
        // 全スコアを 0-100 の範囲に安全にクランプして返す
        scores: { 
            caution: Math.max(0, Math.min(100, caution)), 
            logic: Math.max(0, Math.min(100, logic)), 
            calmness: Math.max(0, Math.min(100, calmness)), 
            cooperativeness: Math.max(0, Math.min(100, cooperativeness)), 
            positivity: Math.max(0, Math.min(100, positivity)) 
        },
        changedCount: hick.finalChanges,
        averageSpeed: ddm.averageSpeed,
        reversalCount: ddm.reversalCount,
        invalidButtonClickCount,
        randomToggleCount: mfpt.pathDeviation,
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
    
    // computeScrollMetrics の代わりに computeLevyFlightAndDDM を利用して型安全に平均速度を取得
    const { averageSpeed: speed } = computeLevyFlightAndDDM(data);
    
    const speedText = speed > 2000 ? '爆速でスクロールし' : speed < 1000 ? 'じっくりと読み込み' : '平均的な速度で確認し';
    
    // mailMagazine は初期値 ON のため checked === true が「外し忘れ＝罠にひっかかった」判定
    const mailChecked = data.checkboxStates?.mailMagazine?.checked;
    const trapText = mailChecked ? 'メルマガの罠に見事に引っかかりました。' : '不要なチェックは見逃さず外しました。';

    return `規約を${speedText}、わずか${timeSec}秒で同意ボタンを押しました。${trapText}`;
}

/**
 * 利用規約ゲームの行動データ + analyze 結果 → 結果画面 details 用の構造体。
 *
 * `feature_scores` / `metrics` の各値は仕様書「データ構造」→ `GameDetail` 準拠。
 * 新ロジックへの移行に伴い、表示対象のスコアを3軸から5軸へ拡張し、
 * トラップ・エラー操作のメトリクス（連打回数、無関係操作）を追加した。
 */
function buildDetails(data: TermsGameData | undefined, result: TermsGameAnalyzeResult): GameDetail {
    return {
        game_id: termsGameModule.id,
        title: termsGameModule.title,
        feature_scores: [
            { axis: 'caution', name: '慎重さ', score: result.scores.caution },
            { axis: 'logic', name: '論理性', score: result.scores.logic },
            { axis: 'calmness', name: '冷静さ', score: result.scores.calmness },
            { axis: 'cooperativeness', name: '協調性', score: result.scores.cooperativeness },
            { axis: 'positivity', name: '積極性', score: result.scores.positivity },
        ],
        metrics: [
            { label: '読了速度(px/s)', user: Math.round(result.averageSpeed ?? 0), average: 800, category: 'scroll' },
            { label: '総滞在時間(秒)', user: Number((data?.totalTime ?? 0).toFixed(1)), average: 15.0, category: 'time' },
            { label: '決断前迷い(ms)', user: data?.agreeButtonHoverTimeMs ?? 0, average: 1200, category: 'mouse' },
            { label: '逆行確認(回)', user: result.reversalCount ?? 0, average: 2.1, category: 'scroll' },
            { label: 'マウスブレ(px)', user: data?.popupStats?.mouseJitter ?? 0, average: 12.0, category: 'mouse' },
            { label: '同意ボタン連打(回)', user: result.invalidButtonClickCount ?? 0, average: 0.5, category: 'mouse' },
            { label: '無関係操作(回)', user: result.randomToggleCount ?? 0, average: 0.2, category: 'input' },
        ],
    };
}

/**
 * 利用規約ゲーム（terms_game）モジュール。
 *
 * `analysis/registry.ts` の `GAME_MODULES` から参照される。
 * registry の schema で zod-parsed された data が境界を経て届く前提。
 */
export const termsGameModule = {
    id: 'terms_game' as const,
    title: '利用規約ゲーム',
    schema: termsGameDataSchema,
    analyze: (data: unknown) => analyze(data as TermsGameData | undefined),
    buildSummary: (data: unknown) => buildSummary(data as TermsGameData | undefined),
    buildDetails: (data: unknown, result: unknown) =>
        buildDetails(data as TermsGameData | undefined, result as TermsGameAnalyzeResult),
};