#!/usr/bin/env node
/**
 * scripts/sync-manifest-version.mjs
 *
 * Reads the version from package.json and writes it into the three manifest
 * template files so they stay in sync after a version bump.
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = pkg.version;

const manifests = [
  "addon/manifest.json",
  "addon/manifest-v7.json",
  "addon/manifest-v8.json",
];

for (const rel of manifests) {
  const filePath = join(root, rel);
  const manifest = JSON.parse(readFileSync(filePath, "utf8"));
  manifest.version = version;
  writeFileSync(filePath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Synced version in ${rel} → ${version}`);
}
