import { defineConfig } from "zotero-plugin-scaffold";
import pkg from "./package.json";

export default defineConfig({
  source: ["src", "addon"],
  entry: "src/index.ts",
  dist: "build",
  name: pkg.name,
  id: "zotero-proxy-gui@royenheart",
  namespace: "zotero-proxy-gui",
  build: {
    esbuildOptions: [
      {
        entryPoints: ["src/index.ts"],
        define: {
          __env__: `"${process.env.NODE_ENV}"`,
        },
        bundle: true,
        target: "firefox115",
        outfile: "build/addon/content/index.js",
      },
    ],
    makeManifest: {
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
