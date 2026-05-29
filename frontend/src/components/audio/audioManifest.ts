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
