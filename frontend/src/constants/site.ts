/**
 * Real You の公開 URL（本番）。
 *
 * `app/layout.tsx` の `metadataBase` で参照される。
 * `opengraph-image.png` などの相対 URL を絶対 URL に解決するために必須。
 *
 * 変更タイミング:
 * - Vercel 本番ドメインが確定したとき
 * - 独自ドメインへ移行したとき
 *
 * 公開情報なのでハードコードしている（環境変数化不要）。
 * Vercel デプロイ後、実 URL と差異がある場合は別 PR で更新する。
 */
export const SITE_URL = 'https://realyou-jp.vercel.app';
