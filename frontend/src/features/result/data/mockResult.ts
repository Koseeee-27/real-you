import type { ResultResponse } from '../types';

/**
 * @deprecated 現在未使用。useResult.ts は実APIに切り替え済み。
 * ローカル開発・テスト時のリファレンスとして残している。
 */
export const MOCK_RESULT: ResultResponse = {
  user_id: 'uuid-1234-5678',
  self_mbti: 'ENTP',
  mbti_scores: {
    caution: 30,
    calmness: 60,
    logic: 80,
    cooperativeness: 40,
    positivity: 90,
  },
  scores: {
    caution: 20,
    calmness: 80,
    logic: 60,
    cooperativeness: 10,
    positivity: 90,
  },
  baseline_scores: {
    caution: 100,
    calmness: 50,
    logic: 80,
    cooperativeness: 30,
    positivity: 70,
  },
  gaps: {
    caution: -80,
    calmness: 30,
    logic: -20,
    cooperativeness: -20,
    positivity: 20,
  },
  // 配列形式（Phase 1 / Issue #97）。game_id は Phase 3（registry 導入）で
  // 正式定義予定の文字列 ID を先取り使用。配列順は
  // terms_game → helpdesk_game → group_chat_game の通常フロー順
  // （Phase 3 で `analysis/registry.ts` の `NORMAL_FLOW` 定数として正式定義予定）。
  game_breakdown: [
    { game_id: 'terms_game', scores: { caution: 20 } },
    {
      game_id: 'helpdesk_game',
      scores: { logic: 60, calmness: 80, positivity: 90 },
    },
    {
      game_id: 'group_chat_game',
      scores: { cooperativeness: 10, positivity: 85 },
    },
  ],
  feedback: {
    title: '暴走する機関車',
    subtitle: '気づいたら先頭にいる、止まり方を知らない人',
    description:
      'あなたは自称リーダーですが、協調性が皆無です。規約は読まない！ AIには即ギレ！ でも窮地での「冷静さ」はスーパーヒーロー級です！',
    gap_point: '慎重さ',
  },
  accuracy_score: 50,
  phase_summaries: [
    {
      game_id: 'terms_game',
      summary: '規約を2秒で読み飛ばし、即座に同意ボタンを押しました',
      highlights: [
        { text: '「同意する」ボタンを押すまで、規約を1.2秒かけてわずかに読みました。', comparison: '平均は約15秒', reason: '滞在時間から〈慎重さ〉がわかるため' },
        { text: '同意ボタンに手を伸ばしてから押すまでの迷いは0.2秒。', comparison: '平均は約1.2秒', reason: '決断前のホバー時間から〈慎重さ〉がわかるため' },
        { text: '規約を上にスクロールして読み返した回数は0回。', comparison: '平均は2.1回', reason: '逆行確認から〈論理性〉がわかるため' },
      ],
    },
    {
      game_id: 'helpdesk_game',
      summary: 'AIの理不尽な対応に0.5秒で反応し、論理的に反論しました',
      highlights: [
        { text: 'AIへの平均反応時間は0.5秒。', comparison: '平均は約2.5秒', reason: '反応の速さから〈積極性〉がわかるため' },
        { text: '発話した合計時間は12.5秒。', comparison: '平均は約4.2秒', reason: '発話量から〈積極性・論理性〉がわかるため' },
        { text: '論理的な接続詞を2回使いました。', comparison: '平均は約0.5回', reason: '論理接続詞の使用から〈論理性〉がわかるため' },
      ],
    },
    {
      game_id: 'group_chat_game',
      summary: 'グループの空気を読んで、全員と同じ選択をしました',
      highlights: [
        { text: '同期より先に答えられた場面が多くありました。', comparison: '全体の約40%が先手を取れています', reason: '先回り回答から〈積極性〉がわかるため' },
        { text: '他の人が動いたあと、選択肢への迷いが0回でした。', comparison: '全体の約60%が影響を受けています', reason: 'ホバー変更から〈協調性〉がわかるため' },
        { text: '返答までの平均時間は0.8秒。', comparison: '平均は約3秒', reason: '反応速度から〈積極性〉がわかるため' },
      ],
    },
  ],
  details: [
    {
      game_id: 'terms_game',
      title: '利用規約ゲーム',
      feature_scores: [
        { axis: 'caution', name: '慎重さ', score: 20 },
        { axis: 'logic', name: '論理性', score: 45 },
        { axis: 'calmness', name: '冷静さ', score: 85 },
      ],
      metrics: [
        { label: '読了速度(px/s)', user: 4500, average: 800, category: 'scroll' },
        { label: '総滞在時間(秒)', user: 1.2, average: 15.0, category: 'time' },
        { label: '決断前迷い(ms)', user: 200, average: 1200, category: 'mouse' },
        { label: 'チェック変更(回)', user: 1, average: 3.2, category: 'input' },
        { label: '逆行確認(回)', user: 0, average: 2.1, category: 'scroll' },
        { label: 'マウスブレ(px)', user: 45.5, average: 12.0, category: 'mouse' },
        { label: '無駄クリック(回)', user: 0, average: 1.5, category: 'mouse' },
      ],
      analysis_comment: [
        '規約の滞在時間は1.2秒と非常に短く、読み飛ばし行動が「慎重さ」の低スコアに表れています。',
        '無駄クリックは0回と落ち着いた操作。この一貫性が「冷静さ」の高スコアにつながっています。',
      ],
      top_deviation_metrics: [
        { label: '読了速度(px/s)', user: 4500, average: 800, deviation: 4.63, praise: '瞬時に要点を掴む直感力が光る！スピーディーに判断できる行動力の持ち主。' },
        { label: '総滞在時間(秒)', user: 1.2, average: 15.0, deviation: 0.92, praise: '素早く決断できる行動力がある！テンポよく前に進める推進力の持ち主。' },
        { label: '決断前迷い(ms)', user: 200, average: 1200, deviation: 0.83, praise: '迷わずスパッと決められる決断力がある！自分の判断を信じて動けるタイプ。' },
        { label: 'マウスブレ(px)', user: 45.5, average: 12.0, deviation: 2.79, praise: '全力で操作に集中する熱量がある！エネルギッシュに取り組む姿勢の持ち主。' },
      ],
    },
    {
      game_id: 'helpdesk_game',
      title: 'AIカスタマーサポート',
      feature_scores: [
        { axis: 'positivity', name: '積極性', score: 90 },
        { axis: 'calmness', name: '冷静さ', score: 75 },
        { axis: 'logic', name: '論理性', score: 60 },
      ],
      metrics: [
        { label: '反応潜時(ms)', user: 500, average: 2500, category: 'time' },
        { label: '発話時間(秒)', user: 12.5, average: 4.2, category: 'time' },
        { label: '平均音量(dB)', user: -12.4, average: -25.0, category: 'voice' },
        { label: '論理的接続詞(回)', user: 2, average: 0.5, category: 'logic' },
      ],
      analysis_comment: [
        'AIへの平均反応時間は0.5秒と素早い対応。この即断力が「積極性」の高スコアにつながっています。',
        '「なぜなら」「つまり」などの論理接続詞を2回使用。筋道を立てて話す行動が「論理性」の高スコアにつながっています。',
      ],
      top_deviation_metrics: [
        { label: '反応潜時(ms)', user: 500, average: 2500, deviation: 0.80, praise: '即座に対応できるスピード感がある！素早い判断力で場をリードできるタイプ。' },
        { label: '発話時間(秒)', user: 12.5, average: 4.2, deviation: 1.98, praise: '豊富な言葉で丁寧に伝えられる！コミュニケーション力と表現力が高い。' },
        { label: '平均音量(dB)', user: -12.4, average: -25.0, deviation: 0.50, praise: '存在感のある声で自分の意見を伝えられる！自信を持って発言できるタイプ。' },
        { label: '論理的接続詞(回)', user: 2, average: 0.5, deviation: 3.00, praise: '筋道を立てて話す論理的思考力が高い！理由を説明しながら伝えられるタイプ。' },
      ],
    },
    {
      game_id: 'group_chat_game',
      title: '空気読みグループチャット',
      feature_scores: [
        { axis: 'cooperativeness', name: '協調性', score: 10 },
        { axis: 'positivity', name: '積極性', score: 85 },
      ],
      metrics: [
        { label: '同調率(%)', user: 20, average: 75, category: 'social' },
        { label: '反応時間平均(ms)', user: 800, average: 3500, category: 'time' },
        { label: 'タイムアウト率(%)', user: 0, average: 15, category: 'social' },
        { label: '先回り回答(回)', user: 4, average: 1.5, category: 'social' },
      ],
      analysis_comment: [
        '同期より先に答えられた場面が多く、「積極性」の高スコアにつながっています。',
        '他の人の動きに影響されず自分の選択を維持しており、「協調性（同調傾向）」の低スコアに表れています。',
        '返答までの平均時間は0.8秒と非常に速い。「慎重さ」は低めのスコアになっています。',
      ],
      top_deviation_metrics: [
        { label: '同調率(%)', user: 20, average: 75, deviation: 0.73, praise: '周りに流されず自分の意見を貫ける強さがある！独自の視点で判断できる個性派。' },
        { label: '反応時間平均(ms)', user: 800, average: 3500, deviation: 0.77, praise: '誰よりも素早く動ける行動力がある！場をリードするスピード感の持ち主。' },
        { label: '先回り回答(回)', user: 4, average: 1.5, deviation: 1.67, praise: '先を読んで動ける洞察力が光る！流れを読んで先手を打てる戦略家タイプ。' },
        { label: 'タイムアウト率(%)', user: 0, average: 15, deviation: 1.00, praise: '時間内にきっちり行動できる実行力がある！締め切りに強いタイプ。' },
      ],
    },
  ],
};
