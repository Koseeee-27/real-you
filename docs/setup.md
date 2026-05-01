# 環境構築

## 前提

- Mac
- Git がインストール済み
- Node.js がインストール済み（未インストールの場合は [公式サイト](https://nodejs.org/) からインストール）

## 1. リポジトリのクローン

```bash
git clone https://github.com/Koseeee-27/real-you.git
cd real-you
```

## 2. Frontend のセットアップ

```bash
cd frontend
npm install
```

### 環境変数の設定

```bash
cp .env.local.example .env.local
```

必要な環境変数は `.env.local.example` を参照してください。

### API 型ファイルについて

`frontend/src/lib/api/generated.ts` は BE の zod スキーマから自動生成された TypeScript 型ファイルです。git 管理されているため、初回 setup での再生成は不要です。BE スキーマを変更した際の再生成手順は [docs/api.md](api.md) を参照してください。

## 3. Backend のセットアップ

```bash
cd ../backend
npm install
```

### 環境変数の設定

```bash
cp .env.example .env
```

必要な環境変数は `.env.example` を参照してください。各キーの値は管理者に確認してください。

## 4. 起動確認

ターミナルを 2 つ開いて、それぞれで起動する。

### Backend（先に起動）

```bash
cd backend
npm run dev
```

`http://localhost:3001/health` にアクセスして、レスポンスが返ってくれば OK。

`http://localhost:3001/api-docs` にアクセスすると Swagger UI で API 仕様が閲覧できます（詳細は [docs/api.md](api.md) を参照）。

### Frontend

```bash
cd frontend
npm run dev
```

`http://localhost:3000` にアクセスして、トップページが表示されれば OK。
