import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(import.meta.dirname),
  base: "/app/",
  build: {
    outDir: resolve(import.meta.dirname, "../public/app"),
    emptyOutDir: true,
  },
});
