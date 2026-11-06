/**
 * Claude API の使いすぎを防ぐ仕組み（公開時の高額請求対策）。
 *
 * - 同じ利用者（IPアドレス）からの呼び出しは、一定時間あたりの回数まで
 * - アプリ全体の呼び出しは、1日あたりの回数まで（日付が変わると戻る）
 * 上限に達しても、Claude を使わない「質問に答える」流れはそのまま使える。
 * 金額の上限は、Claude Console のワークスペースの利用上限でも必ず設定する。
 */

export interface LimitConfig {
  /** 1日あたりの全体の上限回数 */
  dailyLimit: number;
  /** 同じ利用者が windowMs の間に呼べる回数 */
  perClientLimit: number;
  windowMs: number;
}

type Env = Record<string, string | undefined>;

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function readLimitConfig(env: Env = process.env): LimitConfig {
  return {
    dailyLimit: positiveInt(env.CLAUDE_DAILY_LIMIT, 300),
    perClientLimit: positiveInt(env.CLAUDE_PER_CLIENT_LIMIT, 10),
    windowMs: positiveInt(env.CLAUDE_PER_CLIENT_WINDOW_MINUTES, 10) * 60_000,
  };
}

export type LimitResult = { ok: true } | { ok: false; reason: "client" | "daily"; message: string };

export class UsageLimiter {
  private day = "";
  private dailyCount = 0;
  private clients = new Map<string, number[]>();

  constructor(
    private readonly config: LimitConfig,
    private readonly now: () => number = Date.now,
  ) {}

  /** 呼び出してよければ回数を数えて ok を返す */
  tryConsume(clientId: string): LimitResult {
    const t = this.now();
    const today = new Date(t).toISOString().slice(0, 10);
    if (today !== this.day) {
      this.day = today;
      this.dailyCount = 0;
      this.clients.clear();
    }

    const recent = (this.clients.get(clientId) ?? []).filter((x) => t - x < this.config.windowMs);
    if (recent.length >= this.config.perClientLimit) {
      this.clients.set(clientId, recent);
      return {
        ok: false,
        reason: "client",
        message: "短い時間に何度も使われたため、少し休ませています。10分ほど待ってから、もう一度試してください。AIを使わない機能は、そのまま使えます。",
      };
    }
    if (this.dailyCount >= this.config.dailyLimit) {
      return {
        ok: false,
        reason: "daily",
        message: "今日はAIの機能の利用が上限に達しました。明日また使えます。AIを使わない機能は、そのまま使えます。",
      };
    }

    recent.push(t);
    this.clients.set(clientId, recent);
    this.dailyCount += 1;
    return { ok: true };
  }
}
