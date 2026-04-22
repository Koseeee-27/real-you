# API 仕様

Real You のバックエンド API は OpenAPI 3.1 に対応しており、Swagger UI から閲覧できます。

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

### 本番環境などで公開したくないとき

`ENABLE_SWAGGER_UI=false` を明示的に指定した場合のみ `/api-docs` のマウントが無効化されます。未設定や他の値では有効のままです（`backend/.env.example` 参照）。

## 仕組み

Real You では **zod スキーマを仕様の Single Source of Truth（単一の真実）** として扱い、そこから OpenAPI ドキュメントを自動生成しています。

```
zod スキーマ（backend/src/schemas/*.ts）
      │
      │  .openapi({ description, example, ... }) でメタデータ付与
      ▼
OpenAPIRegistry（backend/src/openapi/registry.ts）
      │
      │  registerPath() でエンドポイントを登録
      │  （backend/src/openapi/paths/*.ts）
      ▼
OpenAPI ドキュメント（backend/src/openapi/document.ts）
      │
      ▼
Swagger UI（/api-docs）
```

使用ライブラリ:

- [`@asteasolutions/zod-to-openapi`](https://github.com/asteasolutions/zod-to-openapi) — zod スキーマに `.openapi()` メソッドを生やし、OpenAPI ドキュメントを生成する
- [`swagger-ui-express`](https://github.com/scottie1984/swagger-ui-express) — 生成したドキュメントを Swagger UI として配信する

## スキーマを更新するとき

API の入出力を変更する場合は、以下の流れで作業します。

1. `backend/src/schemas/` の該当ファイルで zod スキーマを更新する
2. 必要に応じて `.openapi({ description, example })` のメタデータを追記 / 変更する
3. example の値を変える場合は `backend/src/openapi/examples.ts` を更新する（複数箇所から参照されているため）
4. エンドポイント自体の追加 / 変更がある場合は `backend/src/openapi/paths/` 配下を更新する
5. **新規にパスファイルを追加した場合のみ**、`backend/src/openapi/document.ts` に副作用 import を追記する（既存ファイルの編集だけであれば不要）
6. backend を再起動し、`/api-docs` で反映を確認する

zod スキーマの変更はリクエスト検証にも直接反映されます（検証ミドルウェアが同じスキーマを使っているため、仕様と実装が乖離しません）。
