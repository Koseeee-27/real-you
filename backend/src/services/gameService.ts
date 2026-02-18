import { userRepository } from '../repositories/userRepository';
import { gameRepository } from '../repositories/gameRepository';
import { GameType } from '../types';

export const gameService = {
    async submitGame(userId: string, gameType: GameType, data: Record<string, any>) {
        // バリデーション
        if (!userId || !gameType || !data) {
            throw { status: 400, code: 'invalid_request', message: 'user_id, game_type, and data are required' };
        }

        if (![1, 2, 3].includes(gameType)) {
            throw { status: 400, code: 'invalid_game_type', message: 'game_type must be 1, 2, or 3' };
        }

        // ユーザー存在確認
        const exists = await userRepository.exists(userId);
        if (!exists) {
            throw { status: 400, code: 'invalid_user_id', message: 'User not found' };
        }

        // 保存
        await gameRepository.saveLog(userId, gameType, data);
    }
};
