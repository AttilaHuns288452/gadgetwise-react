import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Static site on GitHub Pages (project site): base = repo name, build straight
// into docs/ so Pages can serve "Deploy from a branch" with no Actions.
export default defineConfig({
  base: "/gadgetwise-react/",
  plugins: [react(), tailwindcss()],
  build: { outDir: "docs", emptyOutDir: true },
});
