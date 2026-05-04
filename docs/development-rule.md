# 開発ルール

このドキュメントは KC3-2026（Real You）の開発ルールをまとめたものです。
チームメンバー全員がこのルールに沿って開発を進めます。

## ブランチ運用

- デフォルトブランチは `develop`
- 作業は必ずブランチを切って行い、PR 経由で `develop` にマージする
- `develop` に直接コミットしない

### ブランチの命名規則

`<type>/<短い説明>` の形式で付ける。説明は英語で短く。

| type        | 用途                     | 例                            |
| ----------- | ------------------------ | ----------------------------- |
| `feature/`  | 新機能の追加             | `feature/add-share-button`    |
| `fix/`      | バグ修正                 | `fix/result-display-error`    |
| `docs/`     | ドキュメントの追加・修正 | `docs/add-setup-guide`        |
| `refactor/` | リファクタリング         | `refactor/cleanup-game-logic` |
| `chore/`    | 設定変更・雑務           | `chore/update-dependencies`   |

### ブランチの作り方（コマンド例）

```bash
# develop を最新にする
git checkout develop
git pull origin develop

# 新しいブランチを作成
git checkout -b feature/add-share-button
```

## コミットメッセージ

英語の prefix + 日本語の本文で書く。

### 形式

```
<prefix>: <日本語で変更内容>
```

### prefix 一覧

| prefix      | 用途                         | 例                                      |
| ----------- | ---------------------------- | --------------------------------------- |
| `feat:`     | 新機能                       | `feat: SNSシェアボタンを追加`           |
| `fix:`      | バグ修正                     | `fix: 結果画面が表示されない問題を修正` |
| `docs:`     | ドキュメント                 | `docs: 環境構築手順を追加`              |
| `style:`    | スタイル調整（機能変更なし） | `style: ボタンの余白を調整`             |
| `refactor:` | リファクタリング             | `refactor: ゲームロジックを整理`        |
| `chore:`    | 設定・雑務                   | `chore: パッケージを更新`               |

### コミットの粒度

- 1 つの論理的な変更につき 1 コミット
- 「あれもこれも」と 1 コミットに詰め込まない
- こまめにコミットする（変更を放置しない）

## 開発コマンド

### Frontend

```bash
cd frontend
```

| コマンド                  | 用途                                                                      | いつ使う？                                |
| ------------------------- | ------------------------------------------------------------------------- | ----------------------------------------- |
| `npm run dev`             | 開発サーバー起動（ホットリロードあり）                                    | 普段の開発                                |
| `npm run build`           | 本番用ビルド                                                              | PR 前チェック、デプロイ前                 |
| `npm start`               | ビルド済みアプリを本番モードで起動                                        | build の成果物を確認したいとき            |
| `npm run lint`            | ESLint でコードチェック                                                   | PR 前チェック                             |
| `npm run format`          | Prettier でコード整形                                                     | コード整形したいとき                      |
| `npm run format:check`    | Prettier で整形チェック（変更なし）                                       | CI 用                                     |
| `npm run gen:api-types`   | BE の zod スキーマから FE の API 型 (`src/lib/api/generated.ts`) を再生成 | BE スキーマ変更後                         |
| `npm run check:api-types` | `generated.ts` が BE スキーマと同期しているか検証（差分があれば exit 1）  | スキーマ変更時の確認用（CI でも自動実行） |

### Backend

```bash
cd backend
```

| コマンド        | 用途                                 | いつ使う？                     |
| --------------- | ------------------------------------ | ------------------------------ |
| `npm run dev`   | 開発サーバー起動（自動リロードあり） | 普段の開発                     |
| `npm run build` | TypeScript → JavaScript にコンパイル | PR 前チェック、デプロイ前      |
| `npm start`     | ビルド済みアプリを起動               | build の成果物を確認したいとき |

### PR 前チェック

PR を出す前に以下を実行してエラーがないことを確認する。

```bash
# Frontend
cd frontend
npm run lint
npm run build

# Backend
cd ../backend
npm run build
```

### API スキーマを変更したとき

BE の zod スキーマを変更した場合は、FE 側の自動生成型も再生成する。

```bash
# 1. BE 側で zod スキーマを更新
#    backend/src/schemas/*.ts を編集

# 2. FE 側で生成型を再生成
cd frontend
npm run gen:api-types

# 3. BE と FE の変更を一緒にコミット
```

仕組みの詳細・FE での型の使い方は [docs/api.md](api.md) を参照。

CI（`.github/workflows/api-types-sync.yml`）でも `generated.ts` の同期を自動検証している。BE スキーマだけ変えて FE の再生成を忘れた PR は CI が落ちる。

## Pull Request

- 基本的には `develop` ブランチに向けて PR を出す
- PR はテンプレートに沿って書く（`.github/PULL_REQUEST_TEMPLATE.md` が自動で反映される）
- レビューが通ってからマージする

### PR のサイズ目安

- 変更ファイル: 10 個以下
- 変更行数: 300 行以下

大きくなりそうな場合は Issue を分割して、PR も分ける。

## Issue

### Issue の作成ルール

- バグ報告・新機能・改善提案は Issue テンプレートに沿って作成する
- タイトルは何が問題か / 何をしたいかが一目でわかるように書く
- 良い例: 「結果画面のレーダーチャートが表示されない」
- 悪い例: 「バグ」「表示がおかしい」

### ラベル運用

Issue には以下の 3 軸からラベルを付ける。**カテゴリと種別は必ず付ける。** 優先度は相談して決める。

#### カテゴリ（何を変えるか）

| ラベル          | 用途                    |
| --------------- | ----------------------- |
| `cat: frontend` | フロントエンドの変更    |
| `cat: backend`  | バックエンドの変更      |
| `cat: design`   | デザイン・UI/UX の変更  |
| `cat: infra`    | デプロイ・CI/CD・環境系 |
| `cat: docs`     | ドキュメントのみの変更  |

#### 種別（何をするか）

| ラベル           | 用途                    |
| ---------------- | ----------------------- |
| `type: bug`      | バグ修正                |
| `type: feature`  | 新機能追加              |
| `type: improve`  | 既存機能の改善・UX 向上 |
| `type: refactor` | リファクタリング        |

#### 優先度（技育博に向けてどれが重要か）

| ラベル           | 基準                                 |
| ---------------- | ------------------------------------ |
| `priority: high` | デモに必須。これがないと見せられない |
| `priority: mid`  | あると体験が良くなる                 |
| `priority: low`  | 余裕があればやる                     |
