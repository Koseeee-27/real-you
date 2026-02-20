# Game 3: 空気読みグループチャット — データ収集仕様

## ゲーム概要

架空のグループチャットのシチュエーション（沈黙・祝賀・衝突・食事・退室）を5ステージ提示し、各場面でユーザーがどの選択肢を選ぶか、どれだけ迷うかの行動データを収集する。
フロントエンドはデータ収集・送信に集中し、判定ロジック（スコア計算）はバックエンド側で行う。

## 収集データ一覧

| データ                       | 説明                                                                                         | 参考: 関連する判定指標 |
| ---------------------------- | -------------------------------------------------------------------------------------------- | ---------------------- |
| `tutorialViewTime`           | チュートリアル説明を閉じるまでの時間（ms）                                                   | 慎重さ                 |
| `stages[].stageId`           | ステージ番号（1〜5）                                                                         | —                      |
| `stages[].selectedOptionId`  | 選んだ選択肢のID（1〜4）。時間切れの場合は `0` または `null`                                 | 協調性・積極性         |
| `stages[].reactionTimeMs`    | 選択肢が表示されてから決定（または時間切れ）までの時間（ms）                                 | 積極性                 |
| `stages[].isTimeout`         | 時間切れで終了したか                                                                         | 積極性                 |
| `hoveredOptions`             | 全ステージ通じた選択肢ホバー回数の合計（本音と建前の葛藤を計測）                             | 協調性                 |
| `typingIndicatorReactTimeMs` | ステージ3で「入力中...」が表示されてからユーザーが操作するまでの時間（ms）                    | 協調性                 |

**判定への対応:**

- **協調性:** `selectedOptionId`（他者と同じ選択 = 同調）、ステージ3で譲る行動、`typingIndicatorReactTimeMs`（譲り合い待機時間）、`hoveredOptions`（他選択肢への迷い合計）
- **積極性:** `selectedOptionId`（独自の選択）、`reactionTimeMs`（即答 = 主導権）、`isTimeout`（時間切れ = 優柔不断）
- **慎重さ:** `tutorialViewTime`（チュートリアル確認時間）、反応時間のばらつき

## Game3Data 型定義

```json
{
  "tutorialViewTime": 5200,
  "hoveredOptions": 6,
  "typingIndicatorReactTimeMs": 1500,
  "stages": [
    {
      "stageId": 1,
      "selectedOptionId": 2,
      "reactionTimeMs": 3400,
      "isTimeout": false
    },
    {
      "stageId": 2,
      "selectedOptionId": 1,
      "reactionTimeMs": 1800,
      "isTimeout": false
    },
    {
      "stageId": 3,
      "selectedOptionId": 3,
      "reactionTimeMs": 4500,
      "isTimeout": false
    },
    {
      "stageId": 4,
      "selectedOptionId": 0,
      "reactionTimeMs": 10000,
      "isTimeout": true
    },
    {
      "stageId": 5,
      "selectedOptionId": 1,
      "reactionTimeMs": 2200,
      "isTimeout": false
    }
  ]
}
```

**フィールド詳細:**

- `tutorialViewTime` (number, required): チュートリアル説明を閉じるまでの時間（ミリ秒）
- `hoveredOptions` (number, required): 全ステージ通じた選択肢ホバー回数の合計
- `typingIndicatorReactTimeMs` (number | null, required): ステージ3で「入力中...」が表示されてからユーザーが操作するまでの時間（ミリ秒）。ステージ3未到達やタイムアウト時は `null`
- `stages` (array, required): 全5ステージの操作ログ
  - `stageId` (number, required): ステージ番号（1〜5）
  - `selectedOptionId` (number | null, required): 選んだ選択肢のID（1〜4）。時間切れの場合は `0` または `null`
  - `reactionTimeMs` (number, required): 選択肢が表示されてから決定（または時間切れ）までの時間（ミリ秒）
  - `isTimeout` (boolean, required): 時間切れで終了したか

## ステージ一覧

| # | シチュエーション | 概要                                         | 選択肢                                               |
| - | ---------------- | -------------------------------------------- | ---------------------------------------------------- |
| 1 | 沈黙             | 幹事募集に誰も返信しない中、立候補するか待つか | 私がやります / 待つ / 他の人に振る / 黙って様子を見る |
| 2 | 祝賀             | 周りに合わせたスタンプを押すか、違うものを押すか | 同じスタンプ / 違うスタンプ / テキスト / 既読スルー   |
| 3 | 衝突             | 相手も入力中の時、譲るか送信するか           | 先に送信 / 譲って待つ / 別の話題 / 静観               |
| 4 | 食事             | 全員同じメニューの中、自分の注文を選ぶ       | カレー / ラーメン / なんでもいい / パスタ             |
| 5 | 退室             | どのタイミングで「お疲れ様」を送るか         | すぐ送る / 少し待つ / 全員後 / 無言退室               |

## ゲームルール（フロント実装）

- ステージ数: **5ステージ固定**
- 各ステージの制限時間: **10秒**（選択肢表示後からカウント開始）
- 時間切れ: `selectedOptionId: 0`, `isTimeout: true` として記録し、自動で次ステージへ遷移
- 選択肢: 各ステージ **4択固定**（絵文字プレフィックス付き）
- チュートリアル: ゲーム開始前にオーバーレイ表示（Game 2 と同様のスタイル）。タップで閉じた時点から計測開始
- ステージカットイン: 各ステージ開始前に DAY ラベル・テーマ名・ステージ番号を全画面オーバーレイで **1.2秒間** 表示
- Botメッセージ: カットイン後にチャットエリアへ順次表示（800ms間隔）
- 入力中インジケータ: ステージ 3, 5 でBotメッセージ全表示後にバウンスドットアニメーションを1.5秒表示
- チャットUI: LINE風スマホフレーム内に表示（`max-w-sm`）。Botは部長・先輩・同期の3名

## API連携

**エンドポイント:** `POST /api/games/submit`

**トリガー:** ゲームが終了した瞬間（5ステージ完了後）

**リクエスト:**

```json
{
  "user_id": "localStorageから取得",
  "game_type": 3,
  "data": { ... Game3Data ... }
}
```

**レスポンス:**

```json
{
  "status": "success",
  "message": "Game 3 data saved"
}
```

**Loading表示:** API送信中は次の画面への遷移を無効化し、「送信中...」テキストまたはスピナーを表示。

**エラー表示:** APIエラー時は「データ送信に失敗しました」トースト、「リトライ」ボタン、続く場合は「スキップして次へ」オプションを表示。

**成功時:** Loading画面（`/result`）へ自動遷移。
