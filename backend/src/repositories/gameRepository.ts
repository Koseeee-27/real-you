import { GAME_TYPE_TO_ID, ID_TO_GAME_TYPE } from '../analysis/registry';
import { supabase } from '../db/client';
import { TermsGameData, HelpdeskGameData, GroupChatGameData } from '../schemas/gameData';
import { GameId, GameLog } from '../types';

/**
 * 各 GameId に対応する raw_data の組（判別可能 union）。
 *
 * saveLog の引数として `gameId` と `rawData` を一緒に受け取ることで、
 * 「terms_game の gameId に HelpdeskGameData の rawData が渡る」といったミスマッチを
 * コンパイル時に弾ける。呼び出し元（service 層）が zod スキーマで parse して
 * narrow 済みであることを型レベルで担保する想定で、repositories 層では構造検証しない。
 *
 * Issue #101 で従来の数値 game_type ベースから文字列 GameId ベースに変更した。
 * DB の `game_logs.game_type` は INT のままで、`saveLog` 内で `ID_TO_GAME_TYPE` で
 * INT に変換して INSERT する（Anti-Corruption Layer パターン）。
 */
export type GameRawDataPayload =
    | { gameId: 'terms_game'; rawData: TermsGameData }
    | { gameId: 'helpdesk_game'; rawData: HelpdeskGameData }
    | { gameId: 'group_chat_game'; rawData: GroupChatGameData };

/**
 * DB 行（game_logs）の生レコード型。
 *
 * ドメイン層に出る `GameLog`（types/index.ts）は `game_id: GameId` の文字列 ID を持つが、
 * DB レイヤでは `game_type: number` の INT のままで保持している。本型は
 * `findLogsByUserId` 内の SELECT 結果を一時的に表現するためだけに使い、外部には公開しない。
 */
type GameLogDbRow = Omit<GameLog, 'game_id'> & { game_type: number };

export const gameRepository = {
    async saveLog(userId: string, payload: GameRawDataPayload) {
        // ドメインの文字列 GameId を DB の数値 game_type に変換して INSERT する（Anti-Corruption Layer）。
        const { error } = await supabase
            .from('game_logs')
            .insert({
                user_id: userId,
                game_type: ID_TO_GAME_TYPE[payload.gameId],
                raw_data: payload.rawData,
            });

        if (error) throw error;
    },

    /**
     * ユーザーのゲームログを game_type 昇順で取得し、ドメイン文字列 GameId に変換して返す。
     *
     * 戻り値の `raw_data` は `unknown`（GameLog.raw_data の定義どおり）。
     * 構造の検証は呼び出し元（resultService）が zod スキーマで parse して行う。
     *
     * `order` は DB カラム名（game_type）で行う。出力上の並び順は
     * `terms_game` (1) → `helpdesk_game` (2) → `group_chat_game` (3) になり、
     * `analysis/registry.ts` の `NORMAL_FLOW` と一致する。
     * 未知の game_type が DB に紛れていた場合（DB 整合性破壊）はその行をスキップしつつ
     * `console.error` で報告する（呼び出し元の `gameLogs.length < 3` 判定で
     * 400 incomplete_games に倒れる流れになり、レスポンスに不整合行が漏れない）。
     */
    async findLogsByUserId(userId: string): Promise<GameLog[]> {
        const { data, error } = await supabase
            .from('game_logs')
            .select('*')
            .eq('user_id', userId)
            .order('game_type', { ascending: true });

        if (error) throw error;
        // Supabase は select('*') の戻り値を `any` で返すため、ここで明示的に DB 行型に寄せる。
        const rows = (data ?? []) as GameLogDbRow[];

        const logs: GameLog[] = [];
        for (const row of rows) {
            const gameId = GAME_TYPE_TO_ID[row.game_type];
            if (!gameId) {
                // GAME_TYPES の範囲外（CHECK 制約破壊 / 旧データ等）は DB 整合性異常として
                // 警告ログに残しつつスキップする。呼び出し元は length チェックで
                // 「未完了」として 400 incomplete_games に振る。
                console.error('Unknown game_type in game_logs:', { userId, row });
                continue;
            }
            // DB 行から数値 `game_type` を取り除き、ドメインの文字列 `game_id` に置換する。
            // `_omit` という名前は ESLint の `no-unused-vars` 規約（`_` 始まりは未使用許容）に従う。
            const { game_type: _omit, ...rest } = row;
            logs.push({ ...rest, game_id: gameId });
        }
        return logs;
    },

    async existsLog(userId: string, gameId: GameId): Promise<boolean> {
        const { data } = await supabase
            .from('game_logs')
            .select('id')
            .eq('user_id', userId)
            .eq('game_type', ID_TO_GAME_TYPE[gameId])
            .limit(1);

        return (data?.length ?? 0) > 0;
    },
};
