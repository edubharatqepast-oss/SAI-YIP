import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    target: "es2020",
    minify: "esbuild",
    cssMinify: true,
    chunkSizeWarningLimit: 30,
    rollupOptions: { output: { manualChunks: undefined, inlineDynamicImports: false } }
  },
  server: { port: 5173 }
});
