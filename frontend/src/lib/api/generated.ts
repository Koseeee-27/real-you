/**
 * このファイルは `npm run gen:api-types` で自動生成されています。
 * 直接編集せず、生成元の zod スキーマ（backend/src/schemas/*.ts）を変更してください。
 */

export interface paths {
    "/api/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * ユーザー登録
         * @description MBTI 選択 + 基準値アンケート（5 設問）完了時にユーザーを新規登録する。mbti は null / 省略で MBTI 診断スキップ扱いになる。
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["RegisterRequest"];
                };
            };
            responses: {
                /** @description ユーザー登録成功 */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["RegisterResponse"];
                    };
                };
                /** @description リクエスト不正。主な業務エラーコード: invalid_mbti（MBTI 形式違反）/ invalid_answers（A-D 以外の回答）/ invalid_request（必須フィールド欠落） */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/games/submit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * ゲームプレイデータ送信
         * @description 各ゲーム（1: 利用規約 / 2: AI チャット / 3: グループチャット / 4: 荷物仕分け）の終了時に行動データを送信する。同一ユーザー × 同一 game_type の重複送信は 409 `duplicate_submission` を返す。
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["SubmitGameRequest"];
                };
            };
            responses: {
                /** @description ゲームデータ保存成功 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SubmitGameResponse"];
                    };
                };
                /** @description リクエスト不正。主な業務エラーコード: invalid_request（必須フィールド欠落 / data が空）/ invalid_user_id（user_id が不正 = 形式違反 / 欠落 / 存在しない）/ invalid_game_type（game_type が 1-4 の範囲外） */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description 同一ユーザー × 同一 game_type の重複送信 */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/voice/respond": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * AI 応答生成（Game 2 用）
         * @description Game 2（AI カスタマーサポート）のユーザー発話に対し、Gemini API で AI 応答を生成する。Gemini 失敗時はキーワードマッチングのフォールバックに切り替わる（confidence が下がる）。
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["VoiceRespondRequest"];
                };
            };
            responses: {
                /** @description AI 応答生成成功 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["VoiceRespondResponse"];
                    };
                };
                /** @description リクエスト不正。主な業務エラーコード: invalid_request（必須フィールド欠落 / message が空）/ invalid_user_id（user_id が不正 = 形式違反 / 欠落 / 存在しない） */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/results/{user_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 診断結果取得
         * @description 3 ゲーム完了後に呼び出す。analysis_results にキャッシュがあればそれを、なければゲームログから計算して UPSERT した結果を返す。
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description ユーザー識別子（UUID v4） */
                    user_id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description 診断結果取得成功 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ResultResponse"];
                    };
                };
                /** @description リクエスト不正。主な業務エラーコード: invalid_user_id（UUID 形式違反。path params の validate ミドルウェアで検出し errorHandler が 400 にマップ） / incomplete_games（3 ゲーム全て完了していない。resultService で throw） */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description 指定された user_id のユーザーが存在しない */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * ヘルスチェック
         * @description Supabase への疎通確認を含む死活監視用エンドポイント。200 と 503 で独自レスポンス形を返す（他エンドポイントの ApiError とは別形）。
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description DB 接続 OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description 固定値 "ok"（DB 接続成功時）
                             * @enum {string}
                             */
                            status: "ok";
                            /**
                             * Format: date-time
                             * @description レスポンス生成時刻（ISO 8601 UTC）
                             * @example 2026-04-16T10:00:00.000Z
                             */
                            timestamp: string;
                            /**
                             * @description 固定値 "connected"（Supabase への疎通成功）
                             * @enum {string}
                             */
                            database: "connected";
                            /**
                             * @description プロセス起動からの経過秒数（整数）
                             * @example 3600
                             */
                            uptime: number;
                        };
                    };
                };
                /** @description DB 切断（Supabase への疎通失敗） */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description 固定値 "error"（DB 切断時）
                             * @enum {string}
                             */
                            status: "error";
                            /**
                             * Format: date-time
                             * @description レスポンス生成時刻（ISO 8601 UTC）
                             * @example 2026-04-16T10:00:00.000Z
                             */
                            timestamp: string;
                            /**
                             * @description 固定値 "disconnected"（Supabase への疎通失敗）
                             * @enum {string}
                             */
                            database: "disconnected";
                            /**
                             * @description プロセス起動からの経過秒数（整数）
                             * @example 3600
                             */
                            uptime: number;
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /**
         * @description 基準値アンケートの回答選択肢（A / B / C / D のいずれか）
         * @example A
         * @enum {string}
         */
        AnswerOption: "A" | "B" | "C" | "D";
        /**
         * @description 5 軸スコア（0-100 の整数）。baseline_scores / scores / mbti_scores で共通利用
         * @example {
         *       "caution": 60,
         *       "calmness": 55,
         *       "logic": 70,
         *       "cooperativeness": 45,
         *       "positivity": 65
         *     }
         */
        BaselineScores: {
            /** @description 慎重さ（0-100） */
            caution: number;
            /** @description 冷静さ（0-100） */
            calmness: number;
            /** @description 論理性（0-100） */
            logic: number;
            /** @description 協調性（0-100） */
            cooperativeness: number;
            /** @description 積極性（0-100） */
            positivity: number;
        };
        /**
         * @description 5 軸ギャップ（実測 - 自己申告）。負値を取りうる整数
         * @example {
         *       "caution": -5,
         *       "calmness": 10,
         *       "logic": 0,
         *       "cooperativeness": 15,
         *       "positivity": -8
         *     }
         */
        GapScores: {
            /** @description 慎重さのギャップ（実測 - 自己申告） */
            caution: number;
            /** @description 冷静さのギャップ */
            calmness: number;
            /** @description 論理性のギャップ */
            logic: number;
            /** @description 協調性のギャップ */
            cooperativeness: number;
            /** @description 積極性のギャップ */
            positivity: number;
        };
        /**
         * @description API 共通エラーレスポンス形式
         * @example {
         *       "status": "error",
         *       "error": "invalid_mbti",
         *       "message": "mbti は INTJ / ESFP などの 4 文字で指定してください"
         *     }
         */
        ApiError: {
            /**
             * @description 固定値 "error"（成功時は各レスポンスが個別に status を返す）
             * @enum {string}
             */
            status: "error";
            /**
             * @description API 設計書「エラーレスポンス」で規定された業務エラーコード。 400: invalid_mbti / invalid_answers / invalid_request / invalid_user_id / invalid_game_type / incomplete_games、404: user_not_found、409: duplicate_submission、500: server_error。
             * @example invalid_request
             * @enum {string}
             */
            error: "invalid_request" | "invalid_mbti" | "invalid_answers" | "invalid_user_id" | "invalid_game_type" | "incomplete_games" | "user_not_found" | "duplicate_submission" | "server_error";
            /**
             * @description 開発者向けの日本語説明（エンドユーザー向け文言ではない）
             * @example mbti は INTJ / ESFP などの 4 文字で指定してください
             */
            message: string;
        };
        /**
         * @description 5 軸の基準値アンケート回答。各軸（慎重さ / 冷静さ / 論理性 / 協調性 / 積極性）に A / B / C / D のいずれかで回答する（A=100, B=75, C=25, D=0 点に内部変換される）
         * @example {
         *       "q1_caution": "A",
         *       "q2_calmness": "B",
         *       "q3_logic": "A",
         *       "q4_cooperativeness": "C",
         *       "q5_positivity": "A"
         *     }
         */
        BaselineAnswers: {
            q1_caution: components["schemas"]["AnswerOption"];
            q2_calmness: components["schemas"]["AnswerOption"];
            q3_logic: components["schemas"]["AnswerOption"];
            q4_cooperativeness: components["schemas"]["AnswerOption"];
            q5_positivity: components["schemas"]["AnswerOption"];
        };
        /**
         * @description MBTI 選択 + 基準値アンケート（5 設問）完了時に送信する登録リクエスト。mbti は任意（null / 省略でスキップ扱い）、baseline_answers は全 5 設問必須
         * @example {
         *       "mbti": "ENTP",
         *       "baseline_answers": {
         *         "q1_caution": "A",
         *         "q2_calmness": "B",
         *         "q3_logic": "A",
         *         "q4_cooperativeness": "C",
         *         "q5_positivity": "A"
         *       }
         *     }
         */
        RegisterRequest: {
            /**
             * @description MBTI タイプ（I/E + S/N + T/F + J/P の 4 文字、大文字小文字不問）
             * @example INTJ
             */
            mbti?: string | null;
            baseline_answers: components["schemas"]["BaselineAnswers"];
        };
        /**
         * @description 登録成功レスポンス（201 Created）
         * @example {
         *       "user_id": "550e8400-e29b-41d4-a716-446655440000",
         *       "status": "success"
         *     }
         */
        RegisterResponse: {
            /**
             * Format: uuid
             * @description 新規発行されたユーザー識別子（UUID v4）
             * @example 550e8400-e29b-41d4-a716-446655440000
             */
            user_id: string;
            /**
             * @description 固定値 "success"
             * @enum {string}
             */
            status: "success";
        };
        /**
         * @description 利用規約ゲームのスクロールイベント（200ms 間隔のサンプリングログ）
         * @example {
         *       "position": 1200,
         *       "timestamp": 2500
         *     }
         */
        ScrollEvent: {
            /** @description スクロール位置（px） */
            position: number;
            /** @description ゲーム開始からの経過時間（ms） */
            timestamp: number;
        };
        /**
         * @description 利用規約ゲームのチェックボックス状態（readConfirm / mailMagazine / thirdPartyShare で共通）
         * @example {
         *       "checked": true,
         *       "changed": true
         *     }
         */
        CheckboxState: {
            /** @description 最終的なチェック状態 */
            checked: boolean;
            /** @description ユーザーが初期状態から変更したか */
            changed: boolean;
        };
        /**
         * @description 利用規約ゲームのポップアップ統計。高速スクロール時はポップアップ自体が出ないため TermsGameData 側で optional
         * @example {
         *       "timeToClose": 850,
         *       "clickCount": 1,
         *       "mouseJitter": 42.3
         *     }
         */
        PopupStats: {
            /** @description ポップアップ表示から閉じるまでの時間（ms） */
            timeToClose: number;
            /** @description ポップアップ閉じるまでのクリック回数 */
            clickCount: number;
            /** @description マウス余剰移動距離（px） */
            mouseJitter: number;
        };
        /** @description 利用規約ゲームの行動データ。仕様書「データ構造 → TermsGameData」準拠 */
        TermsGameData: {
            /** @description 滞在時間（秒） */
            totalTime: number;
            /**
             * @description 最終アクション（同意 / 拒否）
             * @enum {string}
             */
            finalAction: "agree" | "disagree";
            /** @description 規約の最下部までスクロールしたか */
            reachedBottom: boolean;
            /** @description スクロールイベントの時系列ログ */
            scrollEvents: components["schemas"]["ScrollEvent"][];
            /** @description 隠しテキスト入力欄の値（未入力なら null） */
            hiddenInput: string | null;
            /** @description 3 つのチェックボックスの最終状態と変更有無 */
            checkboxStates: {
                readConfirm: components["schemas"]["CheckboxState"];
                mailMagazine: components["schemas"]["CheckboxState"];
                thirdPartyShare: components["schemas"]["CheckboxState"];
            };
            popupStats?: components["schemas"]["PopupStats"];
            /** @description 同意ボタンホバー → クリックの迷い時間（ms） */
            agreeButtonHoverTimeMs: number;
        };
        /**
         * @description AI カスタマーサポートの入力方式（voice: 音声 / text: テキスト）
         * @enum {string}
         */
        HelpdeskGameInputMethod: "voice" | "text";
        /** @description AI カスタマーサポートの 1 ターン分のメトリクス。テキスト入力時は音声系フィールドが null */
        HelpdeskGameTurn: {
            /** @description ターン番号（1 始まり） */
            turnIndex: number;
            inputMethod: components["schemas"]["HelpdeskGameInputMethod"];
            /** @description 喋り出しまでの反応速度（ms）。テキスト入力時は null */
            reactionTimeMs: number | null;
            /** @description 発話時間（ms）。テキスト入力時は null */
            speechDurationMs: number | null;
            /** @description 発話中の沈黙合計（ms）。テキスト入力時は null */
            silenceDurationMs: number | null;
            /** @description 平均音量（dB）。テキスト入力時は null */
            volumeDb: number | null;
            /** @description 文字起こし結果 or テキスト入力内容 */
            transcribedText: string;
        };
        /** @description AI カスタマーサポートのテキスト入力メトリクス。全ターン音声入力の場合は HelpdeskGameData 側で null */
        HelpdeskGameTextInputMetrics: {
            /** @description タイピング間隔の分散 */
            typingIntervalVariance: number;
        };
        /** @description AI カスタマーサポートの行動データ。仕様書「データ構造 → HelpdeskGameData」準拠 */
        HelpdeskGameData: {
            inputMethod: components["schemas"]["HelpdeskGameInputMethod"];
            /** @description 実施ターン数 */
            turnCount: number;
            /** @description 各ターンのメトリクス（turnCount 件） */
            turns: components["schemas"]["HelpdeskGameTurn"][];
            textInputMetrics: components["schemas"]["HelpdeskGameTextInputMetrics"] | null;
        };
        /** @description 空気読みグループチャットの 1 ステージ分のメトリクス */
        GroupChatGameStage: {
            /** @description ステージ ID（1-5） */
            stageId: number;
            /** @description 選択した選択肢 ID（1-4 が通常選択、タイムアウト時は 0） */
            selectedOptionId: number;
            /** @description ステージ表示から選択までの反応時間（ms） */
            reactionTimeMs: number;
            /** @description タイムアウトしたか */
            isTimeout: boolean;
        };
        /** @description 空気読みグループチャットの行動データ。仕様書「データ構造 → GroupChatGameData」準拠 */
        GroupChatGameData: {
            /** @description チュートリアル閲覧時間（ms） */
            tutorialViewTime: number;
            /** @description 全ステージ通じた選択肢ホバー回数の合計 */
            hoveredOptions: number;
            /** @description ステージ 3 / 5 で「入力中...」表示後の操作時間（ms）。未計測時は null */
            typingIndicatorReactTimeMs: number | null;
            /** @description 各ステージのメトリクス */
            stages: components["schemas"]["GroupChatGameStage"][];
        };
        /**
         * @description 荷物の種類。urgent=特急 / fragile=取扱注意 / heavy=重量物
         * @enum {string}
         */
        PackageType: "urgent" | "fragile" | "heavy";
        /**
         * @description sort=仕分け / cancel=取り消し / outflow=流出
         * @enum {string}
         */
        SortEventType: "sort" | "cancel" | "outflow";
        /** @description 正解ラベル別に、どのビンへ誤仕分けしたかの回数（省略キーは未定義＝0 回扱い） */
        SorterWrongPatternCountsRow: {
            urgent?: number;
            fragile?: number;
            heavy?: number;
        };
        /** @description 誤仕分けパターン。例: { urgent: { fragile: 2 } } = urgent を fragile に 2 回誤仕分け */
        WrongPatterns: {
            urgent: components["schemas"]["SorterWrongPatternCountsRow"] & unknown;
            fragile: components["schemas"]["SorterWrongPatternCountsRow"] & unknown;
            heavy: components["schemas"]["SorterWrongPatternCountsRow"] & unknown;
        };
        /** @description 荷物仕分けゲームの1イベント分のログ */
        SortEvent: {
            /** @description ゲーム開始からの経過時間（ms） */
            timestamp: number;
            eventType: components["schemas"]["SortEventType"];
            packageType: components["schemas"]["PackageType"];
            /** @description 仕分け先。流出・取り消し時は null */
            binChosen: components["schemas"]["PackageType"] | null;
            /** @description 選択→仕分けの ms。流出・取り消し時は null */
            hesitationMs: number | null;
            /** @description 正解判定（ルール変更後の判定込み）。流出・取り消し時は false */
            correct: boolean;
            /** @description ルール変更後のイベントか */
            duringRuleChange: boolean;
            /** @description 凍結中のクリックか（記録のみ、処理しない） */
            duringFreeze: boolean;
        };
        /** @description 荷物仕分けゲームの行動データ。仕様書「データ構造 → SorterGameData」準拠 */
        SorterGameData: {
            /** @description 実プレイ時間（ms）。設計値 50000ms */
            totalTimeMs: number;
            /** @description プレイ画面の表示用スコア。5 軸スコア算出には使わない */
            finalScore: number;
            /** @description 平均判断時間（選択→仕分けまでの ms 平均） */
            averageHesitationMs: number;
            /** @description ゲーム中に出現した荷物の総数 */
            spawnedPackages: number;
            /** @description 誤仕分けの回数 */
            wrongSortCount: number;
            wrongPatterns: components["schemas"]["WrongPatterns"];
            /** @description 選択取り消し回数 */
            cancelCount: number;
            /** @description 流出ミスの回数（仕分けされず画面外へ流れた荷物） */
            outflowMissCount: number;
            /** @description 凍結中（システム障害 5 秒間）のクリック数 */
            panicClickCount: number;
            /** @description ルール変更後、新ルールで初正解までの ms。未適応なら null */
            ruleChangeAdaptMs: number | null;
            /** @description ゲーム中のイベントログ */
            events: components["schemas"]["SortEvent"][];
        };
        /**
         * @description ゲーム種別。1: 利用規約ゲーム / 2: AI カスタマーサポート / 3: グループチャット / 4: 荷物仕分け
         * @example 1
         * @enum {number}
         */
        GameType: 1 | 2 | 3 | 4;
        /** @description 各ゲーム終了時に行動データを送信するリクエスト。game_type の値（1 / 2 / 3 / 4）で data 構造が決まる（oneOf）。同一ユーザー × 同一 game_type の重複送信は 409 `duplicate_submission` を返す */
        SubmitGameRequest: {
            /**
             * Format: uuid
             * @description ユーザー識別子（UUID v4）
             * @example 550e8400-e29b-41d4-a716-446655440000
             */
            user_id: string;
            /** @enum {number} */
            game_type: 1;
            data: components["schemas"]["TermsGameData"];
        } | {
            /**
             * Format: uuid
             * @description ユーザー識別子（UUID v4）
             * @example 550e8400-e29b-41d4-a716-446655440000
             */
            user_id: string;
            /** @enum {number} */
            game_type: 2;
            data: components["schemas"]["HelpdeskGameData"];
        } | {
            /**
             * Format: uuid
             * @description ユーザー識別子（UUID v4）
             * @example 550e8400-e29b-41d4-a716-446655440000
             */
            user_id: string;
            /** @enum {number} */
            game_type: 3;
            data: components["schemas"]["GroupChatGameData"];
        } | {
            /**
             * Format: uuid
             * @description ユーザー識別子（UUID v4）
             * @example 550e8400-e29b-41d4-a716-446655440000
             */
            user_id: string;
            /** @enum {number} */
            game_type: 4;
            data: components["schemas"]["SorterGameData"];
        };
        /**
         * @description ゲームデータ保存成功レスポンス（200 OK）
         * @example {
         *       "status": "success",
         *       "message": "Game 1 data saved"
         *     }
         */
        SubmitGameResponse: {
            /**
             * @description 固定値 "success"
             * @enum {string}
             */
            status: "success";
            /**
             * @description 保存されたゲームを示す運用向けメッセージ
             * @example Game 1 data saved
             */
            message: string;
        };
        /**
         * @description Game 2（AI カスタマーサポート）で AI 応答を生成するリクエスト
         * @example {
         *       "user_id": "550e8400-e29b-41d4-a716-446655440000",
         *       "message": "パスワードを忘れました",
         *       "conversation_history": [
         *         {
         *           "role": "user",
         *           "content": "ログインできません"
         *         },
         *         {
         *           "role": "assistant",
         *           "content": "どのような問題でしょうか？"
         *         }
         *       ]
         *     }
         */
        VoiceRespondRequest: {
            /**
             * Format: uuid
             * @description ユーザー識別子（UUID v4）
             * @example 550e8400-e29b-41d4-a716-446655440000
             */
            user_id: string;
            /**
             * @description ユーザーの発話テキスト。空文字不可
             * @example パスワードを忘れました
             */
            message: string;
            /** @description 会話履歴（任意）。サーバ側では直近 1 件のみ使用する（仕様書「API 設計書」参照） */
            conversation_history?: {
                /**
                 * @description 発話者。user=エンドユーザー / assistant=AI
                 * @example user
                 * @enum {string}
                 */
                role: "user" | "assistant";
                /**
                 * @description 発話テキスト
                 * @example ログインできません
                 */
                content: string;
            }[];
        };
        /**
         * @description AI 応答生成レスポンス（200 OK）
         * @example {
         *       "response": "パスワードリセットは設定画面から行えます。",
         *       "emotion": "confident",
         *       "confidence": 0.6
         *     }
         */
        VoiceRespondResponse: {
            /**
             * @description AI の返答テキスト
             * @example パスワードリセットは設定画面から行えます。
             */
            response: string;
            /**
             * @description 応答の感情ラベル。confident=自信あり / apologetic=謝罪的 / confused=困惑 / neutral=中立
             * @example confident
             * @enum {string}
             */
            emotion: "confident" | "apologetic" | "confused" | "neutral";
            /**
             * @description 応答の確信度（0-1）。Gemini 成功時は 0.6、フォールバック時は 0.2-0.3
             * @example 0.6
             */
            confidence: number;
        };
        /**
         * @description ゲーム識別子。terms_game = 利用規約ゲーム / helpdesk_game = AIカスタマーサポート（ロング版予備）/ sorter_game = 荷物仕分けゲーム / group_chat_game = 空気読みグループチャット
         * @example terms_game
         * @enum {string}
         */
        GameId: "terms_game" | "helpdesk_game" | "sorter_game" | "group_chat_game";
        /**
         * @description ゲームごとのスコア内訳の配列。各ゲームで測定される軸のみが含まれるため 5 軸すべてが揃うとは限らない（例: terms_game は caution / logic / calmness のみ）。配列長は登録ゲーム数（3）に固定され、game_id はユニーク。
         * @example [
         *       {
         *         "game_id": "terms_game",
         *         "scores": {
         *           "caution": 45,
         *           "logic": 75,
         *           "calmness": 55
         *         }
         *       },
         *       {
         *         "game_id": "helpdesk_game",
         *         "scores": {
         *           "positivity": 70,
         *           "calmness": 55,
         *           "logic": 75
         *         }
         *       },
         *       {
         *         "game_id": "group_chat_game",
         *         "scores": {
         *           "cooperativeness": 60,
         *           "positivity": 70,
         *           "caution": 45
         *         }
         *       }
         *     ]
         */
        GameBreakdown: {
            game_id: components["schemas"]["GameId"];
            /** @description 当該ゲームで測定した軸のスコア（測定軸のみ含むため 5 軸すべては揃わない） */
            scores: {
                /** @description 慎重さ（0-100） */
                caution?: number;
                /** @description 冷静さ（0-100） */
                calmness?: number;
                /** @description 論理性（0-100） */
                logic?: number;
                /** @description 協調性（0-100） */
                cooperativeness?: number;
                /** @description 積極性（0-100） */
                positivity?: number;
            };
        }[];
        /**
         * @description 診断フィードバック（最大ギャップ軸に基づく見出し・説明・指摘点）
         * @example {
         *       "title": "直感ドリブン",
         *       "description": "あなたは論理よりも直感を優先して意思決定する傾向があります。",
         *       "gap_point": "論理性"
         *     }
         */
        DiagnosisFeedback: {
            /**
             * @description 診断タイプの見出し（最大ギャップ軸に基づく）
             * @example 直感ドリブン
             */
            title: string;
            /**
             * @description 診断タイプの説明文
             * @example あなたは論理よりも直感を優先して意思決定する傾向があります。
             */
            description: string;
            /**
             * @description 自己認識と実測の乖離が最大だった軸名（日本語ラベル）
             * @example 論理性
             */
            gap_point: string;
        };
        /**
         * @description 各ゲーム終了後の行動を日本語テキストで振り返ったサマリーの配列。配列長は登録ゲーム数（3）に固定され、game_id はユニーク。
         * @example [
         *       {
         *         "game_id": "terms_game",
         *         "summary": "規約を爆速でスクロールし、最後まで読まずに同意しました。"
         *       },
         *       {
         *         "game_id": "helpdesk_game",
         *         "summary": "AI の理不尽な対応に感情的に反応する場面が見られました。"
         *       },
         *       {
         *         "game_id": "group_chat_game",
         *         "summary": "グループの空気を読みつつ、自分の意見も主張していました。"
         *       }
         *     ]
         */
        PhaseSummaries: {
            game_id: components["schemas"]["GameId"];
            /** @description 当該ゲームの行動を日本語テキストで振り返ったサマリー */
            summary: string;
        }[];
        /**
         * @description ゲーム単位の詳細情報。仕様書「データ構造」→ GameDetail 参照
         * @example {
         *       "game_id": "terms_game",
         *       "title": "利用規約ゲーム",
         *       "feature_scores": [
         *         {
         *           "axis": "caution",
         *           "name": "慎重さ",
         *           "score": 45
         *         }
         *       ],
         *       "metrics": [
         *         {
         *           "label": "読了速度(px/s)",
         *           "user": 2500,
         *           "average": 800,
         *           "category": "scroll"
         *         }
         *       ]
         *     }
         */
        GameDetail: {
            game_id: components["schemas"]["GameId"];
            /** @description ゲーム名（例: 利用規約ゲーム / AIカスタマーサポート / 空気読みグループチャット） */
            title: string;
            /** @description 当該ゲームで測定した軸ごとのスコア配列（測定軸数はゲームごとに異なる） */
            feature_scores: {
                /** @description 軸キー（caution / calmness / logic / cooperativeness / positivity） */
                axis: string;
                /** @description 軸の日本語ラベル（慎重さ / 冷静さ / 論理性 / 協調性 / 積極性） */
                name: string;
                /** @description 当該軸のゲーム単位スコア（0-100 整数） */
                score: number;
            }[];
            /** @description ユーザー値と平均値を並べた比較指標の配列 */
            metrics: {
                /** @description 指標の表示ラベル（例: 読了速度(px/s) / 反応潜時(ms)） */
                label: string;
                /** @description ユーザーの実測値（単位は label に依存） */
                user: number;
                /** @description 比較対象の平均値（単位は label に依存） */
                average: number;
                /** @description 指標のカテゴリ（scroll / time / mouse / input / voice / logic / message / social 等） */
                category: string;
            }[];
        };
        /**
         * @description 各ゲーム固有の詳細情報（タイトル / feature_scores / metrics）の配列。構造は仕様書「データ構造」→ GameDetail を参照。配列長は登録ゲーム数（3）に固定され、game_id はユニーク。
         * @example [
         *       {
         *         "game_id": "terms_game",
         *         "title": "利用規約ゲーム",
         *         "feature_scores": [
         *           {
         *             "axis": "caution",
         *             "name": "慎重さ",
         *             "score": 45
         *           }
         *         ],
         *         "metrics": [
         *           {
         *             "label": "読了速度(px/s)",
         *             "user": 2500,
         *             "average": 800,
         *             "category": "scroll"
         *           }
         *         ]
         *       },
         *       {
         *         "game_id": "helpdesk_game",
         *         "title": "AIカスタマーサポート",
         *         "feature_scores": [
         *           {
         *             "axis": "positivity",
         *             "name": "積極性",
         *             "score": 70
         *           }
         *         ],
         *         "metrics": [
         *           {
         *             "label": "発話数",
         *             "user": 8,
         *             "average": 5,
         *             "category": "message"
         *           }
         *         ]
         *       },
         *       {
         *         "game_id": "group_chat_game",
         *         "title": "空気読みグループチャット",
         *         "feature_scores": [
         *           {
         *             "axis": "cooperativeness",
         *             "name": "協調性",
         *             "score": 60
         *           }
         *         ],
         *         "metrics": [
         *           {
         *             "label": "発言数",
         *             "user": 4,
         *             "average": 3,
         *             "category": "message"
         *           }
         *         ]
         *       }
         *     ]
         */
        Details: components["schemas"]["GameDetail"][];
        /**
         * @description 診断結果レスポンス（200 OK）
         * @example {
         *       "user_id": "550e8400-e29b-41d4-a716-446655440000",
         *       "self_mbti": "ENTP",
         *       "mbti_scores": {
         *         "caution": 40,
         *         "calmness": 50,
         *         "logic": 70,
         *         "cooperativeness": 55,
         *         "positivity": 85
         *       },
         *       "scores": {
         *         "caution": 45,
         *         "calmness": 55,
         *         "logic": 75,
         *         "cooperativeness": 60,
         *         "positivity": 70
         *       },
         *       "baseline_scores": {
         *         "caution": 50,
         *         "calmness": 60,
         *         "logic": 65,
         *         "cooperativeness": 55,
         *         "positivity": 75
         *       },
         *       "gaps": {
         *         "caution": -5,
         *         "calmness": -5,
         *         "logic": 10,
         *         "cooperativeness": 5,
         *         "positivity": -5
         *       },
         *       "game_breakdown": [
         *         {
         *           "game_id": "terms_game",
         *           "scores": {
         *             "caution": 45,
         *             "logic": 75,
         *             "calmness": 55
         *           }
         *         },
         *         {
         *           "game_id": "helpdesk_game",
         *           "scores": {
         *             "positivity": 70,
         *             "calmness": 55,
         *             "logic": 75
         *           }
         *         },
         *         {
         *           "game_id": "group_chat_game",
         *           "scores": {
         *             "cooperativeness": 60,
         *             "positivity": 70,
         *             "caution": 45
         *           }
         *         }
         *       ],
         *       "feedback": {
         *         "title": "直感ドリブン",
         *         "description": "あなたは論理よりも直感を優先して意思決定する傾向があります。",
         *         "gap_point": "論理性"
         *       },
         *       "accuracy_score": 78,
         *       "phase_summaries": [
         *         {
         *           "game_id": "terms_game",
         *           "summary": "規約を爆速でスクロールし、最後まで読まずに同意しました。"
         *         },
         *         {
         *           "game_id": "helpdesk_game",
         *           "summary": "AI の理不尽な対応に感情的に反応する場面が見られました。"
         *         },
         *         {
         *           "game_id": "group_chat_game",
         *           "summary": "グループの空気を読みつつ、自分の意見も主張していました。"
         *         }
         *       ],
         *       "details": [
         *         {
         *           "game_id": "terms_game",
         *           "title": "利用規約ゲーム",
         *           "feature_scores": [
         *             {
         *               "axis": "caution",
         *               "name": "慎重さ",
         *               "score": 45
         *             }
         *           ],
         *           "metrics": [
         *             {
         *               "label": "読了速度(px/s)",
         *               "user": 2500,
         *               "average": 800,
         *               "category": "scroll"
         *             }
         *           ]
         *         },
         *         {
         *           "game_id": "helpdesk_game",
         *           "title": "AIカスタマーサポート",
         *           "feature_scores": [
         *             {
         *               "axis": "positivity",
         *               "name": "積極性",
         *               "score": 70
         *             }
         *           ],
         *           "metrics": [
         *             {
         *               "label": "発話数",
         *               "user": 8,
         *               "average": 5,
         *               "category": "message"
         *             }
         *           ]
         *         },
         *         {
         *           "game_id": "group_chat_game",
         *           "title": "空気読みグループチャット",
         *           "feature_scores": [
         *             {
         *               "axis": "cooperativeness",
         *               "name": "協調性",
         *               "score": 60
         *             }
         *           ],
         *           "metrics": [
         *             {
         *               "label": "発言数",
         *               "user": 4,
         *               "average": 3,
         *               "category": "message"
         *             }
         *           ]
         *         }
         *       ]
         *     }
         */
        ResultResponse: {
            /**
             * Format: uuid
             * @description ユーザー識別子（UUID v4）
             * @example 550e8400-e29b-41d4-a716-446655440000
             */
            user_id: string;
            /**
             * @description 自己申告の MBTI タイプ。登録時にスキップした場合は null
             * @example INTJ
             */
            self_mbti: string | null;
            /** @description MBTI 理論値（self_mbti から導出）。self_mbti が null の場合は null */
            mbti_scores: components["schemas"]["BaselineScores"] | null;
            scores: components["schemas"]["BaselineScores"] & unknown;
            baseline_scores: components["schemas"]["BaselineScores"] & unknown;
            gaps: components["schemas"]["GapScores"] & unknown;
            game_breakdown: components["schemas"]["GameBreakdown"];
            feedback: components["schemas"]["DiagnosisFeedback"];
            /**
             * @description 自己認識精度（0-100 の整数）。100 - |平均ギャップ|
             * @example 78
             */
            accuracy_score: number;
            phase_summaries: components["schemas"]["PhaseSummaries"];
            details: components["schemas"]["Details"];
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
