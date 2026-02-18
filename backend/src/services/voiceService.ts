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

        const systemPrompt = SCENARIO_PROMPTS[scenarioType || 'normal'];

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-lite',
            systemInstruction: systemPrompt,
        });

        const result = await model.generateContent(message);
        return result.response.text();
    }
};
