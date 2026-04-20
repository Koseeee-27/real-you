import { v4 as uuidv4 } from 'uuid';
import { userRepository } from '../repositories/userRepository';
import { BaselineAnswers, BaselineScores } from '../types';
import { AnswerOption } from '../schemas/common';

/**
 * アンケート回答（A〜D）→ 0〜100 のスコア変換マップ。
 * AnswerOption が A/B/C/D に縛られているため、フォールバックは不要。
 * 中立値の 50 は意図的に省き、ユーザーに必ずどちらかへ寄った選択を求める。
 */
const SCORE_MAP: Record<AnswerOption, number> = {
    'A': 100, // Strongly Agree
    'B': 75,  // Agree
    'C': 25,  // Disagree
    'D': 0,   // Strongly Disagree
};

function convertAnswersToScores(answers: BaselineAnswers): BaselineScores {
    return {
        caution: SCORE_MAP[answers.q1_caution],
        calmness: SCORE_MAP[answers.q2_calmness],
        logic: SCORE_MAP[answers.q3_logic],
        cooperativeness: SCORE_MAP[answers.q4_cooperativeness],
        positivity: SCORE_MAP[answers.q5_positivity],
    };
}

export const registerService = {
    /**
     * ユーザーを新規作成する。
     *
     * リクエスト形状の検証は route 層の zod ミドルウェアで完了している前提で、
     * ここでは A-D → スコア変換と DB 登録のみ行う。
     */
    async registerUser(
        mbti: string | null | undefined,
        baselineAnswers: BaselineAnswers,
    ): Promise<string> {
        const baselineScores = convertAnswersToScores(baselineAnswers);

        const userId = uuidv4();
        await userRepository.create(userId, mbti ?? null, baselineScores);

        return userId;
    },
};
