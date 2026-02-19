import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `あなたはカスタマーサポート担当ですが、知識が不完全で時々間違ったアドバイスをします。
自信満々に答えますが、「多分」「～だと思います」などの曖昧な表現を使います。
ユーザーを混乱させるような、少しずれた回答を心がけてください。
短く返答してください（50文字以内）。`;

interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface VoiceResponse {
    response: string;
    emotion: string;
    confidence: number;
}

export const voiceService = {
    async generateAiResponse(
        message: string,
        conversationHistory?: ConversationMessage[],
    ): Promise<VoiceResponse> {
        if (!message) {
            throw { status: 400, code: 'invalid_request', message: 'message is required' };
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw { status: 500, code: 'server_error', message: 'GEMINI_API_KEY is not configured' };
        }

        // 会話履歴をGemini用のcontentsに変換
        const contents: any[] = [];
        if (conversationHistory && conversationHistory.length > 0) {
            for (const msg of conversationHistory) {
                contents.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }],
                });
            }
        }
        // 現在のメッセージを追加
        contents.push({
            role: 'user',
            parts: [{ text: message }],
        });

        const modelsToTry = ['gemini-flash-latest', 'gemini-2.0-flash-lite', 'gemini-pro-latest'];
        const maxRetries = 3;

        for (const modelName of modelsToTry) {
            let retryCount = 0;
            let delay = 1000;
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

            while (retryCount < maxRetries) {
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            contents,
                            systemInstruction: {
                                parts: [{ text: SYSTEM_PROMPT }]
                            }
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        if (response.status === 429) {
                            throw { status: 429, message: 'Quota exceeded' };
                        }
                        if (response.status === 404) {
                            throw { status: 404, message: 'Model not found' };
                        }
                        throw {
                            status: response.status,
                            message: errorData.error?.message || response.statusText
                        };
                    }

                    const data = await response.json();
                    const responseText = data.candidates[0].content.parts[0].text;

                    // emotion と confidence を簡易的に推定
                    const emotion = estimateEmotion(responseText);
                    const confidence = 0.6; // ポンコツAIなので低め固定

                    return {
                        response: responseText,
                        emotion,
                        confidence,
                    };

                } catch (error: any) {
                    if (error.status === 429) {
                        console.warn(`Gemini API Quota exceeded for ${modelName}. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${maxRetries})`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        delay *= 2;
                        retryCount++;
                    } else if (error.status === 404) {
                        console.warn(`Model ${modelName} not found (REST 404). Trying next model...`);
                        break;
                    } else {
                        throw error;
                    }
                }
            }
        }
        throw { status: 500, code: 'ai_failed', message: 'All AI models failed or quota exceeded' };
    }
};

/**
 * レスポンステキストから感情を簡易推定
 */
function estimateEmotion(text: string): string {
    if (text.includes('多分') || text.includes('思います') || text.includes('かも')) {
        return 'confused';
    }
    if (text.includes('！') || text.includes('ます！')) {
        return 'confident';
    }
    if (text.includes('すみません') || text.includes('申し訳')) {
        return 'apologetic';
    }
    return 'neutral';
}
