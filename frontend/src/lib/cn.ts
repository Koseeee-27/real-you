import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind のクラス名を条件付きで連結し、競合するユーティリティを「後勝ち」で
 * 解決するヘルパー。
 *
 * - `clsx` … 条件付き連結（配列・オブジェクト・falsy のスキップ）
 * - `tailwind-merge` … 同じグループのユーティリティ（例: `bg-*`）が重複したとき、
 *   後から渡された方を残す
 *
 * コンポーネント側でデフォルトのクラスを持ちつつ、呼び出し側から `className` で
 * 上書きできるようにするために使う。
 *
 * @example
 * cn('bg-[#2d5be3] text-white', overrideClassName)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
