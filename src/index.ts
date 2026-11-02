import { serve } from "bun";
import index from "./index.html";
import { publicClaudeStatus, readClaudeConfig } from "./server/config";

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
