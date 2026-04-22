import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import type { OpenAPIObject } from 'openapi3-ts/oas31';
import { registry } from './registry';

// スキーマ側の `.openapi()` 付与と `registry.register()` を副作用として評価する。
// 本ファイルがエントリーポイント（index.ts）から import されることで、
// 関連スキーマが OpenAPI ドキュメントに取り込まれる。
//
// 共通コンポーネント（other schema から参照されない可能性があるもの）は
// ここで明示的に import する。エンドポイントのスキーマは paths/*.ts 側の
// import 連鎖で評価されるため、paths/*.ts を import するだけで足りる。
import '../schemas/common';
import '../schemas/errorCodes';

// パス登録。Issue #5 PR-2a で POST 系 3 本、PR-2b で GET 系 2 本を追加。
import './paths/register';
import './paths/games';
import './paths/voice';
import './paths/results';
import './paths/health';

/**
 * Real You API の OpenAPI ドキュメントを生成する。
 *
 * 生成タイミング: サーバ起動時に 1 度だけ実行し、生成済みオブジェクトを
 * `swagger-ui-express` にそのまま渡す（リクエスト毎に生成する必要はない）。
 *
 * 仕様:
 * - OpenAPI 3.1 を採用（zod v4 の機能と相性が良いため、zod-to-openapi v8 も V31 を推奨）
 * - `servers` は相対 URL（`/`）で指定することで、Swagger UI がアクセス元オリジンを
 *   そのまま採用する（localhost / 本番ドメイン双方で動く）
 */
export function buildOpenApiDocument(): OpenAPIObject {
    const generator = new OpenApiGeneratorV31(registry.definitions);
    return generator.generateDocument({
        openapi: '3.1.0',
        info: {
            title: 'Real You API',
            version: '1.0.0',
        },
        servers: [
            {
                url: '/',
                description: 'Current origin（アクセスしたホストをそのまま使用）',
            },
        ],
    });
}
