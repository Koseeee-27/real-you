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
  // terms_game → sorter_game → group_chat_game の通常フロー順
  game_breakdown: [
    { game_id: 'terms_game', scores: { caution: 20 } },
    {
      game_id: 'sorter_game',
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
      'あなたの自己認識一致度は68%。『論理的に考えるタイプ』と思っていたかもしれません。でも規約ゲームで同意ボタンを押すまでの迷いが0.2秒でした。仕分けゲームではルール変更から2.1秒で適応し、平均の5秒を大幅に上回りました。',
    gap_point: '慎重さ',
  },
  accuracy_score: 68,
  phase_summaries: [
    {
      game_id: 'terms_game',
      summary: '規約を2秒で読み飛ばし、即座に同意ボタンを押しました',
      highlights: [
        {
          text: '「同意する」ボタンを押すまで、規約をわずか1.2秒しか見ませんでした。',
          comparison: '平均は約15秒',
          reason: '滞在時間から〈慎重さ〉がわかるため',
        },
        {
          text: '同意ボタンに手を伸ばしてから押すまでの迷いは0.2秒。',
          comparison: '平均は約1.2秒',
          reason: '決断前のホバー時間から〈慎重さ〉がわかるため',
        },
        {
          text: '規約を上にスクロールして読み返した回数は0回。',
          comparison: '平均は2.1回',
          reason: '逆行確認から〈論理性〉がわかるため',
        },
      ],
    },
    {
      game_id: 'sorter_game',
      summary: 'ルール変更に2.1秒で適応し、仕分けミスは1回だけでした',
      highlights: [
        {
          text: '新ルールへの適応にかかった時間は2.1秒。',
          comparison: '平均は約5秒',
          reason: '変化適応速度から〈論理性・冷静さ〉がわかるため',
        },
        {
          text: 'システム停止中の無駄な連打は0回でした。',
          comparison: '平均は約3回',
          reason: 'パニック連打から〈冷静さ〉がわかるため',
        },
        {
          text: '総仕分け完了数は42個。',
          comparison: '平均は31個',
          reason: '作業スループットから〈積極性〉がわかるため',
        },
      ],
    },
    {
      game_id: 'group_chat_game',
      summary: 'グループの空気を読まず、800msで自分の意見を即投稿しました',
      highlights: [
        {
          text: '同期より先に答えられた場面が多くありました。',
          comparison: '全体の約40%が先手を取れています',
          reason: '先回り回答から〈積極性〉がわかるため',
        },
        {
          text: '他の人が動いたあと、選択肢への迷いが0回でした。',
          comparison: '全体の約60%が影響を受けています',
          reason: 'ホバー変更から〈協調性〉がわかるため',
        },
        {
          text: '返答までの平均時間は0.8秒。',
          comparison: '平均は約3.5秒',
          reason: '反応速度から〈積極性〉がわかるため',
        },
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
        {
          label: '読了速度(px/s)',
          user: 4500,
          average: 800,
          category: 'scroll',
        },
        { label: '総滞在時間(秒)', user: 1.2, average: 15.0, category: 'time' },
        {
          label: '決断前迷い(ms)',
          user: 200,
          average: 1200,
          category: 'mouse',
        },
        { label: 'チェック変更(回)', user: 1, average: 3.2, category: 'input' },
        { label: '逆行確認(回)', user: 0, average: 2.1, category: 'scroll' },
        {
          label: 'マウスブレ(px)',
          user: 45.5,
          average: 12.0,
          category: 'mouse',
        },
        { label: '無駄クリック(回)', user: 0, average: 1.5, category: 'mouse' },
      ],
      analysis_comment: [
        '規約の滞在時間は1.2秒と非常に短く、読み飛ばし行動が「慎重さ」の低スコアに表れています。',
        '無駄クリックは0回と落ち着いた操作。この一貫性が「冷静さ」の高スコアにつながっています。',
      ],
      top_deviation_metrics: [
        {
          label: '読了速度(px/s)',
          user: 4500,
          average: 800,
          deviation: 4.63,
          praise:
            '瞬時に要点を掴む直感力が光る！スピーディーに判断できる行動力の持ち主。',
        },
        {
          label: '総滞在時間(秒)',
          user: 1.2,
          average: 15.0,
          deviation: 0.92,
          praise:
            '素早く決断できる行動力がある！テンポよく前に進める推進力の持ち主。',
        },
        {
          label: '決断前迷い(ms)',
          user: 200,
          average: 1200,
          deviation: 0.83,
          praise:
            '迷わずスパッと決められる決断力がある！自分の判断を信じて動けるタイプ。',
        },
        {
          label: 'マウスブレ(px)',
          user: 45.5,
          average: 12.0,
          deviation: 2.79,
          praise:
            '全力で操作に集中する熱量がある！エネルギッシュに取り組む姿勢の持ち主。',
        },
      ],
    },
    {
      game_id: 'sorter_game',
      title: '荷物仕分けゲーム',
      feature_scores: [
        { axis: 'calmness', name: '冷静さ', score: 80 },
        { axis: 'logic', name: '論理性', score: 75 },
        { axis: 'positivity', name: '積極性', score: 90 },
      ],
      metrics: [
        {
          label: '平均判断時間(ms)',
          user: 600,
          average: 1500,
          category: 'time',
        },
        {
          label: 'ルール変更適応(秒)',
          user: 2.1,
          average: 5.0,
          category: 'time',
        },
        {
          label: 'システム停止連打(回)',
          user: 0,
          average: 3,
          category: 'mouse',
        },
        { label: '仕分けミス(回)', user: 1, average: 4, category: 'input' },
        {
          label: '総仕分け完了数(個)',
          user: 42,
          average: 31,
          category: 'input',
        },
      ],
      analysis_comment: [
        'ルール変更から適応まで2.1秒。平均の5秒を大幅に下回り、変化への対応力が際立っています。',
        'システム停止時の連打は0回。プレッシャー下でも冷静さを保てており、仕分けミスも1回と精度も高水準です。',
      ],
      top_deviation_metrics: [
        {
          label: 'ルール変更適応(秒)',
          user: 2.1,
          average: 5.0,
          deviation: 0.58,
          praise: '変化への対応が超高速！柔軟な思考力が証明されました。',
        },
        {
          label: '総仕分け完了数(個)',
          user: 42,
          average: 31,
          deviation: 0.35,
          praise: '平均を11個上回る圧倒的スループット！積極性が光ります。',
        },
        {
          label: '平均判断時間(ms)',
          user: 600,
          average: 1500,
          deviation: 0.6,
          praise: '判断の速さが別次元！即決力がスコアを引き上げています。',
        },
        {
          label: 'システム停止連打(回)',
          user: 0,
          average: 3,
          deviation: 1.0,
          praise: '焦りゼロの鉄の冷静さ！止まっても慌てない本物のクールさ。',
        },
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
        { label: '反応潜時(ms)', user: 800, average: 3500, category: 'time' },
        { label: '本音ホバー(回)', user: 0, average: 2.4, category: 'mouse' },
        { label: '譲り合い待機(ms)', user: 0, average: 2000, category: 'time' },
        {
          label: '過去ログ遡及(回)',
          user: 0,
          average: 1.2,
          category: 'scroll',
        },
      ],
      analysis_comment: [
        '同調率は20%。グループの空気よりも自分の判断を優先する、独自路線型のスタイルです。',
        '返答速度は800ms。平均3500msの4倍以上の速さで、積極的な参加姿勢が数字に表れています。',
      ],
      top_deviation_metrics: [
        {
          label: '反応潜時(ms)',
          user: 800,
          average: 3500,
          deviation: 0.77,
          praise: '誰よりも速く動く行動派！積極性がトップクラスです。',
        },
        {
          label: '同調率(%)',
          user: 20,
          average: 75,
          deviation: 0.73,
          praise:
            '流されない強い自分軸を持つ個性派！自分の意見を持てています。',
        },
        {
          label: '本音ホバー(回)',
          user: 0,
          average: 2.4,
          deviation: 1.0,
          praise: '迷いなき一択選手権の優勝者！ブレない決断力が光ります。',
        },
        {
          label: '譲り合い待機(ms)',
          user: 0,
          average: 2000,
          deviation: 1.0,
          praise: '遠慮なしの積極参加！リーダーシップの片鱗が見えます。',
        },
      ],
    },
  ],
};
