import { BaselineScores } from '../types';

// ゲーム1のデータからスコアを算出
export function calculateGame1Scores(rawData: any): Partial<BaselineScores> {
    const scores: Partial<BaselineScores> = {};

    // 慎重さの計算
    let cautionScore = 0;

    // スクロール到達度
    if (rawData.scrollData?.reachedBottom) {
        cautionScore += 30;
    } else if (rawData.scrollData?.maxPosition) {
        const scrollPercent = rawData.scrollData.maxPosition / 5000; // 仮の総高さ
        cautionScore += scrollPercent * 30;
    }

    // 滞在時間
    if (rawData.totalTime > 60) {
        cautionScore += 20;
    } else {
        cautionScore += (rawData.totalTime / 60) * 20;
    }

    // チェックボックス
    if (rawData.checkboxes?.followedInstruction) {
        cautionScore += 20;
    }

    // スクロール速度指示
    if (rawData.slowReadInstruction?.checkboxChecked) {
        cautionScore += 15;
    }
    if (rawData.slowReadInstruction?.slowedDown) {
        cautionScore += 15;
    }

    scores.caution = Math.min(100, Math.round(cautionScore));

    // 論理性の計算
    let logicScore = 0;

    if (rawData.hiddenTask?.completed) {
        logicScore += 40;
    }
    if (rawData.checkboxes?.followedInstruction) {
        logicScore += 30;
    }
    if (rawData.slowReadInstruction?.checkboxChecked) {
        logicScore += 30;
    }

    scores.logic = Math.min(100, Math.round(logicScore));

    return scores;
}

// ゲーム2のデータからスコアを算出
export function calculateGame2Scores(rawData: any): Partial<BaselineScores> {
    const scores: Partial<BaselineScores> = {};

    // 積極性
    let positivityScore = 0;

    if (rawData.inputMethod === 'voice') {
        positivityScore += 30; // 音声を選んだ
    }

    const avgResponseTime = rawData.voiceTurns?.reduce((sum: number, turn: any) =>
        sum + turn.timeToStartSpeaking, 0) / (rawData.voiceTurns?.length || 1);

    if (avgResponseTime < 1) {
        positivityScore += 30; // すぐ喋り始める
    }

    const avgSpeechDuration = rawData.voiceTurns?.reduce((sum: number, turn: any) =>
        sum + turn.speechDuration, 0) / (rawData.voiceTurns?.length || 1);

    if (avgSpeechDuration > 15) {
        positivityScore += 20; // 長く喋る
    }

    if (rawData.turnCount >= 5) {
        positivityScore += 20; // 多くのターン
    }

    scores.positivity = Math.min(100, Math.round(positivityScore));

    // 論理性
    scores.logic = Math.min(100, rawData.languageAnalysis?.logicalWords * 10 || 0);

    // 冷静さ
    let calmnessScore = 100;
    calmnessScore -= (rawData.languageAnalysis?.emotionalWords || 0) * 20;
    calmnessScore -= (rawData.languageAnalysis?.exclamationMarks || 0) * 10;
    scores.calmness = Math.max(0, Math.round(calmnessScore));

    return scores;
}

// 複数ゲームのスコアを統合
export function combineScores(
    game1Scores: Partial<BaselineScores>,
    game2Scores: Partial<BaselineScores>
): BaselineScores {
    return {
        caution: game1Scores.caution || 50,
        calmness: game2Scores.calmness || 50,
        logic: Math.round(((game1Scores.logic || 0) + (game2Scores.logic || 0)) / 2),
        cooperativeness: 50, // ゲーム3未実装時はデフォルト
        positivity: game2Scores.positivity || 50
    };
}
