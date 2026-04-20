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
        // head: true だけで「PostgREST → DB」の接続確認は成立する。
        // count: 'exact' を付けると毎回 SELECT COUNT(*) が走りテーブル成長時に負荷が出るため外す。
        // カラムは最小の 'id' に絞る（head: true で行データは返らないが意図を明確化する目的）。
        const { error } = await supabase
            .from('users')
            .select('id', { head: true });

        if (error) throw error;

        const response: HealthOkResponse = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: 'connected',
            uptime: Math.round(process.uptime()),
        };
        res.status(200).json(response);
    } catch (err) {
        // /health は死活監視で最も参照されるエンドポイント。503 を返した原因を
        // 運用側で追えるよう、errorHandler に委譲しない代わりにここで必ずログに残す
        console.error('Health check failed:', err);
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
