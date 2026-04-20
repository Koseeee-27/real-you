import { RequestHandler } from 'express';
import { ZodType } from 'zod';

/**
 * validate ミドルウェアに渡す検証スキーマ。
 * body / params / query を個別または同時に検証できる。
 */
export interface ValidateSchemas {
    body?: ZodType;
    params?: ZodType;
    query?: ZodType;
}

/**
 * リクエストの body / params / query を zod スキーマで検証するミドルウェア。
 *
 * 検証失敗時は ZodError をそのまま next() に渡し、errorHandler で仕様書通りの
 * エラーフォーマットに変換する（status / error / message）。
 *
 * body / params / query を同時指定した場合は body → params → query の順に
 * 検証し、**最初に失敗したスキーマの ZodError を返して以降は検証しない**（fail-fast）。
 * 複数箇所のエラーを 1 回のレスポンスに集約する用途では使えない。
 *
 * 検証成功時は parse 結果（transform / default 適用後の値）でリクエストを上書きする。
 * - body: プロパティ再代入で上書き
 * - params / query: Express 5 の getter 実装に配慮し、参照を維持したまま中身だけ差し替える
 */
export const validate = (schemas: ValidateSchemas): RequestHandler => {
    return (req, _res, next) => {
        if (schemas.body) {
            const result = schemas.body.safeParse(req.body);
            if (!result.success) return next(result.error);
            req.body = result.data;
        }

        if (schemas.params) {
            const result = schemas.params.safeParse(req.params);
            if (!result.success) return next(result.error);
            replaceContents(req.params as Record<string, unknown>, result.data as Record<string, unknown>);
        }

        if (schemas.query) {
            const result = schemas.query.safeParse(req.query);
            if (!result.success) return next(result.error);
            replaceContents(req.query as Record<string, unknown>, result.data as Record<string, unknown>);
        }

        next();
    };
};

/**
 * target オブジェクトの中身を source の内容で置き換える。
 * 参照を維持したまま差し替えるため、Express 5 で getter 経由の
 * req.params / req.query に対しても安全に使える。
 */
function replaceContents(target: Record<string, unknown>, source: Record<string, unknown>): void {
    for (const key of Object.keys(target)) {
        delete target[key];
    }
    Object.assign(target, source);
}
