# API 仕様 / 型生成

Real You のバックエンド API は OpenAPI 3.1 に対応しており、Swagger UI から閲覧できます。
**zod スキーマを Single Source of Truth（単一の真実）** として、Swagger UI の表示・FE で使う TypeScript 型の両方を自動生成しています。

## Swagger UI を開く

backend を起動した状態で、以下の URL にアクセスすると API 仕様が閲覧できます。

```
http://localhost:3001/api-docs
```

閲覧できる情報:

- 全エンドポイントのパス・メソッド・概要
- リクエスト / レスポンスのスキーマと具体例
- エラーレスポンスの業務コード一覧と、コード別の例示

Swagger UI 上の「Try it out」ボタンからその場で API を叩いて挙動を確認することもできます。

### 本番環境での扱い

**本番環境では `ENABLE_SWAGGER_UI=false` を設定し、Swagger UI を無効化します。** API 仕様を外部に公開する必要がないこと、および攻撃面を減らすことが理由です。

`false` を明示的に指定した場合のみ無効化され、未設定や他の値では有効のままです（`backend/.env.example` 参照）。

## 仕組み

zod スキーマを SoT として、Swagger UI（人間が読む用）と FE の TypeScript 型（コードが使う用）の両方を自動生成しています。

```
zod スキーマ（backend/src/schemas/*.ts）  ← Single Source of Truth
      │
      │  .openapi({ description, example, ... }) でメタデータ付与
      ▼
OpenAPIRegistry（backend/src/openapi/registry.ts）
      │
      │  registerPath() でエンドポイント登録
      │  （backend/src/openapi/paths/*.ts）
      ▼
OpenAPI ドキュメント（backend/src/openapi/document.ts）
      │
      ├──► Swagger UI（/api-docs）
      │
      └──► dump:openapi で JSON ダンプ
              │
              ▼
            openapi-typescript（frontend/scripts/gen-api-types.mjs）
              │
              ▼
            frontend/src/lib/api/generated.ts（FE 用 TS 型）
              │
              └──► FE feature の types/index.ts で再エクスポート
                    （components['schemas']['xxx']）
```

使用ライブラリ:

- [`@asteasolutions/zod-to-openapi`](https://github.com/asteasolutions/zod-to-openapi) — zod スキーマに `.openapi()` メソッドを生やし、OpenAPI ドキュメントを生成する
- [`swagger-ui-express`](https://github.com/scottie1984/swagger-ui-express) — 生成したドキュメントを Swagger UI として配信する
- [`openapi-typescript`](https://github.com/openapi-ts/openapi-typescript) — OpenAPI ドキュメントから TypeScript 型を生成する

## スキーマを更新するとき

API の入出力を変更する場合は、以下の流れで作業します。

### 1. BE: zod スキーマを更新

1. `backend/src/schemas/` の該当ファイルで zod スキーマを更新する
2. 必要に応じて `.openapi({ description, example })` のメタデータを追記 / 変更する
3. example の値を変える場合は `backend/src/openapi/examples.ts` を更新する（複数箇所から参照されているため）
4. エンドポイント自体の追加 / 変更がある場合は `backend/src/openapi/paths/` 配下を更新する
5. **新規にパスファイルを追加した場合のみ**、`backend/src/openapi/document.ts` に副作用 import を追記する（既存ファイルの編集だけであれば不要）
6. backend を再起動し、`/api-docs` で反映を確認する

zod スキーマの変更はリクエスト検証にも直接反映されます（検証ミドルウェアが同じスキーマを使っているため、仕様と実装が乖離しません）。

### 2. FE: 生成型を再生成

BE 側で zod スキーマを変更したら、FE 側でも生成型を再生成する必要があります。

```bash
cd frontend
npm run gen:api-types
```

これで `frontend/src/lib/api/generated.ts` が再生成されます。差分が出たら一緒にコミットしてください。

> **注意**: `generated.ts` は git 管理されていますが手で編集しません。BE スキーマを更新したらこのコマンドで再生成します。

## FE での型の使い方

`frontend/src/lib/api/generated.ts` の生成型は、各 feature の `types/index.ts` で再エクスポートして使います。生成型を直接 import する場所は最小限に留めます。

```ts
// frontend/src/features/diagnosis/types/index.ts
import type { components } from '@/lib/api/generated';

export type AnswerOption = components['schemas']['AnswerOption'];
export type BaselineAnswers = components['schemas']['BaselineAnswers'];
```

```ts
// frontend/src/features/diagnosis/components/BaselineSurvey.tsx
import type { BaselineAnswers } from '@/features/diagnosis/types';
```

API I/O ではない FE 内部のデータ（UI 用の `Question[]` 配列など）は、生成型から導出するか手書きのまま `types/index.ts` に置きます。

## ローカルでの検証

`generated.ts` が BE スキーマと同期しているかをローカルで確認できます。

```bash
cd frontend
npm run check:api-types
```

差分があれば exit 1 で終了します。差分が出た場合は `npm run gen:api-types` を実行して再生成し、コミットしてください。

## CI による自動検証

`.github/workflows/api-types-sync.yml` が PR / push で `check:api-types` を自動実行します。BE の zod スキーマを変更したのに `generated.ts` の再生成を忘れた PR は CI が fail するため、更新漏れを検知できます。

CI が落ちた場合の対処:

```bash
cd frontend
npm run gen:api-types
git add src/lib/api/generated.ts
git commit -m "chore: OpenAPI から FE の API 型を再生成"
```
