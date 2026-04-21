import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import type { OpenAPIObject } from 'openapi3-ts/oas31';
import { registry } from './registry';

// スキーマ側の `.openapi()` 付与と `registry.register()` を副作用として評価する。
// 本ファイルがエントリーポイント（index.ts）から import されることで、
// 関連スキーマが OpenAPI ドキュメントに取り込まれる。
//
// PR-2 で各エンドポイントのスキーマ（register / games / results / voice / health）と
// ルート登録モジュールを追加する際は、本ファイルに追記する。
import '../schemas/common';
import '../schemas/errorCodes';

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
            description:
                'MBTI 診断ゲーム「Real You」のバックエンド API 仕様。\n' +
                '詳細はプロジェクトの「API 設計書」を参照してください。',
        },
        servers: [
            {
                url: '/',
                description: 'Current origin（アクセスしたホストをそのまま使用）',
            },
        ],
    });
}
