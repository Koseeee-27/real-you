import { userRepository } from '../repositories/userRepository';
import { gameRepository, GameRawData } from '../repositories/gameRepository';
import { GAME_TYPES, GameType } from '../types';
import { ERROR_CODES } from '../schemas/errorCodes';
import {
    game1DataSchema,
    game2DataSchema,
    game3DataSchema,
} from '../schemas/gameData';

/**
 * game_type に応じて、受け取った data を対応する zod スキーマで parse する。
 *
 * route 層の `gameDataSchema`（= `record(string, unknown)` + 「空でない」refine）では
 * data の中身までは検証されないため、ここで game_type に応じた構造検証を行うことで
 * `gameRepository.saveLog` の引数（`GameRawData` union）に narrow した値を渡す。
 *
 * 構造違反（必須フィールド欠落・型違い等）はクライアント起因の不正リクエストとして
 * 400 `invalid_request` を throw する。詳細な issue は warn ログに残し、
 * クライアントへの message は固定文言にして内部構造の漏洩を防ぐ。
 */
function parseGameData(gameType: GameType, data: Record<string, unknown>): GameRawData {
    const result = (() => {
        switch (gameType) {
            case GAME_TYPES.TERMS_GAME:
                return game1DataSchema.safeParse(data);
            case GAME_TYPES.AI_CHAT:
                return game2DataSchema.safeParse(data);
            case GAME_TYPES.GROUP_CHAT:
                return game3DataSchema.safeParse(data);
            default: {
                // 網羅性チェック: GameType に新しい値を追加した際、ここで型エラーを出して
                // case 追加を強制する（型システム上は到達不能なため、ランタイム throw も保険として残す）
                const _exhaustive: never = gameType;
                throw new Error(`Unknown game type: ${_exhaustive}`);
            }
        }
    })();

    if (!result.success) {
        console.warn('Game data validation failed:', {
            gameType,
            issues: result.error.issues,
        });
        throw {
            status: 400,
            code: ERROR_CODES.INVALID_REQUEST,
            message: 'Invalid game data structure',
        };
    }

    return result.data;
}

export const gameService = {
    /**
     * ゲームプレイデータを保存する。
     *
     * リクエスト形状の検証（必須・型・game_type の範囲・data が空でないこと）は
     * route 層の zod ミドルウェアで完了している前提。
     * ここでは DB を参照しないと判定できない業務ルール
     * （ユーザー存在確認・同一ゲーム重複送信）と、game_type に応じた data 構造の
     * 検証（parseGameData）を行う。
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

        // game_type に応じた構造検証 → narrow した値を保存
        const parsedData = parseGameData(gameType, data);
        await gameRepository.saveLog(userId, gameType, parsedData);
    }
};
