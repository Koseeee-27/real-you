import { Router, Request, Response, NextFunction } from 'express';
import { gameService } from '../services/gameService';
import { validate } from '../middleware/validate';
import {
    submitGameRequestSchema,
    SubmitGameRequest,
    SubmitGameResponse,
} from '../schemas/games';

const router = Router();

router.post(
    '/submit',
    validate({ body: submitGameRequestSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { user_id, game_type, data } = req.body as SubmitGameRequest;
            await gameService.submitGame(user_id, game_type, data);

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
