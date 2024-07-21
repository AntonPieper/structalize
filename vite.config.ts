import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// @ts-expect-error
import { resolve } from "path";
declare function resolve(...paths: string[]): string;
declare const __dirname: string;

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "structix",
      formats: ["es", "cjs", "umd", "system", "iife"],
    },
    rollupOptions: {
      output: {
        exports: "named",
      },
    },
  },
  plugins: [dts()],
});
