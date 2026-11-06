import { serve, type Server } from "bun";
import { todayISO } from "./domain/dates";
import index from "./index.html";
import { askAboutItem, MAX_QUESTION_LENGTH, sanitizeProfile } from "./server/ask";
import { toUserFacingError } from "./server/claude";
import { publicClaudeStatus, readClaudeConfig } from "./server/config";
import { readLimitConfig, UsageLimiter } from "./server/limits";
import { MAX_TEXT_LENGTH, understandSituation } from "./server/understand";

const claude = readClaudeConfig();
const limiter = new UsageLimiter(readLimitConfig());
/** リバースプロキシの後ろで動かすときだけ、X-Forwarded-For を信じる */
const trustProxy = process.env.TRUST_PROXY === "1";

function clientId(req: Request, server: Server<unknown>): string {
  if (trustProxy) {
    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded) return forwarded;
  }
  return server.requestIP(req)?.address ?? "unknown";
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
async function withClaude(req: Request, server: Server<unknown>, label: string, run: () => Promise<unknown>) {
  const limit = limiter.tryConsume(clientId(req, server));
  if (!limit.ok) return Response.json({ error: limit.message }, { status: 429 });
  try {
    return Response.json(await run());
  } catch (error) {
    const e = toUserFacingError(error);
    console.error(`${label}:`, e.message);
    return Response.json({ error: e.userMessage }, { status: 502 });
  }
}

const server = serve({
  routes: {
    // 画面はすべて index.html から表示する
    "/*": index,

    // Claude API が使える状態か（キーそのものは返さない）
    "/api/status": {
      GET() {
        return Response.json({ claude: publicClaudeStatus(claude) });
      },
    },

    // 自分の言葉で書いた状況を読み取る
    "/api/understand": {
      async POST(req, server) {
        const body = await readJson(req);
        const text = body?.text;
        if (typeof text !== "string" || text.trim() === "") return badRequest("文章を入力してください。");
        if (text.length > MAX_TEXT_LENGTH) return badRequest(`文章は${MAX_TEXT_LENGTH}文字までにしてください。`);
        return withClaude(req, server, "understand", () => understandSituation(text.trim(), todayISO(), claude));
      },
    },

    // やることリストの1項目について質問する
    "/api/ask": {
      async POST(req, server) {
        const body = await readJson(req);
        const itemId = body?.itemId;
        const question = body?.question;
        if (typeof itemId !== "string" || itemId.length > 60) return badRequest("項目が分かりませんでした。");
        if (typeof question !== "string" || question.trim() === "") return badRequest("質問を入力してください。");
        if (question.length > MAX_QUESTION_LENGTH) return badRequest(`質問は${MAX_QUESTION_LENGTH}文字までにしてください。`);
        const profile = sanitizeProfile(body?.profile);
        return withClaude(req, server, "ask", () => askAboutItem(itemId, question.trim(), profile, todayISO(), claude));
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at ${server.url}`);
console.log(
  claude.apiKey
    ? `Claude API: 設定済み（モデル ${claude.model}）`
    : "Claude API: 未設定（.env に ANTHROPIC_API_KEY を設定してください）",
);
