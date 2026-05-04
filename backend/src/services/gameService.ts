import { userRepository } from "../repositories/userRepository";
import {
  gameRepository,
  GameRawDataPayload,
} from "../repositories/gameRepository";
import { GAME_TYPES, GameType } from "../types";
import { ERROR_CODES } from "../schemas/errorCodes";
import {
  game1DataSchema,
  game2DataSchema,
  game3DataSchema,
} from "../schemas/gameData";

/**
 * game_type に応じて、受け取った data を対応する zod スキーマで parse する。
 *
 * route 層の `submitGameRequestSchema`（discriminatedUnion 化済み）で data の
 * 構造は既に検証されているため、本関数の safeParse は実質的にはパススルーになる。
 * ただし以下の理由で safeParse + switch の構造を残している:
 * - service が将来 route 以外（CLI / batch ジョブ等）から呼ばれた場合の防御
 * - `gameType` と `rawData` を組（判別可能 union `GameRawDataPayload`）として
 *   返すことで、`gameRepository.saveLog` の引数で gameType と rawData の
 *   ミスマッチを型レベルで弾く
 *
 * 構造違反（必須フィールド欠落・型違い等）はクライアント起因の不正リクエストとして
 * 400 `invalid_request` を throw する。詳細な issue は warn ログに残し、
 * クライアントへの message は固定文言にして内部構造の漏洩を防ぐ。
 */
function parseGameData(
  gameType: GameType,
  data: Record<string, unknown>,
): GameRawDataPayload {
  switch (gameType) {
    case GAME_TYPES.TERMS_GAME: {
      const result = game1DataSchema.safeParse(data);
      if (!result.success)
        throw invalidGameDataError(gameType, result.error.issues);
      return { gameType, rawData: result.data };
    }
    case GAME_TYPES.AI_CHAT: {
      const result = game2DataSchema.safeParse(data);
      if (!result.success)
        throw invalidGameDataError(gameType, result.error.issues);
      return { gameType, rawData: result.data };
    }
    case GAME_TYPES.GROUP_CHAT: {
      const result = game3DataSchema.safeParse(data);
      if (!result.success)
        throw invalidGameDataError(gameType, result.error.issues);
      return { gameType, rawData: result.data };
    }
    default: {
      // 網羅性チェック: GameType に新しい値を追加した際、ここで型エラーを出して
      // case 追加を強制する（型システム上は到達不能なため、ランタイム throw も保険として残す）
      const _exhaustive: never = gameType;
      throw new Error(`Unknown game type: ${_exhaustive}`);
    }
  }
}

/**
 * Game data の zod parse 失敗時に throw する API エラーオブジェクトを生成する。
 *
 * `parseGameData` の各 case で同じ形のエラーを throw するため、ヘルパに切り出して
 * 詳細な issue は warn ログに残し、クライアントには固定文言だけを返す。
 */
function invalidGameDataError(gameType: GameType, issues: unknown) {
  console.warn("Game data validation failed:", { gameType, issues });
  return {
    status: 400,
    code: ERROR_CODES.INVALID_REQUEST,
    message: "Invalid game data structure",
  };
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
  async submitGame(
    userId: string,
    gameType: GameType,
    data: Record<string, unknown>,
  ) {
    // ユーザー存在確認
    const exists = await userRepository.exists(userId);
    if (!exists) {
      throw {
        status: 400,
        code: ERROR_CODES.INVALID_USER_ID,
        message: "User not found",
      };
    }

    // 重複送信チェック
    const alreadySubmitted = await gameRepository.existsLog(userId, gameType);
    if (alreadySubmitted) {
      throw {
        status: 409,
        code: ERROR_CODES.DUPLICATE_SUBMISSION,
        message: `Game ${gameType} is already submitted`,
      };
    }

    // game_type に応じた構造検証 → 判別可能 union として保存
    const parsedPayload = parseGameData(gameType, data);
    await gameRepository.saveLog(userId, parsedPayload);
  },
};
