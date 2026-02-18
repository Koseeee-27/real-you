# 📋 分析ロジック引き継ぎガイド（for たまちゃ）

## このドキュメントは何？

あなたが触るのは `src/analysis/` フォルダだけです。  
このガイドでは「何を読めばどんなデータが手に入るか」「最終的に何を返せばいいか」を説明します。

---

## 🏗 全体像（3分で理解）

```
ユーザーがゲームを遊ぶ
    ↓
フロントエンドがゲームの行動データを送信
    ↓
POST /api/games/submit → game_logs テーブルに raw_data（JSON）として保存
    ↓
全ゲーム終了後、フロントが結果を取得
    ↓
GET /api/results/:user_id
    ↓
サーバーが game_logs からデータを取得
    ↓
★ ここであなたの関数が呼ばれる ★
    ↓
analysis/scoreCalculator.ts  → ゲームデータ → 5軸スコア(0-100)に変換
analysis/feedbackGenerator.ts → スコア + ギャップ → フィードバック文を生成
    ↓
フロントに返却 → 結果画面に表示
```

---

## 📂 あなたが触るファイル

```
src/analysis/
├── scoreCalculator.ts     ← ゲームデータ → スコア変換（メイン作業）
└── feedbackGenerator.ts   ← スコア → フィードバック文生成
```

**依存するファイル（読むだけ、編集不要）：**
- `src/types/index.ts` — 型定義（`BaselineScores` など）

**触らなくていいファイル：**
- `routes/`, `services/`, `repositories/`, `db/` — データの保存・取得は全部こちらで済んでいます

---

## 📦 手に入るデータ（引数で渡ってくるもの）

あなたの関数には `rawData: any` が渡されます。  
これはフロントエンドが `POST /api/games/submit` で送った `data` フィールドの中身です。

### ゲーム1（利用規約ゲーム）の rawData

```typescript
// フロントが送ってくる想定のデータ
{
  // スクロール行動
  scrollData: {
    reachedBottom: boolean,   // 最下部まで到達したか
    maxPosition: number,      // 最大スクロール位置（px）
  },
  totalTime: number,          // 画面にいた合計時間（秒）

  // 隠しタスク（利用規約の途中にある指示）
  hiddenTask: {
    completed: boolean,       // 隠しタスクにに気づいて実行したか
  },

  // チェックボックス系
  checkboxes: {
    followedInstruction: boolean,  // 指示通りにチェックしたか
  },
  slowReadInstruction: {
    checkboxChecked: boolean, // ゆっくり読む指示のチェック
    slowedDown: boolean,      // 実際にスクロール速度を落としたか
  }
}
```

**このデータで測りたいもの：**
- 🟦 **慎重さ** — ちゃんと読んだか、時間をかけたか
- 🟦 **論理性** — 隠しタスクに気づいたか、指示に従ったか

---

### ゲーム2（AIカスタマーサポート）の rawData

```typescript
{
  inputMethod: "voice" | "text",  // 音声 or テキストどちらを選んだか
  turnCount: number,               // AIとのやり取り回数

  // 音声データ（各ターン）
  voiceTurns: [
    {
      turnNumber: number,
      timeToStartSpeaking: number,  // 録音開始から喋り始めまで（秒）
      speechDuration: number,       // 喋った時間（秒）
      silenceDuration: number,      // 無音の時間（秒）
      transcribedText: string,      // 音声→テキスト変換結果
    }
  ],

  // チャット履歴
  messages: [
    { sender: "ai" | "user", content: string }
  ],

  // 言語分析 ← ★ これは現在未実装。あなたが計算する or フロントが送る
  languageAnalysis: {
    logicalWords: number,      // 論理的な言葉の数（なぜなら、つまり等）
    emotionalWords: number,    // 感情的な言葉の数（最悪、ムカつく等）
    fillerWords: number,       // フィラーワードの数（えーと、あの等）
    exclamationMarks: number,  // 感嘆符の数
  }
}
```

**このデータで測りたいもの：**
- 🟩 **積極性** — すぐ喋り始めるか、音声を選んだか、発話時間が長いか
- 🟦 **論理性** — 論理的な言葉の割合、順序立てた説明
- 🟨 **冷静さ** — 感情的な言葉が少ないか、理不尽な対応にも冷静か

---

### ゲーム3（グループチャット）の rawData — ★ 未定義、あなたが決めてOK

