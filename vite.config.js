import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Two deploy targets share one build:
//   - GitHub Pages project site  -> base "/gadgetwise-react/", output docs/
//   - Vercel (site at domain root) -> base "/", output dist/
// VERCEL=1 is set automatically by Vercel at build time, so no config duplication.
const onVercel = !!process.env.VERCEL;

export default defineConfig({
  base: onVercel ? "/" : "/gadgetwise-react/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: onVercel ? "dist" : "docs",
    emptyOutDir: true,
  },
});
