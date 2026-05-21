import { ERROR_CODES, type ApiError, type ErrorCode } from '../schemas/errorCodes';

/**
 * OpenAPI ドキュメント用のサンプル値。
 *
 * 設計方針:
 * - 例示は Notion 仕様書「API 設計書」の記述を転記する（乖離したら仕様書を唯一の真実として合わせる）
 * - スキーマ側の `.openapi({ example: ... })` とパス側の `responses.content.example`
 *   両方から参照されるため、値の重複を避けるために本ファイルに集約する
 * - 本ファイルは副作用を持たない純粋な定数モジュール。registry への副作用 import は不要
 *
 * 配置方針:
 * - `requestExamples` / `responseExamples` をエンドポイント単位にグルーピング
 * - `apiErrorExamples` は業務コード別に揃え、各エンドポイントの responses から参照する
 *
 * PR 構成メモ（Issue #5 実装計画参照）:
 * - POST 系 3 本（register / games / voice）の example を PR-2a で配置
 * - GET 系 2 本（results / health）の example を PR-2b で追記
 */

// ---------------------------------------------------------------------------
// 共通: user_id サンプル
// ---------------------------------------------------------------------------

/**
 * サンプル用の UUID（複数エンドポイントで使い回す）。
 * 特定ユーザーを指すものではなく、フォーマットを示すための固定値。
 */
export const SAMPLE_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

// ---------------------------------------------------------------------------
// ApiError の業務コード別サンプル
// ---------------------------------------------------------------------------

/**
 * 業務エラーコードごとのサンプルレスポンス。
 *
 * 型設計:
 * - キーは `ErrorCode`（`ERROR_CODES` の値、snake_case 文字列）に揃える。
 *   `satisfies Record<ErrorCode, ApiError>` で縛ることで、
 *   `ERROR_CODES` に新しいコードを追加したとき example 追加忘れを
 *   「Property 'xxx' is missing」としてコンパイルエラーで検知できる。
 *   （`Record<string, ApiError>` ではキー側の網羅性が効かないので注意）
 * - 値の `error` フィールドもキーと同じコードを指す形に統一しているが、
 *   コンパイラに「キー名と error 値が一致」を強制する仕組みは入れていない。
 *   入れるとキーごとに型を書き分ける必要があり、取扱いが重くなるため見送り。
 *
 * message 文言は errorHandler / service 層で実際に返す日本語メッセージに合わせる。
 */
export const apiErrorExamples = {
    [ERROR_CODES.INVALID_REQUEST]: {
        status: 'error',
        error: ERROR_CODES.INVALID_REQUEST,
        message: '必須フィールドが欠落しています',
    },
    [ERROR_CODES.INVALID_MBTI]: {
        status: 'error',
        error: ERROR_CODES.INVALID_MBTI,
        message: 'mbti は INTJ / ESFP などの 4 文字で指定してください',
    },
    [ERROR_CODES.INVALID_ANSWERS]: {
        status: 'error',
        error: ERROR_CODES.INVALID_ANSWERS,
        message: '回答は A / B / C / D のいずれかで指定してください',
    },
    [ERROR_CODES.INVALID_USER_ID]: {
        status: 'error',
        error: ERROR_CODES.INVALID_USER_ID,
        message: 'ユーザーIDが存在しません',
    },
    [ERROR_CODES.INVALID_GAME_TYPE]: {
        status: 'error',
        error: ERROR_CODES.INVALID_GAME_TYPE,
        message: 'game_type は 1 / 2 / 3 / 4 のいずれかで指定してください',
    },
    [ERROR_CODES.INCOMPLETE_GAMES]: {
        status: 'error',
        error: ERROR_CODES.INCOMPLETE_GAMES,
        message: '3 ゲームすべて完了してから結果取得してください',
    },
    [ERROR_CODES.USER_NOT_FOUND]: {
        status: 'error',
        error: ERROR_CODES.USER_NOT_FOUND,
        message: '指定されたユーザーが見つかりません',
    },
    [ERROR_CODES.DUPLICATE_SUBMISSION]: {
        status: 'error',
        error: ERROR_CODES.DUPLICATE_SUBMISSION,
        message: '同一ゲームの重複送信です',
    },
    [ERROR_CODES.SERVER_ERROR]: {
        status: 'error',
        error: ERROR_CODES.SERVER_ERROR,
        message: 'サーバーエラーが発生しました',
    },
} as const satisfies Record<ErrorCode, ApiError>;

