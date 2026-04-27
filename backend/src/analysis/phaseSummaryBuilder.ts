import { PhaseSummaries } from '../types';
import { Game1Data, Game2Data, Game3Data } from '../schemas/gameData';

/**
 * 各フェーズの行動データから、結果画面に表示するサマリーテキストを生成する
 *
 * - 各ゲームの raw_data を受け取って、ユーザーの行動を日本語テキストにまとめる
 * - 例: 「利用規約を12秒で同意しました。読了率8%」
 * - raw_data の構造は ANALYSIS_GUIDE.md を参照
 */
export function buildPhaseSummaries(
    game1Raw: Game1Data | undefined,
    game2Raw: Game2Data | undefined,
    game3Raw: Game3Data | undefined,
    game1Metrics?: { averageSpeed?: number },
): PhaseSummaries {

    // --- Phase 1: 利用規約ゲームの要約 ---
    let phase1Text = 'データなし';
    if (game1Raw) {
        const timeSec = (game1Raw.totalTime ?? 0).toFixed(1);
        // scrollEvents から算出済みの平均速度を calculateGame1() の戻り値経由で受け取る
        // （仕様書上、FE は scrollEvents のみ送信する設計）
        const speed = game1Metrics?.averageSpeed ?? 0;
        const speedText = speed > 2000 ? '爆速でスクロールし' : speed < 1000 ? 'じっくりと読み込み' : '平均的な速度で確認し';

        // 仕様書「データ構造 → Game1Data → checkboxStates」で mailMagazine は { checked, changed } 形式
        // mailMagazine は初期値 ON のため checked === true が「外し忘れ＝罠にひっかかった」判定
        let trapText = '';
        const mailChecked = game1Raw.checkboxStates?.mailMagazine?.checked;
        if (mailChecked) trapText = 'メルマガの罠に見事に引っかかりました。';
        else trapText = '不要なチェックは見逃さず外しました。';

        phase1Text = `規約を${speedText}、わずか${timeSec}秒で同意ボタンを押しました。${trapText}`;
    }

    // --- Phase 2: AIチャットの要約 ---
    let phase2Text = 'データなし';
    if (game2Raw) {
        const turns = game2Raw.turns || [];

        // 仕様書「分析ロジック → Game 2 → Null 値（テキスト入力時）の扱い → サマリーテキスト
        // （phase_summaries）も同じ方針」に従い、null（= テキスト入力ターン）を除外して平均を取る。
        // scoreCalculator.ts L202-208 と同じ集計方針で揃え、テキストとスコアで評価が食い違わないようにする。
        const reactValues = turns
            .map((t) => t.reactionTimeMs)
            .filter((v): v is number => v !== null);

        // turns 0 件の場合も「反応速度を測定していない」状態として全ターンテキスト相当に扱う
        // （scoreCalculator も avgReact=2000 にフォールバックする方針）。
        const allTextOrEmpty = reactValues.length === 0;
        const allVoice = turns.length > 0 && reactValues.length === turns.length;

        if (allTextOrEmpty) {
            // 全ターンテキスト: 反応速度に言及しない（仕様書例文に準拠）
            phase2Text = 'テキストで冷静に反論を展開しました。';
        } else {
            const avgReaction = reactValues.reduce((a, v) => a + v, 0) / reactValues.length;
            const reactionText = avgReaction < 800 ? 'AIの理不尽な対応に即座に反応し' : 'AIの対応に対して一呼吸おいてから';

            if (allVoice) {
                phase2Text = `${reactionText}、音声で堂々と反論を展開しました。`;
            } else {
                // 混在: null 除外平均で反応速度を判定し、method は Game2Data 直下の inputMethod を採用
                const method = game2Raw.inputMethod === 'voice' ? '音声で堂々と' : 'テキストで冷静に';
                phase2Text = `${reactionText}、${method}反論を展開しました。`;
            }
        }
    }

    // --- Phase 3: グループチャットの要約 ---
    let phase3Text = 'データなし';
    if (game3Raw) {
        const stages = game3Raw.stages || [];
        
        // 多数派（仮に選択肢1と2を多数派とする）を選んだ回数で同調率を算出
        const conformCount = stages.filter((s) => s.selectedOptionId === 1 || s.selectedOptionId === 2).length;
        const conformRate = (conformCount / (stages.length || 1)) * 100;
        
        const socialText = conformRate >= 60 ? 'グループの空気を敏感に察知して周りに合わせ' : '周りに流されず我が道をゆく選択肢を取り';
        
        // サマリーテキスト用の平均反応速度。`?? 2000` は中立値（Phase 2 と同じ方針）。
        // scoreCalculator.ts 側は `?? 0` のため、null 混入時の挙動差は Issue #11 派生で整合化する。
        const avgReaction = stages.length > 0
            ? stages.reduce((sum, s) => sum + (s.reactionTimeMs ?? 2000), 0) / stages.length
            : 2000;
        const speedText = avgReaction < 2000 ? '即決でアクションを起こしました。' : '慎重にタイミングを伺いました。';

        phase3Text = `${socialText}、${speedText}`;
    }

    return {
        phase_1: phase1Text,
        phase_2: phase2Text,
        phase_3: phase3Text,
    };
}