import { GAME_MODULES } from '../analysis/registry';
import { GameRawDataPayload, gameRepository } from '../repositories/gameRepository';
import { userRepository } from '../repositories/userRepository';
import { ERROR_CODES } from '../schemas/errorCodes';
import type { GameId } from '../types';

/**
 * GameId に応じて、受け取った data を対応する zod スキーマで parse する。
 *
 * route 層の `submitGameRequestSchema`（discriminatedUnion）で data の構造は既に検証
 * されているため、本関数の safeParse は実質的にはパススルーになる。それでも残すのは
 * 以下の理由:
 * - service が将来 route 以外（CLI / batch ジョブ等）から呼ばれた場合の防御
 * - `gameId` と `rawData` を組（判別可能 union `GameRawDataPayload`）として
 *   返すことで、`gameRepository.saveLog` の引数で gameId と rawData の
 *   ミスマッチを型レベルで弾く
 *
 * 実装は `analysis/registry.ts` の `GAME_MODULES` から対応モジュールの schema を
 * 引いて parse する。新ゲーム追加時は GAME_MODULES に登録するだけで自動的に
 * 検証対象に含まれる（旧実装の switch 文は不要）。
 *
 * 構造違反（必須フィールド欠落・型違い等）はクライアント起因の不正リクエストとして
 * 400 `invalid_request` を throw する。詳細な issue は warn ログに残し、
 * クライアントへの message は固定文言にして内部構造の漏洩を防ぐ。
 */
function parseGameData(gameId: GameId, data: Record<string, unknown>): GameRawDataPayload {
    // 変数名は CommonJS のグローバル `module` と衝突しないよう `gameModule` にする
    // （tsconfig: "module": "commonjs" 環境ではシャドーするため）。
    const gameModule = GAME_MODULES[gameId];
    const result = gameModule.schema.safeParse(data);
    if (!result.success) throw invalidGameDataError(gameId, result.error.issues);

    // GameRawDataPayload は `gameId` ごとに rawData の型が異なる判別可能 union。
    // GAME_MODULES[gameId] の schema は対応する Game1Data / Game2Data / Game3Data を
    // parse するが、registry の `GameModuleEntry` では schema を `ZodTypeAny` として
    // 保持しており parse 戻り値が unknown 化する。型整合性はキー名と `module.id` の
    // 一致を `GameModulesMap` で強制した上で確保しているため、ここでアサーションして
    // 上位の判別可能 union（GameRawDataPayload）に詳細型を伝える。
    return { gameId, rawData: result.data } as GameRawDataPayload;
}

/**
 * Game data の zod parse 失敗時に throw する API エラーオブジェクトを生成する。
 *
 * `parseGameData` から呼ばれる。詳細な issue は warn ログに残し、
 * クライアントには固定文言だけを返す。
 */
function invalidGameDataError(gameId: GameId, issues: unknown) {
    console.warn('Game data validation failed:', { gameId, issues });
    return {
        status: 400,
        code: ERROR_CODES.INVALID_REQUEST,
        message: 'Invalid game data structure',
    };
}

export const gameService = {
    /**
     * ゲームプレイデータを保存する。
     *
     * リクエスト形状の検証（必須・型・game_type の範囲・data が空でないこと）は
     * route 層の zod ミドルウェアで完了している前提。route 層は HTTP リクエストの
     * 数値 game_type を文字列 GameId に変換した上で本メソッドを呼ぶ
     * （Anti-Corruption Layer / Issue #101）。
     *
     * ここでは DB を参照しないと判定できない業務ルール
     * （ユーザー存在確認・同一ゲーム重複送信）と、gameId に応じた data 構造の
     * 検証（parseGameData）を行う。
     */
    async submitGame(userId: string, gameId: GameId, data: Record<string, unknown>) {
        // ユーザー存在確認
        const exists = await userRepository.exists(userId);
        if (!exists) {
            throw { status: 400, code: ERROR_CODES.INVALID_USER_ID, message: 'User not found' };
        }

        // 重複送信チェック
        const alreadySubmitted = await gameRepository.existsLog(userId, gameId);
        if (alreadySubmitted) {
            throw {
                status: 409,
                code: ERROR_CODES.DUPLICATE_SUBMISSION,
                message: `Game ${gameId} is already submitted`,
            };
        }

        // gameId に応じた構造検証 → 判別可能 union として保存
        const parsedPayload = parseGameData(gameId, data);
        await gameRepository.saveLog(userId, parsedPayload);
    },
};
