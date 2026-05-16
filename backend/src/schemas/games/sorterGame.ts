// zod プロトタイプに `.openapi()` を生やすため、z 本体の import より前に
// 拡張モジュールを副作用 import する（openapi/registry.ts 参照）。
import '../../openapi/registry';
import { z } from 'zod';
import { registry } from '../../openapi/registry';

/**
 * 荷物仕分けゲーム（sorter_game / game_type=4）の行動データ（raw_data）の zod スキーマ群。
 *
 * 設計方針:
 * - 仕様書「データ構造 → SorterGameData」を一次情報とし、TS 型は `z.infer` で導出する
 * - `submitGameRequestSchema`（schemas/games.ts）の `data` discriminated branch として
 *   API に公開されるため `.openapi()` と `registry.register()` でコンポーネント化する
 * - `wrongPatterns` は
 *   `Record<'urgent'|'fragile'|'heavy', Partial<Record<'urgent'|'fragile'|'heavy', number>>>`
 *   に相当するオブジェクト形で表現する
 */

const packageTypeSchema = registry.register(
    'PackageType',
    z.enum(['urgent', 'fragile', 'heavy']).openapi({
        description: '荷物の種類。urgent=特急 / fragile=取扱注意 / heavy=重量物',
    }),
);

const binChosenSchema = z.union([packageTypeSchema, z.null()]).openapi({
    description: '仕分け先。流出・取り消し時は null',
});

const sortEventTypeSchema = registry.register(
    'SortEventType',
    z.enum(['sort', 'cancel', 'outflow']).openapi({
        description: 'sort=仕分け / cancel=取り消し / outflow=流出',
    }),
);

const wrongPatternCountsRowSchema = registry.register(
    'SorterWrongPatternCountsRow',
    z
        .object({
            urgent: z.number().optional(),
            fragile: z.number().optional(),
            heavy: z.number().optional(),
        })
        .openapi({
            description:
                '正解ラベル別に、どのビンへ誤仕分けしたかの回数（省略キーは未定義＝0 回扱い）',
        }),
);

const wrongPatternsSchema = registry.register(
    'WrongPatterns',
    z
        .object({
            urgent: wrongPatternCountsRowSchema.openapi({
                description: 'urgent を誤仕分けしたパターン別カウント',
            }),
            fragile: wrongPatternCountsRowSchema.openapi({
                description: 'fragile を誤仕分けしたパターン別カウント',
            }),
            heavy: wrongPatternCountsRowSchema.openapi({
                description: 'heavy を誤仕分けしたパターン別カウント',
            }),
        })
        .openapi({
            description:
                '誤仕分けパターン。例: { urgent: { fragile: 2 } } = urgent を fragile に 2 回誤仕分け',
        }),
);

const sortEventSchema = registry.register(
    'SortEvent',
    z
        .object({
            timestamp: z.number().openapi({
                description: 'ゲーム開始からの経過時間（ms）',
            }),
            eventType: sortEventTypeSchema,
            packageType: packageTypeSchema,
            binChosen: binChosenSchema,
            hesitationMs: z.number().nullable().openapi({
                description: '選択→仕分けの ms。流出・取り消し時は null',
            }),
            correct: z.boolean().openapi({
                description: '正解判定（ルール変更後の判定込み）。流出・取り消し時は false',
            }),
            duringRuleChange: z.boolean().openapi({
                description: 'ルール変更後のイベントか',
            }),
            duringFreeze: z.boolean().openapi({
                description: '凍結中のクリックか（記録のみ、処理しない）',
            }),
        })
        .openapi({
            description: '荷物仕分けゲームの1イベント分のログ',
        }),
);

export const sorterGameDataSchema = registry.register(
    'SorterGameData',
    z
        .object({
            totalTimeMs: z.number().openapi({
                description: '実プレイ時間（ms）。設計値 50000ms',
            }),
            finalScore: z.number().int().openapi({
                description: 'プレイ画面の表示用スコア。5 軸スコア算出には使わない',
            }),
            averageHesitationMs: z.number().openapi({
                description: '平均判断時間（選択→仕分けまでの ms 平均）',
            }),
            spawnedPackages: z.number().int().openapi({
                description: 'ゲーム中に出現した荷物の総数',
            }),
            wrongSortCount: z.number().int().openapi({
                description: '誤仕分けの回数',
            }),
            wrongPatterns: wrongPatternsSchema,
            cancelCount: z.number().int().openapi({
                description: '選択取り消し回数',
            }),
            outflowMissCount: z.number().int().openapi({
                description: '流出ミスの回数（仕分けされず画面外へ流れた荷物）',
            }),
            panicClickCount: z.number().int().openapi({
                description: '凍結中（システム障害 5 秒間）のクリック数',
            }),
            ruleChangeAdaptMs: z.number().nullable().openapi({
                description: 'ルール変更後、新ルールで初正解までの ms。未適応なら null',
            }),
            events: z.array(sortEventSchema).openapi({
                description: 'ゲーム中のイベントログ',
            }),
        })
        .openapi({
            description:
                '荷物仕分けゲームの行動データ。仕様書「データ構造 → SorterGameData」準拠',
        }),
);

export type SorterGameData = z.infer<typeof sorterGameDataSchema>;
