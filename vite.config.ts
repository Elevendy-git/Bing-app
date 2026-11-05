import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { searchSuggestionsPlugin } from "./server/searchSuggestions";
import { bingSerpPlugin } from "./server/bingSerp";
import { webPagePlugin } from "./server/webPage";
import { msnFeedPlugin } from "./server/msnFeed";
import { rewardsPlugin } from "./server/rewards";

export default defineConfig(({ mode }) => ({
  server: { host: "127.0.0.1", port: 5174, strictPort: true,
    fs: { deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/.local/**"] } },
  base: mode === "production" ? "./" : "/",
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        redirect: fileURLToPath(new URL("./redirect.html", import.meta.url)),
      },
    },
  },
  plugins: [react(), searchSuggestionsPlugin(), bingSerpPlugin(), webPagePlugin(), msnFeedPlugin(), rewardsPlugin()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    dedupe: ["react", "react-dom"],
  },
}));
