import { serve } from "bun";
import { todayISO } from "./domain/dates";
import index from "./index.html";
import { publicClaudeStatus, readClaudeConfig } from "./server/config";
import { MAX_TEXT_LENGTH, UnderstandError, understandSituation } from "./server/understand";

const claude = readClaudeConfig();

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
      async POST(req) {
        let text: unknown;
        try {
          ({ text } = (await req.json()) as { text?: unknown });
        } catch {
          return Response.json({ error: "送られた内容を読み取れませんでした。" }, { status: 400 });
        }
        if (typeof text !== "string" || text.trim() === "") {
          return Response.json({ error: "文章を入力してください。" }, { status: 400 });
        }
        if (text.length > MAX_TEXT_LENGTH) {
          return Response.json({ error: `文章は${MAX_TEXT_LENGTH}文字までにしてください。` }, { status: 400 });
        }
        try {
          const result = await understandSituation(text.trim(), todayISO(), claude);
          return Response.json(result);
        } catch (error) {
          if (error instanceof UnderstandError) {
            console.error("understand:", error.message);
            return Response.json({ error: error.userMessage }, { status: 502 });
          }
          console.error("understand: unexpected error", error);
          return Response.json({ error: "うまく読み取れませんでした。質問に答えて進んでください。" }, { status: 500 });
        }
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
