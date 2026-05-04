import { Router, Request, Response, NextFunction } from "express";
import { voiceService } from "../services/voiceService";
import { userRepository } from "../repositories/userRepository";
import { validate } from "../middleware/validate";
import {
  voiceRespondRequestSchema,
  VoiceRespondRequest,
  VoiceRespondResponse,
} from "../schemas/voice";
import { ERROR_CODES } from "../schemas/errorCodes";

const router = Router();

router.post(
  "/respond",
  validate({ body: voiceRespondRequestSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id, message, conversation_history } =
        req.body as VoiceRespondRequest;

      // user_id の存在確認は DB 参照が必要なため route 層に残す
      // （形式検証は zod 側で済ませている）
      const exists = await userRepository.exists(user_id);
      if (!exists) {
        throw {
          status: 400,
          code: ERROR_CODES.INVALID_USER_ID,
          message: "ユーザーIDが存在しません",
        };
      }

      const result = await voiceService.generateAiResponse(
        message,
        conversation_history,
      );

      const response: VoiceRespondResponse = {
        response: result.response,
        emotion: result.emotion,
        confidence: result.confidence,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