```typescript
// 以下は提案。フロントチームと相談して決めてください
{
  responses: [
    {
      question_id: string,
      selected_option: string,   // 選んだ選択肢
      response_time: number,     // 回答までの秒数
      was_majority: boolean,     // 多数派と同じ選択か
    }
  ],
  helped_struggling_member: boolean,  // 困っているメンバーを助けたか
  help_response_time: number | null,  // 助けるまでの時間
  total_messages_sent: number,
  first_to_respond_count: number,     // 最初に発言した回数
}
```

**このデータで測りたいもの：**
- 🟪 **協調性** — 多数派に合わせるか、困っている人を助けるか
- 🟩 **積極性** — 最初に発言するか、発言数が多いか

---

## ✅ あなたのチェックリスト

### 必須タスク

- [ ] **`calculateGame1Scores(rawData)`** のスコア計算を調整する
  - 現在仮で実装済み。配点や閾値を調整してください
  - 返り値: `{ caution: number, logic: number }`

- [ ] **`calculateGame2Scores(rawData)`** のスコア計算を調整する
  - `languageAnalysis` の計算をどこでやるか決める（後述）
  - 返り値: `{ positivity: number, logic: number, calmness: number }`

- [ ] **`calculateGame3Scores(rawData)`** を新規作成する ← 一番重要
  - `scoreCalculator.ts` に関数を追加
  - 返り値: `{ cooperativeness: number, positivity: number }`

- [ ] **`combineScores()`** にゲーム3を追加する
  - 引数に `game3Scores` を追加
  - `cooperativeness` をゲーム3のスコアで埋める（現在ハードコード50）

- [ ] **`generateFeedback()`** を改善する
  - ギャップの方向（正/負）に応じたテキスト分岐
  - 例: 自己申告80 → 実測20 → 「慎重だと思っていたが大胆でした」
  - 例: 自己申告20 → 実測80 → 「大胆だと思っていたが実は慎重でした」

### 追加タスク（やれたら）

- [ ] **`languageAnalyzer.ts`** を新規作成
  - チャット履歴テキストから論理語・感情語をカウントする関数
  - キーワードマッチングでOK（AI不要）
  - `scoreCalculator.ts` から呼び出す

- [ ] 各ゲーム計算に **`behavioral_summary`** を追加
  - 結果画面で「利用規約を12秒で同意しました」のように表示するためのデータ
  - 例: `{ total_read_time: 12, scroll_percentage: 8, found_hidden_task: false }`

---

## 🔧 具体的な実装手順

### Step 1: ゲーム3のスコア計算を作る

`src/analysis/scoreCalculator.ts` を開いて、末尾に追加：

```typescript
// ゲーム3のデータからスコアを算出
export function calculateGame3Scores(rawData: any): Partial<BaselineScores> {
  const scores: Partial<BaselineScores> = {};

  // 協調性の計算
  let coopScore = 0;
  // ... ここにロジックを書く

  scores.cooperativeness = Math.min(100, Math.round(coopScore));

  // 積極性の計算
  let positivityScore = 0;
  // ... ここにロジックを書く

  scores.positivity = Math.min(100, Math.round(positivityScore));

  return scores;
}
```

### Step 2: combineScores を更新

同じファイル内の `combineScores()` を修正：

```typescript
export function combineScores(
  game1Scores: Partial<BaselineScores>,
  game2Scores: Partial<BaselineScores>,
  game3Scores: Partial<BaselineScores>,  // ← 追加
): BaselineScores {
  return {
    caution: game1Scores.caution || 50,
    calmness: game2Scores.calmness || 50,
    logic: Math.round(((game1Scores.logic || 0) + (game2Scores.logic || 0)) / 2),
    cooperativeness: game3Scores.cooperativeness || 50,  // ← ゲーム3から取得
    positivity: Math.round(
      ((game2Scores.positivity || 0) + (game3Scores.positivity || 0)) / 2
    ),  // ← ゲーム2と3の平均
  };
}
```

### Step 3: resultService.ts に反映（※ ここはあなたの担当外だけど参考用）

`combineScores` に引数を追加したら、`src/services/resultService.ts` も更新が必要です。  
分からなければ声をかけてください。

---

## 📐 5軸スコアの基準

全て **0〜100** の整数値。

| スコア | 意味 |
|--------|------|
| 0 | その傾向が非常に弱い |
| 50 | 平均的 |
| 100 | その傾向が非常に強い |

返り値は必ず `Math.min(100, Math.max(0, Math.round(値)))` で 0〜100 に収めてください。

---

## ❓ 困ったら

- `types/index.ts` の `BaselineScores` インターフェースを見れば、5軸のキー名がわかります
- `rawData` の中身がわからないときはフロントチームに「何を送るか」を確認してください
- ゲームの仕様は Notion/Discord の企画資料を参照してください