// ---------------------------------------------------------------------------
// POST /api/register
// ---------------------------------------------------------------------------

/**
 * POST /api/register のリクエスト例（仕様書準拠）。
 * baseline_answers は 5 設問すべて必須（A/B/C/D）。
 */
export const registerRequestExample = {
    mbti: 'ENTP',
    baseline_answers: {
        q1_caution: 'A',
        q2_calmness: 'B',
        q3_logic: 'A',
        q4_cooperativeness: 'C',
        q5_positivity: 'A',
    },
} as const;

/**
 * POST /api/register のレスポンス例（201 Created）。
 */
export const registerResponseExample = {
    user_id: SAMPLE_USER_ID,
    status: 'success',
} as const;

// ---------------------------------------------------------------------------
// POST /api/games/submit
// ---------------------------------------------------------------------------

/**
 * game_type = 1（利用規約ゲーム）の data サンプル。
 *
 * data 構造の詳細は仕様書「データ構造」→ TermsGameData を参照。OpenAPI の example は
 * 「何を送るべきか」をざっくり示すだけなので、全フィールド網羅ではなく
 * 代表的な値を入れる（仕様書の最小例）。
 */
export const submitGameRequestExampleTermsGame = {
    user_id: SAMPLE_USER_ID,
    game_type: 1,
    data: {
        totalTime: 42.5,
        finalAction: 'agree',
        reachedBottom: true,
        scrollEvents: [
            { position: 0, timestamp: 0 },
            { position: 1200, timestamp: 2500 },
        ],
        hiddenInput: null,
        checkboxStates: {
            readConfirm: { checked: true, changed: true },
            mailMagazine: { checked: true, changed: false },
            thirdPartyShare: { checked: false, changed: true },
        },
        popupStats: {
            timeToClose: 850,
            clickCount: 1,
            mouseJitter: 42.3,
        },
        agreeButtonHoverTimeMs: 1200,
    },
} as const;

/**
 * game_type = 2（AI カスタマーサポート）の data サンプル。
 *
 * 仕様書「データ構造」→ HelpdeskGameData を参照。turns は最小 2 件（音声 1 件 + テキスト 1 件）で
 * 構造を示し、テキスト入力時は音声系メトリクスが null になる例を載せる。
 */
export const submitGameRequestExampleHelpdeskGame = {
    user_id: SAMPLE_USER_ID,
    game_type: 2,
    data: {
        inputMethod: 'voice',
        turnCount: 2,
        turns: [
            {
                turnIndex: 1,
                inputMethod: 'voice',
                reactionTimeMs: 850,
                speechDurationMs: 3200,
                silenceDurationMs: 400,
                volumeDb: -18.5,
                transcribedText: 'パスワードを忘れました',
            },
            {
                turnIndex: 2,
                inputMethod: 'text',
                reactionTimeMs: null,
                speechDurationMs: null,
                silenceDurationMs: null,
                volumeDb: null,
                transcribedText: 'メールアドレスは abc@example.com です',
            },
        ],
        textInputMetrics: {
            typingIntervalVariance: 120.5,
        },
    },
} as const;

/**
 * game_type = 3（グループチャット）の data サンプル。
 *
 * 仕様書「データ構造」→ GroupChatGameData を参照。3 ターン固定。
 * ターン 2 でタイムアウト例を含める（仕様書準拠）。
 */
