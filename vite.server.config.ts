import { defineConfig } from "vite";

export default defineConfig({
  build: {
    ssr: "server/production.ts",
    target: "node24",
    outDir: "dist-server",
    emptyOutDir: true,
    sourcemap: false,
    minify: false,
  },
});
