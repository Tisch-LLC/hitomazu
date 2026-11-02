/**
 * サーバー側の設定。値は環境変数（Bun が自動で読み込む .env を含む）から取る。
 * APIキーはサーバーの中だけで使い、画面やログには出さない。
 */

export const DEFAULT_CLAUDE_MODEL = "claude-opus-5-5";

export interface ClaudeConfig {
  apiKey: string | null;
  model: string;
}

type Env = Record<string, string | undefined>;

export function readClaudeConfig(env: Env = process.env): ClaudeConfig {
  const apiKey = env.ANTHROPIC_API_KEY?.trim() || null;
  const model = env.CLAUDE_MODEL?.trim() || DEFAULT_CLAUDE_MODEL;
  return { apiKey, model };
}

/** 画面に返してよい情報だけ（キーそのものは含めない） */
export function publicClaudeStatus(config: ClaudeConfig): { configured: boolean; model: string } {
  return { configured: config.apiKey !== null, model: config.model };
}
