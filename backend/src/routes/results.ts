import { Router, Request, Response, NextFunction } from 'express';
import { resultService } from '../services/resultService';
import { validate } from '../middleware/validate';
import {
    resultsParamsSchema,
    ResultsParams,
    ResultResponse,
} from '../schemas/results';

const router = Router();

router.get(
    '/:user_id',
    validate({ params: resultsParamsSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { user_id } = req.params as unknown as ResultsParams;
            const result: ResultResponse = await resultService.getResult(user_id);

            res.json(result);
        } catch (error) {
            next(error);
        }
    },
);

export default router;
