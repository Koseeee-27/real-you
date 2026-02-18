import { Router, Request, Response } from 'express';
import { resultService } from '../services/resultService';
import { ApiError } from '../types';

const router = Router();

router.get('/:user_id', async (req: Request, res: Response) => {
    try {
        const userId = req.params.user_id as string;
        const result = await resultService.getResult(userId);

        res.json(result);
    } catch (error: any) {
        console.error('Result Error:', error);
        const apiError: ApiError = {
            status: 'error',
            error: error.code || 'server_error',
            message: error.message || 'Internal server error',
        };
        res.status(error.status || 500).json(apiError);
    }
});

export default router;
