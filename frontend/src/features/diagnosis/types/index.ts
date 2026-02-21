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

// TODO: 質問内容と選択肢が確定したら更新する
export const QUESTIONS: Question[] = [
  {
    key: 'q1_caution',
    label: '（質問内容未定：慎重さに関する質問）',
    options: ['A', 'B', 'C', 'D'],
  },
  {
    key: 'q2_calmness',
    label: '（質問内容未定：冷静さに関する質問）',
    options: ['A', 'B', 'C', 'D'],
  },
  {
    key: 'q3_logic',
    label: '（質問内容未定：論理性に関する質問）',
    options: ['A', 'B', 'C', 'D'],
  },
  {
    key: 'q4_cooperativeness',
    label: '（質問内容未定：協調性に関する質問）',
    options: ['A', 'B', 'C', 'D'],
  },
  {
    key: 'q5_positivity',
    label: '（質問内容未定：積極性に関する質問）',
    options: ['A', 'B', 'C', 'D'],
  },
];
