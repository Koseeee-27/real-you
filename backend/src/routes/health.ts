import { Router, Request, Response } from 'express';
import { supabase } from '../db/client';
import {
    HealthOkResponse,
    HealthErrorResponse,
} from '../schemas/health';

const router = Router();

/**
 * GET /health
 *
 * Supabase への疎通確認を含むヘルスチェック。
 *
 * レスポンス規約（Notion 仕様書「API 設計書」準拠）:
 * - 200: DB 接続 OK（`status: 'ok'`, `database: 'connected'`）
 * - 503: DB 切断（`status: 'error'`, `database: 'disconnected'`）
 *
 * エラー委譲について:
 * 通常の route は失敗時に next(err) で errorHandler に委譲するが、
 * /health は「DB 切断を 503 + 独自フォーマットで返す」という仕様のため、
 * try/catch で自前にレスポンスを構築する。next(err) に流すと errorHandler の
 * 500 server_error 形式に変換されてしまい、仕様逸脱となるので注意。
 */
router.get('/', async (_req: Request, res: Response) => {
    try {
        const { error } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;

        const response: HealthOkResponse = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: 'connected',
            uptime: Math.round(process.uptime()),
        };
        res.status(200).json(response);
    } catch (_err) {
        // 仕様: DB 切断は 503 + ApiError ではなく health 固有の形状で返す
        const response: HealthErrorResponse = {
            status: 'error',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            uptime: Math.round(process.uptime()),
        };
        res.status(503).json(response);
    }
});

export default router;
