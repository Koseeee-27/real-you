import { Router, Request, Response, NextFunction } from 'express';
import { registerService } from '../services/registerService';
import { validate } from '../middleware/validate';
import {
    registerRequestSchema,
    RegisterRequest,
    RegisterResponse,
} from '../schemas/register';

const router = Router();

router.post(
    '/',
    validate({ body: registerRequestSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { mbti, baseline_answers } = req.body as RegisterRequest;
            const userId = await registerService.registerUser(mbti, baseline_answers);

            const response: RegisterResponse = { user_id: userId, status: 'success' };
            res.status(201).json(response);
        } catch (error) {
            next(error);
        }
    },
);

export default router;
