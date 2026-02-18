import { Router, Request, Response } from 'express';
import { registerService } from '../services/registerService';
import { RegisterRequest, RegisterResponse, ApiError } from '../types';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
    try {
        const { mbti, baseline_scores } = req.body as RegisterRequest;
        const userId = await registerService.registerUser(mbti, baseline_scores);

        const response: RegisterResponse = { user_id: userId, status: 'success' };
        res.status(201).json(response);
    } catch (error: any) {
        console.error('Register Error:', error);
        const apiError: ApiError = {
            status: 'error',
            error: error.code || 'server_error',
            message: error.message || 'Internal server error',
        };
        res.status(error.status || 500).json(apiError);
    }
});

export default router;
