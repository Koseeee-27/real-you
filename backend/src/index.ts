import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import registerRouter from './routes/register';
import gamesRouter from './routes/games';
import resultsRouter from './routes/results';
import voiceRouter from './routes/voice';
import healthRouter from './routes/health';
import { errorHandler, CorsError } from './middleware/errorHandler';
import { buildOpenApiDocument } from './openapi/document';

const app = express();
const PORT = process.env.PORT || 3001;

// Swagger UI（/api-docs）の有効/無効判定。
// 'false' 文字列を明示指定した場合のみ無効化する厳格判定（未設定や予期しない値で
// 誤って無効化される事故を防ぐため）。CORS 許可リスト生成でも参照する。
const enableSwaggerUi = process.env.ENABLE_SWAGGER_UI !== 'false';

// CORS 許可オリジン。FRONTEND_URL はカンマ区切りで複数指定可。
// Swagger UI が有効なときは self-origin（backend 自身のオリジン）も許可する。
// Swagger UI の "Try it out" は backend と同一オリジンから fetch を飛ばすため、
// self-origin を許可しないと CORS 拒否で API が叩けなくなる。
// localhost / 127.0.0.1 の両方をカバーする（ブラウザがどちらの表記でアクセスしても通るように）。
const allowedOrigins: string[] = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : ['http://localhost:3000'];
if (enableSwaggerUi) {
    allowedOrigins.push(`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`);
}

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // 専用の CorsError を投げて errorHandler 側で 403 に振り分ける
            // （通常の Error だと 500 server_error に落ちてしまうため）。
            callback(new CorsError(`Origin not allowed: ${origin}`));
        }
    },
}));
app.use(express.json());

// Routes
app.use('/api/register', registerRouter);
app.use('/api/games', gamesRouter);
app.use('/api/results', resultsRouter);
app.use('/api/voice', voiceRouter);
app.use('/health', healthRouter);

// Swagger UI（API ドキュメント閲覧用）
// デフォルトは有効。本番で閉じたい場合は環境変数 `ENABLE_SWAGGER_UI=false` を設定する
// （判定ロジックは上部の `enableSwaggerUi` 参照）。
if (enableSwaggerUi) {
    const openapiDocument = buildOpenApiDocument();
    app.use(
        '/api-docs',
        swaggerUi.serve,
        swaggerUi.setup(openapiDocument, {
            customSiteTitle: 'Real You API Docs',
        }),
    );
}

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    if (enableSwaggerUi) {
        console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
    }
});
