/**
 * 空気読みグループチャット（group_chat_game / Game 3）新3ターン仕様のデータ定義。
 *
 * 採用モック: design/group-chat-game/mockups/html/v2-layout-classic-pc-play.html
 * 一次ソース: Notion「Game3: グループチャットの改善」/ ゲーム設計書・画面設計書（各「新実装」）
 *
 * 選択肢の `selectedOptionId` は「内部設計上の意図 ID」で、**表示順とは独立**。
 * BE 分析（backend/src/analysis/games/groupChatGame.ts）は全ターン共通で
 * `selectedOptionId ∈ {1, 2}` を「協調系（同調）」、`{3, 4}` を「独自系」として扱う。
 * 画面の並び順は「ABCD = 良し悪し」と読まれないよう意図的に散らした固定順。
 */

// =========================================================
// キャラクター
// =========================================================
export type CharacterId = 'boss' | 'colleague-a' | 'colleague-b' | 'player';

export interface Character {
  id: CharacterId;
  /** チャットの名前ラベル */
  name: string;
  /** public 配下のアイコンパス */
  iconPath: string;
}

export const CHARACTERS = {
  boss: { id: 'boss', name: '上司', iconPath: '/images/group-chat/boss.png' },
  'colleague-a': {
    id: 'colleague-a',
    name: '同期A',
    iconPath: '/images/group-chat/colleague-a.png',
  },
  'colleague-b': {
    id: 'colleague-b',
    name: '同期B',
    iconPath: '/images/group-chat/colleague-b.png',
  },
  player: {
    id: 'player',
    name: 'あなた',
    iconPath: '/images/group-chat/player.png',
  },
} as const satisfies Record<CharacterId, Character>;

/** オンボーディング スライド2 に並べる登場人物（プレイヤー以外の3人） */
export interface IntroCharacter {
  characterId: Exclude<CharacterId, 'player'>;
  role: string;
  personality: string;
}

export const INTRO_CHARACTERS: IntroCharacter[] = [
  { characterId: 'boss', role: '上司', personality: '面倒見の良い上司' },
  {
    characterId: 'colleague-a',
    role: '同期A',
    personality: 'いつも先手を取りたがる同期',
  },
  {
    characterId: 'colleague-b',
    role: '同期B',
    personality: '物静かに場を見守る同期',
  },
];

export const SITUATION_TEXT =
  '業務時間後半。開発チームのグループチャットで、上司が「今日中に対応が必要な不具合」を共有してきた。チームの空気を読みながら、自分はどう動く？';

export const ONBOARDING_TITLE = '適切に応答せよ！';
export const ONBOARDING_DESC = `あなたは開発チームのグループチャットに参加しています。

自由に返信せよ！！`;

// =========================================================
// グループ / タイミング定数
// =========================================================
export const GROUP_HEADER = '開発チーム';
export const GROUP_MEMBER_COUNT = 4;

/** カットイン「ターン N」の表示時間 */
export const CUTIN_DURATION_MS = 1_200;
/** T2 冒頭・上司分岐セリフの表示ディレイ（ターン開始からの ms。モック準拠） */
export const TURN2_BOSS_LINE_DELAY_MS = 600;

/** ターン1: 上司発言からタイマー開始後、同期A「入力中」表示までの遅延 */
export const T1_TYPING_INDICATOR_DELAY_MS = 2_000;
/** ターン1:「入力中」表示後、同期A 先回り発言が出るまでの遅延 */
export const T1_PREEMPT_REVEAL_DELAY_MS = 1_500;

/** 各ターンの制限時間（モック仮値。実装段階で調整可） */
export const TURN_TIMER_MS = {
  1: 10_000,
  2: 15_000,
  3: 7_000,
} as const satisfies Record<1 | 2 | 3, number>;

// =========================================================
// ターン定義
// =========================================================
export type TurnId = 1 | 2 | 3;
export type OptionIntentId = 1 | 2 | 3 | 4;
export type TimerColor = 'red' | 'green';

/** number（BE 生型 `selectedOptionId`）が意図 ID（1-4）かを判定するガード */
export function isOptionIntentId(v: number): v is OptionIntentId {
  return v === 1 || v === 2 || v === 3 || v === 4;
}

export interface BotMessage {
  speaker: Exclude<CharacterId, 'player'>;
  text: string;
  /** ターン3 上司メッセージの「@あなた」メンション強調などに使用 */
  hasMention?: boolean;
}

export interface ChoiceOption {
  /** 内部意図 ID（1,2=協調系 / 3,4=独自系）。表示順とは独立 */
  selectedOptionId: OptionIntentId;
  text: string;
}

export interface TurnDefinition {
  turnId: TurnId;
  /** ターン開始時に表示する bot メッセージ（T2 は冒頭の上司セリフを分岐表から差し込むため空配列） */
  initialBotMessages: BotMessage[];
  /** 表示順（散らした固定順）に並べた選択肢。各要素に意図 ID を付与 */
  choices: ChoiceOption[];
  timerMs: number;
  timerColor: TimerColor;
}

