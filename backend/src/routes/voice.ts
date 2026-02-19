import { Router, Request, Response, NextFunction } from 'express';
import { voiceService } from '../services/voiceService';

const router = Router();

router.post('/respond', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { user_id, message, conversation_history } = req.body;
        const result = await voiceService.generateAiResponse(message, conversation_history);

        res.json({
            response: result.response,
            emotion: result.emotion,
            confidence: result.confidence,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
