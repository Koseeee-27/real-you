import { ERROR_CODES } from '../schemas/errorCodes';
import type { ApiError } from '../schemas/errorCodes';

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
 * - 本 PR（PR-2a）は POST 系 3 本（register / games / voice）の example を先行で配置
 * - GET 系 2 本（results / health）の example は PR-2b で本ファイルに追記する
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
 * 本定数は `ApiError` 型で縛ることで、`ERROR_CODES` 追加時の example 追加忘れを
 * コンパイルエラーとして検知できる（未対応コードは Record の値として必要なため）。
 * message 文言は errorHandler / service 層で実際に返す日本語メッセージに合わせる。
 */
export const apiErrorExamples = {
    invalidRequest: {
        status: 'error',
        error: ERROR_CODES.INVALID_REQUEST,
        message: '必須フィールドが欠落しています',
    },
    invalidMbti: {
        status: 'error',
        error: ERROR_CODES.INVALID_MBTI,
        message: 'mbti は INTJ / ESFP などの 4 文字で指定してください',
    },
    invalidAnswers: {
        status: 'error',
        error: ERROR_CODES.INVALID_ANSWERS,
        message: '回答は A / B / C / D のいずれかで指定してください',
    },
    invalidUserId: {
        status: 'error',
        error: ERROR_CODES.INVALID_USER_ID,
        message: 'ユーザーIDが存在しません',
    },
    invalidGameType: {
        status: 'error',
        error: ERROR_CODES.INVALID_GAME_TYPE,
        message: 'game_type は 1 / 2 / 3 のいずれかで指定してください',
    },
    userNotFound: {
        status: 'error',
        error: ERROR_CODES.USER_NOT_FOUND,
        message: '指定されたユーザーが見つかりません',
    },
    duplicateSubmission: {
        status: 'error',
        error: ERROR_CODES.DUPLICATE_SUBMISSION,
        message: '同一ゲームの重複送信です',
    },
    serverError: {
        status: 'error',
        error: ERROR_CODES.SERVER_ERROR,
        message: 'サーバーエラーが発生しました',
    },
} as const satisfies Record<string, ApiError>;

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
 * data 構造の詳細は仕様書「データ構造」→ Game1Data を参照。OpenAPI の example は
 * 「何を送るべきか」をざっくり示すだけなので、全フィールド網羅ではなく
 * 代表的な値を入れる（仕様書の最小例）。
 */
export const submitGameRequestExampleGame1 = {
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
