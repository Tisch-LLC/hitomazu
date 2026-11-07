import { serve, type Server } from "bun";
import index from "./index.html";
import { handleApi } from "./server/api";
import { readClaudeConfig } from "./server/config";
import { readLimitConfig, UsageLimiter } from "./server/limits";

/**
 * 手元で動かすときのサーバー（Bun）。公開時は Cloudflare Workers（src/worker.ts）を使う。
 */

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

const server = serve({
  routes: {
    // 画面はすべて index.html から表示する
    "/*": index,
    "/api/*": async (req, server) =>
      (await handleApi(req, { claude, limiter, clientId: clientId(req, server) })) ??
      Response.json({ error: "見つかりません。" }, { status: 404 }),
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
