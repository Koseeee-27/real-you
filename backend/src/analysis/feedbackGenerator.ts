import { BaselineScores } from '../types';

export function generateFeedback(
    scores: BaselineScores,
    gaps: BaselineScores
): { title: string; description: string; gap_point: string } {
    // 最大ギャップを見つける
    const gapEntries = Object.entries(gaps).map(([key, value]) => ({
        key,
        value: Math.abs(value)
    }));
    gapEntries.sort((a, b) => b.value - a.value);
    const maxGapKey = gapEntries[0].key;

    const titles: Record<string, string> = {
        caution: '予想外の大胆さ',
        calmness: '意外な冷静さ',
        logic: '隠れた論理性',
        cooperativeness: '独立心の強さ',
        positivity: '積極性の発見'
    };

    const descriptions: Record<string, string> = {
        caution: 'あなたは自分を慎重だと思っていましたが、実際の行動では大胆な判断をしていました。',
        calmness: 'あなたは感情的だと思っていましたが、実際には冷静に対応していました。',
        logic: 'あなたは直感的だと思っていましたが、実際には論理的に考えていました。',
        cooperativeness: 'あなたは協調的だと思っていましたが、実際には自分の意見を貫いていました。',
        positivity: 'あなたは消極的だと思っていましたが、実際には積極的に行動していました。'
    };

    return {
        title: titles[maxGapKey] || 'あなたの性格',
        description: descriptions[maxGapKey] || '興味深い結果が出ました。',
        gap_point: maxGapKey
    };
}
