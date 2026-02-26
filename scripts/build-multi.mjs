#!/usr/bin/env node
/**
 * scripts/build-multi.mjs
 *
 * Builds both Zotero 7 and Zotero 8 versions of the plugin.
 *
 * For each target:
 *   1. Sync version + write addon/manifest.json from the target template
 *   2. Run `zotero-plugin build` with ZOTERO_TARGET=v{N}
 *      → produces build/v{N}/zotero-proxy-gui-v{N}.xpi
 *   3. Copy the XPI to build/ for easy access
 *
 * Usage:
 *   node scripts/build-multi.mjs          # build both v7 and v8
 *   node scripts/build-multi.mjs v7       # build only v7
 *   node scripts/build-multi.mjs v8       # build only v8
 */

import { execSync } from "child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const TARGETS = ["v7", "v8"];
const requested = process.argv[2];
const targets = requested ? [requested] : TARGETS;

// Validate
for (const t of targets) {
  if (!TARGETS.includes(t)) {
    console.error(`Unknown target "${t}". Valid targets: ${TARGETS.join(", ")}`);
    process.exit(1);
  }
}

// Read package.json for the version
const pkgPath = join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

console.log(`\nBuilding zotero-proxy-gui v${pkg.version} for: ${targets.join(", ")}\n`);

const manifestDst = join(root, "addon", "manifest.json");

for (const target of targets) {
  const manifestSrc = join(root, "addon", `manifest-${target}.json`);

  if (!existsSync(manifestSrc)) {
    console.error(`Missing manifest template: addon/manifest-${target}.json`);
    process.exit(1);
  }

  // Sync version from package.json into the manifest template
  const manifest = JSON.parse(readFileSync(manifestSrc, "utf8"));
  manifest.version = pkg.version;
  const versionLabel = target === "v7" ? "Zotero 7" : "Zotero 8";
  manifest.description = `Visual proxy management for ${versionLabel} with multi-config presets and one-click switching`;

  const { strict_min_version, strict_max_version } = manifest.applications.zotero;
  console.log(`[${target.toUpperCase()}] manifest: ${strict_min_version} → ${strict_max_version}`);

  writeFileSync(manifestDst, JSON.stringify(manifest, null, 2) + "\n");

  try {
    execSync("npx zotero-plugin build", {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "production",
        ZOTERO_TARGET: target,
      },
    });
  } catch (err) {
    console.error(`[${target.toUpperCase()}] Build failed`);
    process.exit(1);
  }

  // Copy the XPI from the target-specific dist into the repo root build/ dir
  const srcXpi = join(root, "build", target, `zotero-proxy-gui-${target}.xpi`);
  const dstXpi = join(root, "build", `zotero-proxy-gui-${target}.xpi`);
  if (existsSync(srcXpi)) {
    copyFileSync(srcXpi, dstXpi);
    console.log(`[${target.toUpperCase()}] → build/zotero-proxy-gui-${target}.xpi\n`);
  } else {
    console.error(`[${target.toUpperCase()}] Expected XPI not found: ${srcXpi}`);
    process.exit(1);
  }
}

// Restore manifest.json to the v7 defaults (so `git diff` is clean)
const defaultSrc = join(root, "addon", "manifest-v7.json");
const defaultManifest = JSON.parse(readFileSync(defaultSrc, "utf8"));
defaultManifest.version = pkg.version;
defaultManifest.description = "Visual proxy management for Zotero 7/8 with multi-config presets and one-click switching";
writeFileSync(manifestDst, JSON.stringify(defaultManifest, null, 2) + "\n");

console.log("All builds complete.");
console.log("Artifacts:");
for (const target of targets) {
  console.log(`  build/zotero-proxy-gui-${target}.xpi`);
}
