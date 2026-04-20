import { userRepository } from '../repositories/userRepository';
import { gameRepository } from '../repositories/gameRepository';
import { GameType } from '../types';
import { ERROR_CODES } from '../schemas/errorCodes';

export const gameService = {
    /**
     * ゲームプレイデータを保存する。
     *
     * リクエスト形状の検証（必須・型・game_type の範囲・data が空でないこと）は
     * route 層の zod ミドルウェアで完了している前提。
     * ここでは DB を参照しないと判定できない業務ルール
     * （ユーザー存在確認・同一ゲーム重複送信）のみを行う。
     */
    async submitGame(userId: string, gameType: GameType, data: Record<string, unknown>) {
        // ユーザー存在確認
        const exists = await userRepository.exists(userId);
        if (!exists) {
            throw { status: 400, code: ERROR_CODES.INVALID_USER_ID, message: 'User not found' };
        }

        // 重複送信チェック
        const alreadySubmitted = await gameRepository.existsLog(userId, gameType);
        if (alreadySubmitted) {
            throw { status: 409, code: ERROR_CODES.DUPLICATE_SUBMISSION, message: `Game ${gameType} is already submitted` };
        }

        // 保存
        await gameRepository.saveLog(userId, gameType, data);
    }
};
