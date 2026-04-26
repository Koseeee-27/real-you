import { supabase } from '../db/client';
import { GameLog, GameType } from '../types';
import { Game1Data, Game2Data, Game3Data } from '../schemas/gameData';

/**
 * 各 game_type に対応する raw_data の型 union。
 *
 * saveLog の引数に渡す前提で、呼び出し元（service 層）が zod スキーマで parse して
 * narrow 済みであることを型レベルで担保する。repositories 層では構造検証を行わない。
 */
export type GameRawData = Game1Data | Game2Data | Game3Data;

export const gameRepository = {
    async saveLog(userId: string, gameType: GameType, rawData: GameRawData) {
        const { error } = await supabase
            .from('game_logs')
            .insert({
                user_id: userId,
                game_type: gameType,
                raw_data: rawData,
            });

        if (error) throw error;
    },

    /**
     * ユーザーのゲームログを game_type 昇順で取得する。
     *
     * 戻り値の `raw_data` は `unknown`（GameLog.raw_data の定義どおり）。
     * 構造の検証は呼び出し元（resultService）が zod スキーマで parse して行う。
     */
    async findLogsByUserId(userId: string): Promise<GameLog[]> {
        const { data, error } = await supabase
            .from('game_logs')
            .select('*')
            .eq('user_id', userId)
            .order('game_type', { ascending: true });

        if (error) throw error;
        // Supabase は select('*') の戻り値を `any` で返すため、ここで明示的に GameLog[] に寄せる。
        // 構造の妥当性は呼び出し元の zod parse で担保する。
        return (data ?? []) as GameLog[];
    },

    async existsLog(userId: string, gameType: GameType): Promise<boolean> {
        const { data } = await supabase
            .from('game_logs')
            .select('id')
            .eq('user_id', userId)
            .eq('game_type', gameType)
            .limit(1);

        return (data?.length ?? 0) > 0;
    }
};
