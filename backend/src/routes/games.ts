import { Router, Request, Response, NextFunction } from 'express';
import { GAME_TYPE_TO_ID } from '../analysis/registry';
import { validate } from '../middleware/validate';
import {
    submitGameRequestSchema,
    SubmitGameRequest,
    SubmitGameResponse,
} from '../schemas/games';
import { gameService } from '../services/gameService';

const router = Router();

router.post(
    '/submit',
    validate({ body: submitGameRequestSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { user_id, game_type, data } = req.body as SubmitGameRequest;

            // HTTP 境界（Anti-Corruption Layer / Issue #101）。
            // 仕様維持のため API の wire format は数値 game_type のままとし、
            // service 層へ渡す前にドメインの文字列 GameId に変換する。
            // game_type は zod スキーマで 1/2/3 のいずれかに narrow 済みのため、
            // GAME_TYPE_TO_ID のキー網羅性が保証される（ID_TO_GAME_TYPE と
            // 対称な定数を `analysis/registry.ts` に集約してある）。
            const gameId = GAME_TYPE_TO_ID[game_type];

            await gameService.submitGame(user_id, gameId, data);

            const response: SubmitGameResponse = {
                status: 'success',
                message: `Game ${game_type} data saved`,
            };
            res.json(response);
        } catch (error) {
            next(error);
        }
    },
);

export default router;
