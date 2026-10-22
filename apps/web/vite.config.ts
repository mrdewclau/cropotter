import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL("./", import.meta.url)),
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 4174,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:8080" },
  },
  build: {
    outDir: "dist/client",
    target: ["es2020", "safari16"],
    sourcemap: false,
    chunkSizeWarningLimit: 1800,
  },
});
