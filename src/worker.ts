import { handleApi, type Limiter } from "./server/api";
import { readClaudeConfig } from "./server/config";
import { readLimitConfig, UsageLimiter, type LimitResult } from "./server/limits";

/**
 * Cloudflare Workers の入口。
 * 画面（dist/）は Workers の静的アセットとして配信し、/api/ だけをここで処理する。
 *
 * 必要な設定（wrangler.toml と `wrangler secret put`）：
 * - ANTHROPIC_API_KEY（secret）
 * - CLAUDE_MODEL、CLAUDE_DAILY_LIMIT、CLAUDE_PER_CLIENT_LIMIT（vars、省略可）
 * - CLAUDE_RL（Rate Limiting binding、省略可）：同じ利用者からの1分あたりの回数
 * - USAGE_KV（KV namespace、省略可）：1日あたりの全体の回数
 * どちらの binding もない場合は、メモリ上の上限（インスタンスごと）だけになる。
 */

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}
interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}
interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface Env {
  ASSETS: Fetcher;
  ANTHROPIC_API_KEY?: string;
  CLAUDE_MODEL?: string;
  CLAUDE_DAILY_LIMIT?: string;
  CLAUDE_PER_CLIENT_LIMIT?: string;
  CLAUDE_PER_CLIENT_WINDOW_MINUTES?: string;
  CLAUDE_RL?: RateLimit;
  USAGE_KV?: KVNamespaceLike;
}

/** 文字列の設定値だけを取り出す（binding は含めない） */
function envVars(env: Env): Record<string, string | undefined> {
  return {
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
    CLAUDE_MODEL: env.CLAUDE_MODEL,
    CLAUDE_DAILY_LIMIT: env.CLAUDE_DAILY_LIMIT,
    CLAUDE_PER_CLIENT_LIMIT: env.CLAUDE_PER_CLIENT_LIMIT,
    CLAUDE_PER_CLIENT_WINDOW_MINUTES: env.CLAUDE_PER_CLIENT_WINDOW_MINUTES,
  };
}

/** メモリ上の上限は、インスタンスが生きている間だけ数える（Workers では補助的な役割） */
let memoryLimiter: UsageLimiter | null = null;

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Cloudflare の binding があればそれを使い、なければメモリ上の上限に任せる */
function makeLimiter(env: Env): Limiter {
  const config = readLimitConfig(envVars(env));
  memoryLimiter ??= new UsageLimiter(config);
  return {
    async tryConsume(clientId: string): Promise<LimitResult> {
      if (env.CLAUDE_RL) {
        const { success } = await env.CLAUDE_RL.limit({ key: clientId });
        if (!success) {
          return {
            ok: false,
            reason: "client",
            message: "短い時間に何度も使われたため、少し休ませています。1分ほど待ってから、もう一度試してください。AIを使わない機能は、そのまま使えます。",
          };
        }
      }
      if (env.USAGE_KV) {
        const key = `daily:${todayUTC()}`;
        const count = Number((await env.USAGE_KV.get(key)) ?? "0");
        if (count >= config.dailyLimit) {
          return {
            ok: false,
            reason: "daily",
            message: "今日はAIの機能の利用が上限に達しました。明日また使えます。AIを使わない機能は、そのまま使えます。",
          };
        }
        await env.USAGE_KV.put(key, String(count + 1), { expirationTtl: 60 * 60 * 48 });
      }
      if (env.CLAUDE_RL && env.USAGE_KV) return { ok: true };
      // binding が足りない分は、メモリ上の上限で補う
      return memoryLimiter!.tryConsume(clientId);
    },
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await handleApi(request, {
      claude: readClaudeConfig(envVars(env)),
      limiter: makeLimiter(env),
      clientId: request.headers.get("cf-connecting-ip") ?? "unknown",
    });
    if (response) return response;
    return env.ASSETS.fetch(request);
  },
};
