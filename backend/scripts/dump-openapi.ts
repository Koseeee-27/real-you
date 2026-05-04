/**
 * OpenAPI ドキュメントを JSON 形式で stdout に出力する。
 *
 * 用途:
 * - FE の `openapi-typescript` への入力ソースとして利用される（Issue #51）
 * - BE 起動・DB 接続不要で OpenAPI スキーマだけを取り出すため、本スクリプトを
 *   `tsx` で直接実行する設計とした
 *
 * 使い方:
 *   npm run dump:openapi > path/to/openapi.json
 *   （または FE 側の `gen:api-types` から呼び出す）
 *
 * 設計上の注意:
 * - `buildOpenApiDocument()` は OpenAPIRegistry を引いてくるだけで副作用は持たない
 *   （registry への登録は `document.ts` の副作用 import で完結する）
 * - 本スクリプトは stdout に JSON を出力するだけに留め、エラー時は process.exit(1)
 *   で異常終了させる（パイプ先のリダイレクトで空ファイルが生成されないようにする）
 */
import { buildOpenApiDocument } from "../src/openapi/document";

try {
  const doc = buildOpenApiDocument();
  process.stdout.write(JSON.stringify(doc, null, 2) + "\n");
} catch (error) {
  console.error("Failed to build OpenAPI document:", error);
  process.exit(1);
}
