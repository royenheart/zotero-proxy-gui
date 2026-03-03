import { defineConfig } from "zotero-plugin-scaffold";
import pkg from "./package.json";

/**
 * ZOTERO_TARGET controls which Zotero version we build for:
 *   "v7"  →  Firefox 115 baseline, strict_max_version "7.0.*"
 *   "v8"  →  Firefox 128 baseline, strict_max_version "8.*"
 *   unset →  defaults to "v7"
 *
 * Each target gets its own dist directory so builds don't overwrite each other:
 *   build/v7/ and build/v8/
 */
const target = (process.env.ZOTERO_TARGET ?? "v7") as "v7" | "v8";

/** ESBuild JS target per Zotero version (Firefox platform version) */
const esbuildTarget: Record<"v7" | "v8", string> = {
  v7: "firefox115", // Zotero 7 ships Firefox 115
  v8: "firefox128", // Zotero 8 ships Firefox 128+
};

/** Each target builds into its own subdirectory */
const dist = `build/${target}`;

/** XPI name includes the target suffix */
const xpiName = `${pkg.name}-${target}`;

export default defineConfig({
  release: {
    bumpp: {
      execute: "node scripts/generate-update-json.mjs && node scripts/sync-manifest-version.mjs",
    },
  },
  source: ["src", "addon"],
  entry: "src/index.ts",
  dist,
  name: pkg.name,
  id: "zotero-proxy-gui@royenheart",
  namespace: "zotero-proxy-gui",
  xpiName,
  build: {
    esbuildOptions: [
      {
        entryPoints: ["src/index.ts"],
        define: {
          __env__: `"${process.env.NODE_ENV}"`,
          __zotero_target__: `"${target}"`,
        },
        bundle: true,
        target: esbuildTarget[target],
        outfile: `${dist}/addon/content/index.js`,
      },
    ],
    makeManifest: {
      // We manage manifest copying ourselves in scripts/build-multi.mjs
      enable: false,
    },
    fluent: {
      enable: true,
      prefixFluentMessages: false,
    },
  },
  server: {
    asProxy: true,
  },
});
