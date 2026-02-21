export type AnswerOption = 'A' | 'B' | 'C' | 'D';

export type QuestionKey =
  | 'q1_caution'
  | 'q2_calmness'
  | 'q3_logic'
  | 'q4_cooperativeness'
  | 'q5_positivity';

export type BaselineAnswers = Record<QuestionKey, AnswerOption>;

export type Question = {
  key: QuestionKey;
  label: string;
  options: AnswerOption[];
};

export const QUESTIONS: Question[] = [
  {
    key: 'q1_caution',
    label: '初めての街でランチ。お店選びは？',
    options: [
      '口コミを熟読して予約する',
      '歩きながらスマホで比較する',
      '外観の雰囲気で決める',
      '直感でパッと飛び込む',
    ],
  },
  {
    key: 'q2_calmness',
    label: '感動的な映画を見終わった直後は？',
    options: [
      'ストーリーの構成を分析する',
      '心の中で静かに余韻に浸る',
      '「最高だった！」と熱く語る',
      '感情移入して思い切り泣く',
    ],
  },
  {
    key: 'q3_logic',
    label: '新しい服を買うときの決め手は？',
    options: [
      '着回しやすさや素材の良さ',
      '今の流行や使い勝手',
      'デザインの第一印象',
      '一目惚れで即決',
    ],
  },
  {
    key: 'q4_cooperativeness',
    label: '大人数での食事。自分の注文は？',
    options: [
      '全体のバランスを見て合わせる',
      '浮かない範囲で好きなものを頼む',
      '周りを気にせず食べたいものを頼む',
      '自分のイチオシをみんなにも勧める',
    ],
  },
  {
    key: 'q5_positivity',
    label: '初対面の人が多いパーティーでは？',
    options: [
      '自分からどんどん話しかける',
      '目が合った人に挨拶してみる',
      '話しかけられるのを笑顔で待つ',
      '聞き役に徹して相槌を打つ',
    ],
  },
];