export const submitGameRequestExampleGroupChatGame = {
    user_id: SAMPLE_USER_ID,
    game_type: 3,
    data: {
        tutorialViewTime: 8500,
        turns: [
            {
                turnId: 1,
                selectedOptionId: 2,
                reactionTimeMs: 3200,
                isTimeout: false,
                firstHoverElapsedMs: 800,
                finalChoiceHoverOrder: 2,
                decisionConfidenceMs: 1200,
                mouseMovementDistance: 345,
                hoverSequence: [1, 3, 2],
                scrolledChatHistoryCount: 0,
            },
            {
                turnId: 2,
                selectedOptionId: 1,
                reactionTimeMs: 10000,
                isTimeout: true,
                firstHoverElapsedMs: null,
                finalChoiceHoverOrder: null,
                decisionConfidenceMs: null,
                mouseMovementDistance: 0,
                hoverSequence: [],
                scrolledChatHistoryCount: 1,
            },
            {
                turnId: 3,
                selectedOptionId: 3,
                reactionTimeMs: 2500,
                isTimeout: false,
                firstHoverElapsedMs: 600,
                finalChoiceHoverOrder: 1,
                decisionConfidenceMs: 900,
                mouseMovementDistance: 210,
                hoverSequence: [3],
                scrolledChatHistoryCount: 0,
            },
        ],
        turn1AnsweredBeforeColleagueA: true,
        turn1TypingIndicatorReactTimeMs: 1450,
        turn1HoverChangedAfterColleagueATyping: true,
        inputDeviceType: 'mouse',
    },
} as const;

/**
 * game_type = 4（荷物仕分けゲーム）の data サンプル。
 *
 * 仕様書「データ構造」→ SorterGameData を参照。
 */
export const submitGameRequestExampleSorterGame = {
    user_id: SAMPLE_USER_ID,
    game_type: 4,
    data: {
        totalTimeMs: 50000,
        finalScore: 120,
        averageHesitationMs: 1200,
        spawnedPackages: 25,
        wrongSortCount: 3,
        wrongPatterns: {
            urgent: { fragile: 2, heavy: 1 },
            fragile: {},
            heavy: {},
        },
        cancelCount: 2,
        outflowMissCount: 1,
        panicClickCount: 4,
        ruleChangeAdaptMs: 3500,
        events: [],
    },
} as const;

/**
 * POST /api/games/submit のレスポンス例（200 OK）。
 * message はサーバ側で `Game ${game_type} data saved` を返す（games.ts 参照）。
 */
export const submitGameResponseExample = {
    status: 'success',
    message: 'Game 1 data saved',
} as const;

// ---------------------------------------------------------------------------
// POST /api/voice/respond
// ---------------------------------------------------------------------------

/**
 * POST /api/voice/respond のリクエスト例（仕様書準拠）。
 * conversation_history は optional だが、形式を示すため example には含める。
 */
export const voiceRespondRequestExample = {
    user_id: SAMPLE_USER_ID,
    message: 'パスワードを忘れました',
    conversation_history: [
        { role: 'user', content: 'ログインできません' },
        { role: 'assistant', content: 'どのような問題でしょうか？' },
    ],
} as const;

/**
 * POST /api/voice/respond のレスポンス例（200 OK）。
 * emotion / confidence の具体値は仕様書「API 設計書」記載値に合わせる。
 */
export const voiceRespondResponseExample = {
    response: 'パスワードリセットは設定画面から行えます。',
    emotion: 'confident',
    confidence: 0.6,
} as const;

// ---------------------------------------------------------------------------
// GET /api/results/:user_id
// ---------------------------------------------------------------------------

/**
 * GET /api/results/:user_id のレスポンス例（200 OK）。
 *
 * 仕様書「API 設計書」→ GET /api/results/:user_id の JSON と仕様書「データ構造」→ GameDetail を
 * 参考にしつつ、タイトル等の文字列は `analysis/scoreCalculator.ts` の実装値と揃えている
 * （Swagger UI の閲覧者が実際のレスポンスと突合しても齟齬が出ないようにするため）。
 * 値自体は「形を示すための代表値」で、特定ユーザーの実測値ではない。
 *
 * `details[*].feature_scores` は実装側では複数軸（terms_game: 3 軸 / sorter_game: 4 軸 /
 * helpdesk_game: 3 軸 / group_chat_game: 2 軸）を返す。本 example は肥大化を避けて各ゲーム 1 軸のみ掲載しているが、
 * 実際のレスポンスでは複数要素の配列になる点に注意。
 *
 * game_id は Phase 3（registry 導入）で正式定義予定の文字列 ID を先取りで使用している。
 * 配列順は terms_game → sorter_game → group_chat_game の通常フロー順
 * （Phase 3 で `analysis/registry.ts` の `NORMAL_FLOW` 定数として正式定義予定）。
 */
