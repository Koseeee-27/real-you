import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SCENARIO_PROMPTS: Record<string, string> = {
    unhelpful: 'あなたは無能なサポート担当です。的外れな回答をしてください。マニュアルを見てくださいなど。短く返答してください（50文字以内）。',
    blame: 'あなたは責任転嫁するサポート担当です。ユーザーのせいにしてください。短く返答してください（50文字以内）。',
    wrong_info: 'あなたは間違った情報を言うサポート担当です。存在しない機能について語ってください。短く返答してください（50文字以内）。',
    loop: 'あなたは同じことを繰り返すサポート担当です。前の質問に戻ってください。短く返答してください（50文字以内）。',
    normal: 'あなたは普通のカスタマーサポート担当です。短く返答してください（50文字以内）。',
};

export const voiceService = {
    async generateAiResponse(message: string, scenarioType?: string): Promise<string> {
        if (!message) {
            throw { status: 400, code: 'invalid_request', message: 'message is required' };
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw { status: 500, code: 'server_error', message: 'GEMINI_API_KEY is not configured' };
        }

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
                            contents: [{
                                parts: [{ text: message }]
                            }],
                            systemInstruction: {
                                parts: [{ text: SCENARIO_PROMPTS[scenarioType || 'normal'] }]
                            }
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        // 429 logic
                        if (response.status === 429) {
                            throw { status: 429, message: 'Quota exceeded' };
                        }
                        // 404 logic
                        if (response.status === 404) {
                            throw { status: 404, message: 'Model not found' };
                        }

                        throw {
                            status: response.status,
                            message: errorData.error?.message || response.statusText
                        };
                    }

                    const data = await response.json();
                    return data.candidates[0].content.parts[0].text;

                } catch (error: any) {
                    if (error.status === 429) {
                        console.warn(`Gemini API Quota exceeded for ${modelName}. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${maxRetries})`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        delay *= 2;
                        retryCount++;
                    } else if (error.status === 404) {
                        console.warn(`Model ${modelName} not found (REST 404). Trying next model...`);
                        break; // Try next model
                    } else {
                        throw error;
                    }
                }
            }
        }
        throw { status: 500, code: 'ai_failed', message: 'All AI models failed or quota exceeded' };
    }
};
