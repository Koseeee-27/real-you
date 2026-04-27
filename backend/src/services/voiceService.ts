/**
 * voiceService.ts
 *
 * 戦略:
 * 1. Gemini にリクエスト（最大5秒タイムアウト）
 * 2. 失敗時はエラーをスロー（モック/フォールバックは使用しない）
 */

import { Content } from '@google/generative-ai';
import { z } from 'zod';
import {
    ConversationMessage,
    VoiceEmotion,
    VoiceRespondResponse,
} from '../schemas/voice';
import { getKeywordFallback } from './fallbackService';

const GEMINI_TIMEOUT_MS = 5000;

/**
 * Gemini generateContent レスポンスの最小限スキーマ。
 *
 * `Response.json()` は lib.dom 定義で `Promise<any>` 固定のため、any 伝染を
 * 防ぐには受け側で検証する必要がある。voiceService からしか使わない内部用
 * スキーマなので schemas/ には置かず本ファイル内にローカル定義する。
 *
 * SAFETY フィルター発動時など `candidates` が空 / `parts` が空のケースでは
 * parse が失敗するため、requestToModel 側で ZodError を明示エラーに包んで
 * スローし、既存 catch のフォールバック挙動を維持する。
 */
const GeminiResponseSchema = z.object({
    candidates: z
        .array(
            z.object({
                content: z.object({
                    parts: z
                        .array(z.object({ text: z.string() }))
                        .min(1),
                }),
            }),
        )
        .min(1),
});

// プロンプトは短く・速く
const SYSTEM_PROMPT = `あなたはカスタマーサポート担当です。少し知識が中途半端で、ピントのずれた回答をします。回答は必ず「～かもしれません」「～だと思います」といった曖昧な文章で終わらせてください。短く、1〜2文（50文字程度）で返答してください。`;

const PRIMARY_MODEL = 'gemini-2.0-flash-lite';

function estimateEmotion(text: string): VoiceEmotion {
    if (text.includes('多分') || text.includes('思います') || text.includes('かも')) return 'confused';
    if (text.includes('ありがとう') || text.includes('承りました')) return 'confident';
    if (text.includes('すみません') || text.includes('申し訳')) return 'apologetic';
    return 'neutral';
}

/**
 * 1つのモデルにリクエストを送る（タイムアウト付き）
 * エラー時は reject する
 */
async function requestToModel(
    modelName: string,
    contents: Content[],
    apiKey: string,
    signal: AbortSignal,
): Promise<VoiceRespondResponse> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            generationConfig: {
                maxOutputTokens: 80,
                temperature: 0.7, // ランダム性を少し抑えて文章崩壊を防ぐ
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`${modelName}: HTTP ${response.status}`);
    }

    // Response.json() は any を返すため、ここで zod により型・ランタイム検証する
    const parseResult = GeminiResponseSchema.safeParse(await response.json());
    if (!parseResult.success) {
        // ZodError の詳細はログに残しつつ、上位 catch には簡潔なメッセージで伝える
        console.error(
            `[voiceService] ${modelName}: invalid response shape`,
            parseResult.error.issues,
        );
        throw new Error(`${modelName}: invalid response`);
    }

    const text = parseResult.data.candidates[0].content.parts[0].text;

    return {
        response: text.trim(),
        emotion: estimateEmotion(text),
        confidence: 0.6,
    };
}

/**
 * 単独モデルにリクエストし、タイムアウトで弾く
 */
async function callGeminiSequential(
    message: string,
    conversationHistory: ConversationMessage[],
    apiKey: string,
): Promise<VoiceRespondResponse> {
    // 会話履歴は直近1件のみ（速度優先）
    const recentHistory = conversationHistory.slice(-1);
    const contents: Content[] = [];
    for (const msg of recentHistory) {
        contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        });
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    // タイムアウト用 AbortController
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    try {
        const result = await requestToModel(PRIMARY_MODEL, contents, apiKey, controller.signal);
        clearTimeout(timer);
        console.log(`[voiceService] Gemini (${PRIMARY_MODEL}) OK`);
        return result;
    } catch (err: unknown) {
        clearTimeout(timer);
        const detail = err instanceof Error ? err.message : String(err);
        console.error(`[voiceService] Gemini failed. Inner error:`, detail);
        throw err;
    }
}

// ============================
// メインの voiceService
// ============================

export const voiceService = {
    async generateAiResponse(
        message: string,
        conversationHistory?: ConversationMessage[],
    ): Promise<VoiceRespondResponse> {
        // message の必須・空文字チェックは route 層の zod スキーマに一元化済み
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.warn('[voiceService] GEMINI_API_KEY not set. Using fallback.');
            return getKeywordFallback(message);
        }

        try {
            return await callGeminiSequential(message, conversationHistory ?? [], apiKey);
        } catch (err: unknown) {
            let reason: string;
            if (err instanceof Error) {
                reason = err.name === 'AbortError' ? 'タイムアウト' : err.message || '不明なエラー';
            } else {
                reason = '不明なエラー';
            }
            console.warn('[voiceService] Gemini failed:', reason, '- Using fallback response.');
            return getKeywordFallback(message);
        }
    },
};
