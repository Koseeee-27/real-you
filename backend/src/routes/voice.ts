import { Router, Request, Response } from 'express';
import { voiceService } from '../services/voiceService';
import { ApiError } from '../types';

const router = Router();

router.post('/respond', async (req: Request, res: Response) => {
    try {
        const { message, scenario_type } = req.body;
        const responseText = await voiceService.generateAiResponse(message, scenario_type);

        res.json({ status: 'success', response: responseText });
    } catch (error: any) {
        console.error('Voice Error:', error);
        const apiError: ApiError = {
            status: 'error',
            error: error.code || 'ai_failed',
            message: error.message || 'Failed to generate response',
        };
        res.status(error.status || 500).json(apiError);
    }
});

export default router;
