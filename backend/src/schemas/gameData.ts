/**
 * 各ゲームの行動データ（raw_data）スキーマの barrel。
 *
 * Issue #99 で `schemas/games/<game>.ts` への分離を行い、本ファイルは後方互換のための
 * 再エクスポート専用にした。新規コードは `schemas/games/<game>.ts` を直接 import するか、
 * 本 barrel 経由でも構わない（既存 import パスを壊さない方針）。
 *
 * - 利用規約ゲーム（terms_game / 旧 Game 1）: `./games/termsGame`
 * - Game2（AI カスタマーサポート）: `./games/helpdeskGame`
 * - Game3（空気読みグループチャット）: `./games/groupChatGame`
 */

export { termsGameDataSchema, type TermsGameData } from './games/termsGame';
export { game2DataSchema, type Game2Data } from './games/helpdeskGame';
export { game3DataSchema, type Game3Data } from './games/groupChatGame';
