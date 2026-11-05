import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // relative asset paths, so the build works on any domain or sub-path
  base: "./",
  build: { outDir: "dist" },
  test: { include: ["src/**/*.test.ts"] },
});
