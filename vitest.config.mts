import { defineConfig } from "vitest/config";
import path from "node:path";

const root = import.meta.dirname;

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: { "@": path.resolve(root, "src"), "server-only": path.resolve(root, "tests/helpers/server-only.ts") },
  },
});
