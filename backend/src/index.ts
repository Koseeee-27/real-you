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
import { errorHandler } from './middleware/errorHandler';
import { buildOpenApiDocument } from './openapi/document';

const app = express();
const PORT = process.env.PORT || 3001;
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : ['http://localhost:3000'];

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
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
// デフォルトは有効。本番で閉じたい場合は環境変数 `ENABLE_SWAGGER_UI=false` を設定する。
// 'false' 文字列を明示指定した場合のみ無効化する厳格判定にすることで、
// 未設定や予期しない値で誤って無効化される事故を防ぐ。
const enableSwaggerUi = process.env.ENABLE_SWAGGER_UI !== 'false';
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
