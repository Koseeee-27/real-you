/**
 * BE の OpenAPI ドキュメントから FE の API 型を生成する。
 *
 * 動作:
 * 1. `cd ../backend && npm run dump:openapi` を実行し、OpenAPI JSON を取得
 * 2. `openapi-typescript` の API で TypeScript 型を生成
 * 3. `src/lib/api/generated.ts` に書き出す
 *
 * 設計上の注意:
 * - openapi-typescript v7 の CLI は stdin (`-`) をファイル名として解釈してしまうため、
 *   シェルパイプ（`dump | openapi-typescript -`）は使えない。代わりに本スクリプトで
 *   API を直接呼ぶことで、一時ファイル不要・クロスプラットフォーム対応にしている
 * - execSync は shell 経由で実行するため、Windows でも `npm run` が解決される
 *
 * 使い方:
 *   npm run gen:api-types
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import openapiTS, { astToString } from 'openapi-typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(__dirname, '..');
const backendDir = resolve(frontendDir, '..', 'backend');
const outputPath = resolve(frontendDir, 'src', 'lib', 'api', 'generated.ts');

console.log('[gen:api-types] Building OpenAPI document from backend...');
const openapiJson = execSync('npm run --silent dump:openapi', {
  cwd: backendDir,
  encoding: 'utf-8',
});

console.log('[gen:api-types] Generating TypeScript types...');
const ast = await openapiTS(JSON.parse(openapiJson));

const banner = [
  '/**',
  ' * このファイルは `npm run gen:api-types` で自動生成されています。',
  ' * 直接編集せず、生成元の zod スキーマ（backend/src/schemas/*.ts）を変更してください。',
  ' */',
  '',
  '',
].join('\n');

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, banner + astToString(ast));

console.log(`[gen:api-types] Wrote: ${outputPath}`);
