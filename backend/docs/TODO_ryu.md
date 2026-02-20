# バックエンド 残タスク（ryu担当）

## 🔴 優先度高

### PR マージ
- [x] `ryu/fix-register-baseline-answers` — マージ
- [x] `ryu/add-analysis-results-table` — マージ
- [x] `ryu/add-mbti-scores` — マージ
- [x] `ryu/fix-voice-api-spec` — マージ
- [x] `ryu/fix-health-check` — マージ

### analysis_results テーブル活用
- [x] `analysisResultRepository.ts` 新規作成（CRUD）
- [x] 全ゲーム完了時に analysis_results へ保存する処理を実装
- [x] `resultService` を analysis_results からの読み取り方式に変更（毎回計算 → キャッシュ）

---

## 🟡 優先度中

### バリデーション強化
- [ ] MBTI 形式バリデーション（`invalid_mbti` エラー対応）
- [x] `incomplete_games` エラーを3ゲーム全完了チェックに修正（現在は `< 2`）
- [ ] game_type ごとの raw_data 構造チェック（任意）

### テスト・ドキュメント整備
- [x] `run_api_tests.sh` を `baseline_answers` 形式に更新
- [x] `kc3-backend.postman_collection.json` を更新
- [x] `API_TEST_GUIDE.md` を最新仕様に合わせて更新
- [x] `BACKEND.md` を最新の実装状況に合わせて更新

---

## 🟢 やりたいこと

### AI返答レスポンス高速化（パフォチュー）
- [ ] Gemini API のレスポンス速度改善
  - ストリーミングレスポンス（SSE）の導入検討
  - モデル選定の最適化（軽量モデル優先）
  - プロンプト短縮（トークン数削減）
  - コネクションプール / Keep-Alive
  - レスポンスキャッシュ（同じシナリオの応答を使い回す）
  - 独自実装案: テンプレート応答 + ランダム選択（AI不要で爆速）

---

## ❌ ryu担当外

- 分析ロジック本実装（`scoreCalculator.ts` の Game1/2/3 スコア計算）
- フィードバック本実装（`feedbackGenerator.ts` のタイトル・説明文充実）
- `phaseSummaryBuilder.ts` の本実装
