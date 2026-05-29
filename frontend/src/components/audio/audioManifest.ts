/**
 * BGM の真実の単一ソース。
 * 「曲名 → ファイルパス + 基準音量」をここに集約する。
 * 実際の再生音量は baseVolume × ユーザー設定音量（bgmVolumeAtom）で算出する。
 *
 * baseVolume は曲ごとの音圧差を吸収するための基準値。
 * （共通基盤導入前に各ページでハードコードされていた volume 値を集約したもの）
 */
export type BgmDef = {
  src: string;
  /** 曲ごとの基準音量（0〜1） */
  baseVolume: number;
};

export const BGM_MANIFEST = {
  // トップ・MBTI 選択・規約ゲームで共通使用。ページ遷移をまたいで継続再生する。
  start: { src: '/sounds/start-bgm.mp3', baseVolume: 0.4 },
  // 結果画面。
  result: { src: '/sounds/result-bgm.mp3', baseVolume: 0.3 },
} as const satisfies Record<string, BgmDef>;

export type BgmKey = keyof typeof BGM_MANIFEST;

/**
 * ルート（pathname）→ 再生する BGM の対応表（真実の単一ソース）。
 * AudioController が usePathname() の値をこの表で引いて再生曲を決める。
 *
 * - 同じ曲を割り当てたルート間（例: トップ→規約→診断はすべて start）は、
 *   ページ遷移で曲キーが変わらないため Audio を維持し継続再生する。
 * - 未定義のルート（共有ページや、共通基盤に未移行のゲーム）は null 扱いとなり、
 *   そのルートに入ると基盤 BGM は停止する（ゲーム側の独自 BGM と二重再生しない）。
 */
export const BGM_BY_ROUTE: Record<string, BgmKey | undefined> = {
  '/': 'start',
  '/games/terms': 'start',
  '/diagnosis': 'start',
  '/result': 'result',
};

/** pathname に対応する BGM キーを返す。未定義なら null。 */
export function resolveBgmKey(pathname: string): BgmKey | null {
  return BGM_BY_ROUTE[pathname] ?? null;
}
