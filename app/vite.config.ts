import tsconfigPaths from "vite-tsconfig-paths";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { defineConfig } from "vite";
import { EXTERNAL_DEPENDENCIES } from "@patchwork/sdk/shared-dependencies";

export default defineConfig({
  base: "./",
  plugins: [tsconfigPaths(), wasm(), topLevelAwait()],
  build: {
    rollupOptions: {
      input: {
        patchwork: "src/patchwork/index.ts",
        index: "index.html",
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "patchwork") {
            return "patchwork.js";
          }

          return "[name].[hash].js";
        },
      },
      preserveEntrySignatures: "strict",
    },
  },
});
