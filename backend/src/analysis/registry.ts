import type { ZodType } from 'zod';
import type { GameDetail, GameId } from '../schemas/results';
import { BaselineScores, GAME_TYPES } from '../types';
import { groupChatGameModule } from './games/groupChatGame';
import { helpdeskGameModule } from './games/helpdeskGame';
import { sorterGameModule } from './games/sorterGame';
import { termsGameModule } from './games/termsGame';

/**
 * ゲームモジュールの中央レジストリ（Issue #101 / Phase 3a）。
 *
 * 設計方針:
 * - ドメイン層（services / analysis）は文字列 ID（`GameId`、例: `'terms_game'`）でゲームを扱う。
 *   DB の数値 game_type（1/2/3）はこの層では意識せず、`repositories/` と `routes/` の
 *   境界でのみ INT ↔ 文字列 ID 変換を行う（Anti-Corruption Layer パターン）。
 * - 新ゲームの追加・差し替え・順序変更は本ファイルへの登録 1 行で済むことを目指す。
 *   Issue #102 で `scoreCalculator` / `resultService` が `NORMAL_FLOW` をループして
 *   各モジュールの `analyze` / `buildSummary` / `buildDetails` を呼び出し、軸統合は
 *   `analysis/aggregator.ts` の `aggregateScores` に汎用化された。
 *
 * 真実の単一ソースについて:
 * - `GameId` 型と `GAME_ID_VALUES` の真実は `schemas/results.ts` 側に置く（zod スキーマ
 *   `gameIdSchema` と一体で管理する方が OpenAPI 公開や API 入出力の検証と整合する）。
 * - 本ファイルは `GAME_MODULES` を `GameModulesMap` 型に縛ることで、各 GameId に対応する
 *   モジュール登録を強制する。Issue 本文の参考設計（`type GameId = keyof typeof GAME_MODULES`）
 *   とは型の派生方向が逆だが、`satisfies` 等価のキー網羅性 + キー名と `module.id` の一致まで
 *   コンパイル時に強制できるため、実質的な型安全性は同一以上。schemas → analysis の逆方向
 *   依存を避ける狙いもある（既存のレイヤー方向 `analysis → schemas` を維持）。
 */

/**
 * `analyze()` の戻り値が必ず満たす最低限の構造（Issue #102 で導入）。
 *
 * 各ゲームモジュールはこれを拡張した具体型（TermsGameAnalyzeResult 等）を返すが、
 * registry レベルではゲーム横断で利用される `scores` のみ型情報を保持する。
 * `scores` は当該ゲームが測定する軸の部分集合（`Partial<BaselineScores>`）で、
 * scoreCalculator は `result.scores` をそのまま `aggregator.aggregateScores`
 * に渡すことで軸統合を行う。
 *
 * 中間メトリクス（averageSpeed / avgReact 等）は同じモジュール内の
 * `buildDetails` だけが参照するため、registry の型としては露出しない。
 */
export type GameAnalyzeResult = {
    readonly scores: Partial<BaselineScores>;
};

/**
 * ゲームモジュールが満たすべき最小インタフェース。
 *
 * `id` のキーごとの型パラメータ化（`{ readonly id: TId }`）により、
 * `GAME_MODULES` のキー名と各モジュールの `id` プロパティが一致することを
 * コンパイル時に強制する（例: `terms_game` キーに `id: 'helpdesk_game'` の
 * モジュールを誤登録するとコンパイルエラー）。
 *
 * Issue #102 で `analyze` の戻り値に共通の `scores` 構造を導入し、`buildDetails`
 * を追加した。各メソッドの引数は `unknown` で受け取り、各モジュール側の
 * アダプタが具体型（TermsGameData 等）にキャストする方針（`gameService.parseGameData`
 * と同じトラスト境界パターン）。これにより registry 経由のループ呼び出し
 * （`scoreCalculator` / `resultService` 側）で型エラーにならず、かつ
 * モジュール内部の typed 関数の契約は維持できる。
 *
 * `buildDetails` の第 2 引数は `analyze` の戻り値（モジュール固有の中間メトリクス
 * を含む）。registry レベルでは詳細型を保持できないため `unknown` として受け、
 * 各モジュールの adapter で具体型に narrow する。
 */
