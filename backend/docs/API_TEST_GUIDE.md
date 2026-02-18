# API テストガイド

バックエンドAPIの動作確認を行うための `curl` コマンド集です。
ターミナルにコピペして実行することで、一連のフロー（登録 → ゲーム送信 → 結果取得）をテストできます。

## 事前準備
- サーバーを起動しておくこと: `npm run dev` (http://localhost:3001)
- データベース（Supabase）が正しく接続されていること

---

## 1. ユーザー登録 (`POST /api/register`)

### 正常系
```bash
curl -X POST http://localhost:3001/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "mbti": "INTJ",
    "baseline_scores": {
      "caution": 60,
      "calmness": 70,
      "logic": 80,
      "cooperativeness": 40,
      "positivity": 50
    }
  }'
```
**期待されるレスポンス:**
```json
{
  "user_id": "uuid-string...",
  "status": "success"
}
```

### 異常系（スコア不足）
```bash
curl -X POST http://localhost:3001/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "mbti": "INTJ",
    "baseline_scores": {
      "caution": 60
    }
  }'
```
**期待されるレスポンス:** 400 Bad Request

---

## 2. ゲームデータ送信 (`POST /api/games/submit`)

※ `USER_ID` は登録時に返ってきたIDに置き換えてください。

### Game 1 (Normal)
```bash
export USER_ID="ここにUUIDを入力"

curl -X POST http://localhost:3001/api/games/submit \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "'$USER_ID'",
    "game_type": 1,
    "data": {
      "score": 100,
      "tap_count": 50,
      "miss_count": 2
    }
  }'
```

### Game 2 (Data only)
```bash
curl -X POST http://localhost:3001/api/games/submit \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "'$USER_ID'",
    "game_type": 2,
    "data": {
      "choice_history": ["A", "B", "A"],
      "reaction_times": [300, 450, 320]
    }
  }'
```

### 異常系（空データ）
```bash
curl -X POST http://localhost:3001/api/games/submit \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "'$USER_ID'",
    "game_type": 1,
    "data": {}
  }'
```
**期待されるレスポンス:** 400 Bad Request ("data cannot be empty")

---

## 3. 結果取得 (`GET /api/results/:user_id`)

```bash
curl -X GET http://localhost:3001/api/results/$USER_ID
```

**期待されるレスポンス:**
- `scores`: 計算された5軸スコア
- `gaps`: ベースラインとの差分
- `feedback`: 生成されたフィードバックテキスト
- `accuracy_score`: 精度スコア

---

## 4. 音声対話 (`POST /api/voice/respond`)

### 通常会話
```bash
curl -X POST http://localhost:3001/api/voice/respond \
  -H "Content-Type: application/json" \
  -d '{
    "message": "こんにちは！調子はどうですか？",
    "scenario_type": "normal"
  }'
```

### 責任転嫁シナリオ（ゲームオーバー時など）
```bash
curl -X POST http://localhost:3001/api/voice/respond \
  -H "Content-Type: application/json" \
  -d '{
    "message": "ゲームが難しすぎてクリアできないよ",
    "scenario_type": "blame"
  }'
```
