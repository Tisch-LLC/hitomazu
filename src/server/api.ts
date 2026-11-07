import { todayJST } from "../domain/dates";
import { askAboutItem, MAX_QUESTION_LENGTH, sanitizeProfile } from "./ask";
import { toUserFacingError } from "./claude";
import { publicClaudeStatus, type ClaudeConfig } from "./config";
import type { LimitResult } from "./limits";
import { MAX_TEXT_LENGTH, understandSituation } from "./understand";

/**
 * API の処理。Bun のサーバー（src/index.ts）と Cloudflare Workers（src/worker.ts）の両方から使う。
 * 実行環境に依存する部分（利用者の識別、上限の数え方）は外から渡す。
 */

export interface Limiter {
  tryConsume(clientId: string): Promise<LimitResult> | LimitResult;
}

export interface ApiContext {
  claude: ClaudeConfig;
  limiter: Limiter;
  clientId: string;
}

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const badRequest = (message: string) => Response.json({ error: message }, { status: 400 });

/** 上限の確認と、利用者向けのエラー処理をまとめて行う */
async function withClaude(ctx: ApiContext, label: string, run: () => Promise<unknown>): Promise<Response> {
  const limit = await ctx.limiter.tryConsume(ctx.clientId);
  if (!limit.ok) return Response.json({ error: limit.message }, { status: 429 });
  try {
    return Response.json(await run());
  } catch (error) {
    const e = toUserFacingError(error);
    console.error(`${label}:`, e.message);
    return Response.json({ error: e.userMessage }, { status: 502 });
  }
}

/** /api/ 以下のリクエストを処理する。該当しなければ null */
export async function handleApi(req: Request, ctx: ApiContext): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/api/status" && req.method === "GET") {
    return Response.json({ claude: publicClaudeStatus(ctx.claude) });
  }

  if (path === "/api/understand" && req.method === "POST") {
    const body = await readJson(req);
    const text = body?.text;
    if (typeof text !== "string" || text.trim() === "") return badRequest("文章を入力してください。");
    if (text.length > MAX_TEXT_LENGTH) return badRequest(`文章は${MAX_TEXT_LENGTH}文字までにしてください。`);
    return withClaude(ctx, "understand", () => understandSituation(text.trim(), todayJST(), ctx.claude));
  }

  if (path === "/api/ask" && req.method === "POST") {
    const body = await readJson(req);
    const itemId = body?.itemId;
    const question = body?.question;
    if (typeof itemId !== "string" || itemId.length > 60) return badRequest("項目が分かりませんでした。");
    if (typeof question !== "string" || question.trim() === "") return badRequest("質問を入力してください。");
    if (question.length > MAX_QUESTION_LENGTH) return badRequest(`質問は${MAX_QUESTION_LENGTH}文字までにしてください。`);
    const profile = sanitizeProfile(body?.profile);
    return withClaude(ctx, "ask", () => askAboutItem(itemId, question.trim(), profile, todayJST(), ctx.claude));
  }

  if (path.startsWith("/api/")) {
    return Response.json({ error: "見つかりません。" }, { status: 404 });
  }
  return null;
}
