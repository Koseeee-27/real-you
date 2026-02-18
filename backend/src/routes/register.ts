import { Router, Request, Response, NextFunction } from 'express';
import { registerService } from '../services/registerService';
import { RegisterRequest, RegisterResponse } from '../types';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { mbti, baseline_scores } = req.body as RegisterRequest;
        const userId = await registerService.registerUser(mbti, baseline_scores);

        const response: RegisterResponse = { user_id: userId, status: 'success' };
        res.status(201).json(response);
    } catch (error) {
        next(error);
    }
});

export default router;
