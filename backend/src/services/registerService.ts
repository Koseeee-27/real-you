import { v4 as uuidv4 } from 'uuid';
import { userRepository } from '../repositories/userRepository';
import { BaselineScores } from '../types';

export const registerService = {
    async registerUser(mbti: string | null | undefined, baselineScores: BaselineScores) {
        // バリデーション
        if (!baselineScores) {
            throw { status: 400, code: 'invalid_request', message: 'baseline_scores is required' };
        }

        const requiredKeys = ['caution', 'calmness', 'logic', 'cooperativeness', 'positivity'];
        const providedKeys = Object.keys(baselineScores);
        const missingKeys = requiredKeys.filter(k => !providedKeys.includes(k));

        if (missingKeys.length > 0) {
            throw { status: 400, code: 'invalid_request', message: `Missing baseline_scores keys: ${missingKeys.join(', ')}` };
        }

        const scores = Object.values(baselineScores);
        if (scores.some(s => s < 0 || s > 100)) {
            throw { status: 400, code: 'invalid_scores', message: 'Scores must be between 0 and 100' };
        }

        const userId = uuidv4();
        await userRepository.create(userId, mbti || null, baselineScores);

        return userId;
    }
};
