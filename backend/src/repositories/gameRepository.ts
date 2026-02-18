import { supabase } from '../db/client';
import { GameType } from '../types';

export const gameRepository = {
    async saveLog(userId: string, gameType: GameType, rawData: Record<string, any>) {
        const { error } = await supabase
            .from('game_logs')
            .insert({
                user_id: userId,
                game_type: gameType,
                raw_data: rawData,
            });

        if (error) throw error;
    },

    async findLogsByUserId(userId: string) {
        const { data, error } = await supabase
            .from('game_logs')
            .select('*')
            .eq('user_id', userId)
            .order('game_type', { ascending: true });

        if (error) throw error;
        return data || [];
    }
};
