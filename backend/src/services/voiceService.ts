/**
 * voiceService.ts
 *
 * 戦略:
 * 1. 複数Geminiモデルに同時並列リクエスト（Promise.any）
 * 2. 最大5秒タイムアウト（AbortController）
 * 3. タイムアウト or 全失敗 → キーワードベースのフォールバック
 *
 * フロントへの影響: ゼロ（レスポンス形式変わらず）
 */

import { getKeywordFallback } from './fallbackService';

const GEMINI_TIMEOUT_MS = 5000;

// プロンプトは短く・速く
const SYSTEM_PROMPT = `あなたはカスタマーサポート担当です。知識が中途半端で時々ずれた答えをします。自信満々ですが曖昧な話し言葉で答えてください。50文字以内で返してください。`;

const MODELS = [
    'gemini-2.0-flash-lite',
    'gemini-flash-latest',
];

interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface VoiceResponse {
    response: string;
    emotion: string;
    confidence: number;
}

function estimateEmotion(text: string): string {
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
    contents: any[],
    apiKey: string,
    signal: AbortSignal,
): Promise<VoiceResponse> {
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
                temperature: 0.9,
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`${modelName}: HTTP ${response.status}`);
    }

    const data = await response.json();
    const text: string = data.candidates[0].content.parts[0].text;

    return {
        response: text.trim(),
        emotion: estimateEmotion(text),
        confidence: 0.6,
    };
}

/**
 * 複数モデルに並列リクエストして一番早く成功したものを返す（Promise.any）
 * 全モデル失敗 or タイムアウトで reject
 */
async function callGeminiParallel(
    message: string,
    conversationHistory: ConversationMessage[],
    apiKey: string,
): Promise<VoiceResponse> {
    // 会話履歴は直近1件のみ（速度優先）
    const recentHistory = conversationHistory.slice(-1);
    const contents: any[] = [];
    for (const msg of recentHistory) {
        contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        });
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    // 全モデル共通のタイムアウト用 AbortController
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    try {
        // 全モデルに同時リクエスト → 一番早く成功したものを返す
        const result = await Promise.any(
            MODELS.map(model => requestToModel(model, contents, apiKey, controller.signal))
        );
        clearTimeout(timer);
        console.log('[voiceService] Gemini parallel OK');
        return result;
    } catch (err: any) {
        clearTimeout(timer);
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
    ): Promise<VoiceResponse> {
        if (!message) {
            throw { status: 400, code: 'invalid_request', message: 'message is required' };
        }

        const apiKey = process.env.GEMINI_API_KEY;

        // APIキーなし → 即フォールバック
        if (!apiKey) {
            console.warn('[voiceService] GEMINI_API_KEY not set. Using fallback.');
            return getKeywordFallback(message);
        }

        try {
            return await callGeminiParallel(message, conversationHistory ?? [], apiKey);
        } catch (err: any) {
            const reason = err?.name === 'AbortError' ? 'timeout(5s)' : 'all models failed';
            console.warn(`[voiceService] Gemini failed (${reason}). Using keyword fallback.`);
            return getKeywordFallback(message);
        }
    },
};
