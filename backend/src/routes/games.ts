import { Router, Request, Response } from 'express';
import { gameService } from '../services/gameService';
import { SubmitGameRequest, SubmitGameResponse, ApiError } from '../types';

const router = Router();

router.post('/submit', async (req: Request, res: Response) => {
    try {
        const { user_id, game_type, data } = req.body as SubmitGameRequest;
        await gameService.submitGame(user_id, game_type, data);

        const response: SubmitGameResponse = {
            status: 'success',
            message: `Game ${game_type} data saved`,
        };
        res.json(response);
    } catch (error: any) {
        console.error('Game Submit Error:', error);
        const apiError: ApiError = {
            status: 'error',
            error: error.code || 'server_error',
            message: error.message || 'Internal server error',
        };
        res.status(error.status || 500).json(apiError);
    }
});

export default router;
