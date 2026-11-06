import Anthropic from "@anthropic-ai/sdk";

/** 利用者に見せてよい文面を持つエラー */
export class UserFacingError extends Error {
  constructor(
    message: string,
    readonly userMessage: string,
  ) {
    super(message);
  }
}

const GENERIC = "うまく答えられませんでした。もう一度試すか、窓口に問い合わせてください。";

/** SDK のエラーを、利用者向けの文面に変える */
export function toUserFacingError(error: unknown, generic = GENERIC): UserFacingError {
  if (error instanceof UserFacingError) return error;
  if (error instanceof Anthropic.RateLimitError) {
    return new UserFacingError("rate limited", "いま混み合っています。少し待ってからもう一度試してください。");
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return new UserFacingError("authentication failed", "いまはAIの機能が使えません。");
  }
  if (error instanceof Anthropic.APIError) {
    return new UserFacingError(`API error ${error.status}`, generic);
  }
  return new UserFacingError(error instanceof Error ? error.message : String(error), generic);
}

/** 安全分類で別のモデルに切り替える設定（Claude API のサーバー側フォールバック） */
export function fallbackParams(): { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks: "default" } {
  return { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };
}
