import { expect, test } from "bun:test";
import { DEFAULT_CLAUDE_MODEL, publicClaudeStatus, readClaudeConfig } from "./config";

test("APIキーとモデルを環境変数から読む", () => {
  const c = readClaudeConfig({ ANTHROPIC_API_KEY: " sk-test ", CLAUDE_MODEL: "claude-sonnet-5-5" });
  expect(c).toEqual({ apiKey: "sk-test", model: "claude-sonnet-5-5" });
});

test("未設定なら、キーは null、モデルは既定値", () => {
  expect(readClaudeConfig({})).toEqual({ apiKey: null, model: DEFAULT_CLAUDE_MODEL });
  expect(readClaudeConfig({ ANTHROPIC_API_KEY: "", CLAUDE_MODEL: "  " })).toEqual({
    apiKey: null,
    model: DEFAULT_CLAUDE_MODEL,
  });
});

test("画面に返す情報にキーを含めない", () => {
  const status = publicClaudeStatus({ apiKey: "sk-secret", model: "m" });
  expect(status).toEqual({ configured: true, model: "m" });
  expect(JSON.stringify(status)).not.toContain("sk-secret");
});
