import { Router, Request, Response, NextFunction } from 'express';
import { voiceService } from '../services/voiceService';

const router = Router();

router.post('/respond', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { message, scenario_type } = req.body;
        const responseText = await voiceService.generateAiResponse(message, scenario_type);

        res.json({ status: 'success', response: responseText });
    } catch (error) {
        next(error);
    }
});

export default router;
