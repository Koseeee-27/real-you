import {
  Package,
  ShieldAlert,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import type { GameId } from '../types';

/**
 * ゲームごとの結果画面 UI メタデータ（タブのラベル / アイコン / 色）。
 *
 * BE スキーマの `game_id` を単一ソースに、結果画面（タブ・コメントハイライト等）の
 * 表示情報をここに集約する。新しいゲームを追加するときは generated.ts の `GameId`
 * union が拡張されるので、本ファイルにも対応エントリを足す（`Record<GameId, ...>`
 * によりコンパイル時に網羅性を保証）。
 *
 * 表示順は API レスポンスの `details` 配列の順序に従うため、本マップ自体は順序を
 * 持たない。
 */
export type GameMeta = {
  /** 結果画面タブのラベル（ゲームの愛称、画面設計書ベース） */
  label: string;
  /** タブアイコン（lucide-react） */
  icon: LucideIcon;
  /** タブの強調色 / コメント内ハイライト色 */
  color: string;
  /** 詳細画面：ゲームの概要説明文 */
  description: string;
  /** 詳細画面：このゲームで測定した性格軸（例: 慎重さ・論理性・冷静さ） */
  measuredTraits: string;
};

export const GAME_META: Record<GameId, GameMeta> = {
  terms_game: {
    label: '規約の罠',
    icon: ShieldAlert,
    color: '#ef4444',
    description:
      'サービスの利用規約に見せかけた行動計測ゲームです。長い規約をどれだけ読むか／読まずに即同意するかで、素の行動が表れます。',
    measuredTraits: '慎重さ・論理性・冷静さ・協調性・積極性',
  },
  helpdesk_game: {
    label: 'AIバトル',
    icon: Zap,
    color: '#f97316',
    description:
      'AIカスタマーサポートとの対話を通じて、あなたの論理的思考力と感情コントロールを測るゲームです。理不尽な回答への反応が素の姿を映し出します。',
    measuredTraits: '積極性・冷静さ・論理性',
  },
  sorter_game: {
    label: '荷物仕分け',
    icon: Package,
    color: '#22c55e',
    description:
      'ベルトコンベアから流れる荷物を制限時間内に正しい場所へ仕分けするゲーム。突然のルール変更やシステム障害への対応から、プレッシャー下での素の判断が表れます。',
    measuredTraits: '慎重さ・冷静さ・論理性・積極性',
  },
  group_chat_game: {
    label: '空気読み',
    icon: Users,
    color: '#3b82f6',
    description:
      '開発チームのグループチャットで、3つの場面に返答するゲーム。誰かが動き出したとき・同調圧力がかかったとき・名指しされたときの反応から、無意識の対人行動が表れます。',
    measuredTraits: '協調性・積極性・慎重さ',
  },
};
