import { ShieldAlert, Users, Zap, type LucideIcon } from 'lucide-react';

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
};

export const GAME_META: Record<GameId, GameMeta> = {
  terms_game: {
    label: '規約の罠',
    icon: ShieldAlert,
    color: '#ef4444',
  },
  helpdesk_game: {
    label: 'AIバトル',
    icon: Zap,
    color: '#f97316',
  },
  group_chat_game: {
    label: '空気読み',
    icon: Users,
    color: '#3b82f6',
  },
};
