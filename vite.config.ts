import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { searchSuggestionsPlugin } from "./server/searchSuggestions";
import { bingSerpPlugin } from "./server/bingSerp";
import { msnFeedPlugin } from "./server/msnFeed";
import { searchDiscoveryPlugin } from "./server/searchDiscovery";

export default defineConfig(({ mode }) => ({
  server: { host: "127.0.0.1", port: 5174, strictPort: true },
  base: mode === "production" ? "./" : "/",
  plugins: [react(), searchSuggestionsPlugin(), bingSerpPlugin(), msnFeedPlugin(), searchDiscoveryPlugin()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    dedupe: ["react", "react-dom"],
  },
}));