type GameModuleEntry<TId extends GameId> = {
    readonly id: TId;
    readonly title: string;
    // ジェネリックなしの `z.ZodType` を採用することで「任意の zod スキーマを受け付ける」
    // 型として機能する（旧 `ZodTypeAny` と等価。v4 で `ZodTypeAny` が deprecated に
    // なったため `ZodType` に揃える）。`safeParse(data: unknown): SafeParseReturnType`
    // の判別可能 union（success: true → data / success: false → error.issues）が
    // 呼び出し元で narrow できる。ゲームごとの具体型（TermsGameData 等）は registry の
    // 値型として保持しないが、parseGameData 内のアサーションで判別可能 union 側に
    // 戻す形を取っている。
    readonly schema: ZodType;
    readonly analyze: (data: unknown) => GameAnalyzeResult;
    readonly buildSummary: (data: unknown) => string;
    readonly buildDetails: (data: unknown, result: unknown) => GameDetail;
};

type GameModulesMap = { readonly [K in GameId]: GameModuleEntry<K> };

/**
 * ゲーム ID → 分析モジュールの対応表。
 *
 * 新ゲーム追加時は本オブジェクトに 1 行追加するだけで、`NORMAL_FLOW` のループ
 * （scoreCalculator / resultService）が自動的に走査対象に含める。
 *
 * 型 `GameModulesMap` により以下をコンパイル時に強制する:
 * - 各 GameId のキーが揃っていること（漏れがあれば「Property 'xxx' is missing」）
 * - 余分なキーが無いこと（GameId 外のキーは型エラー）
 * - 各モジュールの `id` プロパティと登録キー名が一致すること
 *
 * `as const` を付けないのは `GameModulesMap` の型定義側でキーごとの readonly 化が
 * 効くため不要かつ、付けると既存モジュールの widening 抑制が過剰になるため。
 */
export const GAME_MODULES: GameModulesMap = {
    terms_game: termsGameModule,
    helpdesk_game: helpdeskGameModule,
    sorter_game: sorterGameModule,
    group_chat_game: groupChatGameModule,
};

/**
 * ドメインの文字列 GameId → DB の数値 game_type の対応表。
 *
 * DB スキーマ（`game_logs.game_type` は INT）は本リファクタでは変更しない方針のため、
 * 値表現の差異を境界レイヤー（repositories / routes）で吸収する。
 *
 * 真実の単一ソースは `types/index.ts` の `GAME_TYPES` 定数（HTTP wire format / OpenAPI 公開で
 * 既に「数値 1/2/3」を表す唯一のソースとして定義済み）。本マップでは GameId →
 * `GAME_TYPES.*` の対応だけを書き、INT 値そのものは重複定義しない。これにより新ゲーム
 * 追加時の更新箇所が `GAME_TYPES` に集約される。
 *
 * 参照箇所:
 * - `repositories/gameRepository.ts`: SELECT/INSERT 時に変換
 * - `routes/games.ts`: HTTP リクエストの `game_type`（INT）を service 層へ渡す前に変換
 *
 * services / analysis 層はこの存在を意識せず、常に文字列 ID で扱う。
 */
export const ID_TO_GAME_TYPE: Readonly<Record<GameId, number>> = {
    terms_game: GAME_TYPES.TERMS_GAME,
    helpdesk_game: GAME_TYPES.AI_CHAT,
    sorter_game: GAME_TYPES.SORTER,
    group_chat_game: GAME_TYPES.GROUP_CHAT,
};

/**
 * `ID_TO_GAME_TYPE` を反転して導出する INT → GameId マップ。
 *
 * モジュールロード時に 1 回だけ計算され、以降は固定値として参照される。
 * `GAME_TYPE_TO_ID` を独立にハードコードするとペアの片方だけ更新し忘れるリスクが
 * あるため、`ID_TO_GAME_TYPE` を真実とし反転で導出する。
 *
 * `Object.fromEntries` の戻り値型は弱いため `as Readonly<Record<number, GameId>>` で
 * 補強する（型と実体の一致は `ID_TO_GAME_TYPE` が `Record<GameId, number>` であることで
 * 担保される）。
 */
export const GAME_TYPE_TO_ID = Object.fromEntries(
    Object.entries(ID_TO_GAME_TYPE).map(([id, type]) => [type, id]),
) as Readonly<Record<number, GameId>>;

/**
 * 通常版のゲームプレイ順序。
 *
 * 結果レスポンスの配列順（`game_breakdown` / `details` / `phase_summaries`）や、
 * 将来的なゲームフロー制御のソースとして利用する。
 * ロング版や別フローを実装する際は別の FLOW 定数を追加する想定（本リファクタ範囲外）。
 */
export const NORMAL_FLOW: readonly GameId[] = ['terms_game', 'sorter_game', 'group_chat_game'];