export const resultsResponseExample = {
    user_id: SAMPLE_USER_ID,
    self_mbti: 'ENTP',
    mbti_scores: {
        caution: 40,
        calmness: 50,
        logic: 70,
        cooperativeness: 55,
        positivity: 85,
    },
    scores: {
        caution: 45,
        calmness: 55,
        logic: 75,
        cooperativeness: 60,
        positivity: 70,
    },
    baseline_scores: {
        caution: 50,
        calmness: 60,
        logic: 65,
        cooperativeness: 55,
        positivity: 75,
    },
    gaps: {
        caution: -5,
        calmness: -5,
        logic: 10,
        cooperativeness: 5,
        positivity: -5,
    },
    game_breakdown: [
        { game_id: 'terms_game', scores: { caution: 45, logic: 75, calmness: 55 } },
        {
            game_id: 'sorter_game',
            scores: { caution: 50, calmness: 55, positivity: 70, logic: 65 },
        },
        { game_id: 'group_chat_game', scores: { cooperativeness: 60, positivity: 70, caution: 45 } },
    ],
    feedback: {
        title: '直感ドリブン',
        description: 'あなたは論理よりも直感を優先して意思決定する傾向があります。',
        gap_point: '論理性',
    },
    accuracy_score: 78,
    phase_summaries: [
        { game_id: 'terms_game', summary: '規約を爆速でスクロールし、最後まで読まずに同意しました。' },
        {
            game_id: 'sorter_game',
            summary:
                'ルール変更には3.5秒で適応しました。システム障害中も落ち着いて待てました。',
        },
        { game_id: 'group_chat_game', summary: 'グループの空気を読みつつ、自分の意見も主張していました。' },
    ],
    // タイトル文字列は analysis/scoreCalculator.ts の実装値に合わせる
    // （sorter_game: '荷物仕分けゲーム' / group_chat_game: '空気読みグループチャット'）
    details: [
        {
            game_id: 'terms_game',
            title: '利用規約ゲーム',
            feature_scores: [
                { axis: 'caution', name: '慎重さ', score: 45 },
            ],
            metrics: [
                { label: '読了速度(px/s)', user: 2500, average: 800, category: 'scroll' },
            ],
        },
        {
            game_id: 'sorter_game',
            title: '荷物仕分けゲーム',
            feature_scores: [{ axis: 'caution', name: '慎重さ', score: 50 }],
            metrics: [{ label: '平均判断時間(ms)', user: 1200, average: 1500, category: 'time' }],
        },
        {
            game_id: 'group_chat_game',
            title: '空気読みグループチャット',
            feature_scores: [
                { axis: 'cooperativeness', name: '協調性', score: 60 },
            ],
            metrics: [
                { label: '発言数', user: 4, average: 3, category: 'message' },
            ],
        },
    ],
} as const;

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------

/**
 * GET /health のレスポンス例（200 OK, DB 接続成功時）。
 *
 * 仕様書「API 設計書」→ GET /health の JSON を転記。`uptime` はサンプル値として
 * 1 時間（3600 秒）を採用。
 */
export const healthOkResponseExample = {
    status: 'ok',
    timestamp: '2026-04-16T10:00:00.000Z',
    database: 'connected',
    uptime: 3600,
} as const;

/**
 * GET /health のレスポンス例（503 Service Unavailable, DB 切断時）。
 *
 * 仕様書で /health の 503 は他エンドポイントの `ApiError` と異なる独自形を返す規定のため、
 * `apiErrorExamples` は使わず個別の example を用意している（schemas/health.ts 冒頭コメント参照）。
 */
export const healthErrorResponseExample = {
    status: 'error',
    timestamp: '2026-04-16T10:00:00.000Z',
    database: 'disconnected',
    uptime: 3600,
} as const;
