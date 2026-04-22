import {
    extendZodWithOpenApi,
    OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

/**
 * zod-to-openapi 基盤: zod 拡張と OpenAPIRegistry シングルトン。
 *
 * 設計方針:
 * - 本プロジェクトでは zod を Single Source of Truth とし、既存スキーマへ
 *   `.openapi({ description, example, ... })` でメタデータを付与することで
 *   OpenAPI ドキュメントを自動生成する（Issue #5 実装計画参照）
 * - `extendZodWithOpenApi(z)` は zod の各種スキーマ型のプロトタイプに `.openapi()`
 *   メソッドを生やす副作用を持つ。スキーマ側で `.openapi()` を呼ぶ前に本モジュールが
 *   評価されている必要があるため、`.openapi()` を使用するスキーマファイルの冒頭で
 *   本モジュールを副作用 import する（例: `import '../openapi/registry';`）
 * - `OpenAPIRegistry` は生成対象のスキーマ・パス・コンポーネントを蓄える入れ物。
 *   シングルトンで共有し、複数箇所から `registry.register()` / `registry.registerPath()`
 *   できるようにする
 */

// zod プロトタイプに `.openapi()` を追加（プロセス内で 1 度だけ実行される）
extendZodWithOpenApi(z);

/**
 * プロジェクト共通の OpenAPI レジストリ（シングルトン）。
 *
 * - コンポーネント登録: `registry.register('Name', zodSchema)`
 * - パス登録: `registry.registerPath({ method, path, request, responses })`（PR-2 で追加）
 *
 * レジストリに登録された内容は `document.ts` の `buildOpenApiDocument()` が
 * 一括で OpenAPI v3.1 ドキュメントに変換する。
 */
export const registry = new OpenAPIRegistry();
