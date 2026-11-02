import { serve } from "bun";
import index from "./index.html";

const server = serve({
  routes: {
    // 画面はすべて index.html から表示する
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at ${server.url}`);
