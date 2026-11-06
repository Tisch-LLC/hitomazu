import { expect, test } from "bun:test";
import { readLimitConfig, UsageLimiter } from "./limits";

test("環境変数から上限を読む。不正な値は既定値", () => {
  expect(readLimitConfig({ CLAUDE_DAILY_LIMIT: "50", CLAUDE_PER_CLIENT_LIMIT: "3", CLAUDE_PER_CLIENT_WINDOW_MINUTES: "5" })).toEqual({
    dailyLimit: 50,
    perClientLimit: 3,
    windowMs: 300_000,
  });
  expect(readLimitConfig({ CLAUDE_DAILY_LIMIT: "-1", CLAUDE_PER_CLIENT_LIMIT: "abc" })).toEqual({
    dailyLimit: 300,
    perClientLimit: 10,
    windowMs: 600_000,
  });
});

test("同じ利用者は、時間あたりの回数まで", () => {
  let t = Date.UTC(2026, 10, 6, 1);
  const l = new UsageLimiter({ dailyLimit: 100, perClientLimit: 2, windowMs: 60_000 }, () => t);
  expect(l.tryConsume("a").ok).toBe(true);
  expect(l.tryConsume("a").ok).toBe(true);
  expect(l.tryConsume("a")).toMatchObject({ ok: false, reason: "client" });
  expect(l.tryConsume("b").ok).toBe(true);
  t += 61_000;
  expect(l.tryConsume("a").ok).toBe(true);
});

test("全体の1日の上限。日付が変わると戻る", () => {
  let t = Date.UTC(2026, 10, 6, 1);
  const l = new UsageLimiter({ dailyLimit: 2, perClientLimit: 10, windowMs: 60_000 }, () => t);
  expect(l.tryConsume("a").ok).toBe(true);
  expect(l.tryConsume("b").ok).toBe(true);
  expect(l.tryConsume("c")).toMatchObject({ ok: false, reason: "daily" });
  t += 24 * 3_600_000;
  expect(l.tryConsume("c").ok).toBe(true);
});