export const TURNS: TurnDefinition[] = [
  // --- ターン1: 沈黙の挙手（積極性主軸 / 制限時間短め・赤）---
  {
    turnId: 1,
    initialBotMessages: [
      {
        speaker: 'boss',
        text: 'ちょっとお願いなんだけど、サービスで不具合出ちゃってて、今日中に対応必要なんだ。誰か手空いてる人いる？',
      },
    ],
    choices: [
      { selectedOptionId: 3, text: '私の方も今ちょっと厳しくて…💦' }, // 独自: やんわり拒否
      { selectedOptionId: 1, text: '私やりましょうか？' }, // 協調: 引き受ける
      { selectedOptionId: 4, text: '同期A、対応できそう？' }, // 独自: 他人に振る
      { selectedOptionId: 2, text: '何時までにですか？' }, // 協調: 関わる・確認
    ],
    timerMs: TURN_TIMER_MS[1],
    timerColor: 'red',
  },
  // --- ターン2: 同調プレッシャー（協調性主軸 / 制限時間長め・緑）---
  {
    turnId: 2,
    initialBotMessages: [], // 冒頭の上司セリフは TURN2_BOSS_BRANCH から差し込む
    choices: [
      { selectedOptionId: 3, text: 'みんなで助け合えばいいですよ〜' }, // 独自: 無難
      { selectedOptionId: 1, text: 'いえいえ、こちらこそありがとうございます🙏' }, // 協調: 上司にフォロー
      {
        selectedOptionId: 4,
        text: 'ちなみに不具合の原因って何だったんですか？',
      }, // 独自: 話題転換
      { selectedOptionId: 2, text: '同期A、ほんと頼りになるね！' }, // 協調: 同期A持ち上げ
    ],
    timerMs: TURN_TIMER_MS[2],
    timerColor: 'green',
  },
  // --- ターン3: 名指し返球（慎重さ主軸 / 制限時間短め・赤）---
  {
    turnId: 3,
    initialBotMessages: [
      {
        speaker: 'boss',
        text: '@あなた、前に似たトラブル対応してくれたよね？同期A にヒントだけでも共有してあげてほしい🙏',
        hasMention: true,
      },
    ],
    choices: [
      { selectedOptionId: 3, text: '私もそんな詳しくないですよ〜' }, // 独自: かわす
      { selectedOptionId: 1, text: 'もちろんです！後で共有します' }, // 協調: 応じる
      { selectedOptionId: 2, text: 'えーと…ちょっと思い出します💦' }, // 協調: 一応応じる
      { selectedOptionId: 4, text: '同期A なら大丈夫だと思います！' }, // 独自: 他人を立てる
    ],
    timerMs: TURN_TIMER_MS[3],
    timerColor: 'red',
  },
];

export const TOTAL_TURNS = TURNS.length;

// =========================================================
// ターン1 先回り演出
// =========================================================
/** ターン1で同期A が先回りで挙手する発言（「入力中」表示後に出現） */
export const T1_PREEMPT_MESSAGE: BotMessage = {
  speaker: 'colleague-a',
  text: '私やりましょうか！',
};

// =========================================================
// ターン2 冒頭・上司セリフ分岐（演出のみ・データ保存なし）
// =========================================================
/**
 * ターン1の選択（意図 ID）に応じてターン2冒頭の上司セリフを差し替える。
 * キーはターン1の `selectedOptionId`。タイムアウト時は `timeout` を使う。
 * BE には保存しない（`turns[0].selectedOptionId` から逆引き可能なため）。
 */
export const TURN2_BOSS_BRANCH = {
  1: 'ありがとう🙏 でも今回は同期A がやってくれるって！また次お願いね', // 私やりましょうか？
  2: 'あ、詳細はあとで送るね。同期A が引き受けてくれたから一旦大丈夫🙏', // 何時までにですか？
  3: '大丈夫大丈夫、無理しないで！同期A がやってくれるって🙏', // 私の方も厳しくて
  4: 'ナイス振り！同期A、ありがとう🙏', // 同期A、対応できそう？
  timeout: 'あ、同期A が手を上げてくれた！助かる〜🙏', // タイムアウト
} as const satisfies Record<OptionIntentId | 'timeout', string>;

/**
 * ターン2の同調プレッシャー追従メッセージ（上司分岐セリフの後に続く）。
 * 表示ディレイ（ターン開始からの ms）を各メッセージに同居させ、件数とディレイの
 * 対応を単一ソース化する（モック準拠: 上司=600 / 同期A=1400 / 同期B=2200）。
 */
export const TURN2_FOLLOW_MESSAGES: { message: BotMessage; delayMs: number }[] = [
  {
    message: {
      speaker: 'colleague-a',
      text: 'いえいえ全然です！むしろ任せてもらえる方が嬉しいです✨',
    },
    delayMs: 1_400,
  },
  {
    message: {
      speaker: 'colleague-b',
      text: '同期A、ほんと頼りになりますよね…！🙏',
    },
    delayMs: 2_200,
  },
];

/**
 * ターン2冒頭の上司セリフを取得する。
 * @param turn1OptionId ターン1で選択した意図 ID（タイムアウト時は null）
 */
export function getTurn2BossLine(turn1OptionId: OptionIntentId | null): string {
  return TURN2_BOSS_BRANCH[turn1OptionId ?? 'timeout'];
}
