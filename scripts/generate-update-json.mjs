#!/usr/bin/env node
/**
 * scripts/generate-update-json.mjs
 *
 * Generates / updates update.json and update-beta.json in the repository root.
 *
 * Both files follow the Zotero / Firefox extension update manifest format:
 *   https://extensionworkshop.com/documentation/manage/updating-your-extension/
 *
 * update.json      – stable releases only  (no pre-release tag in version)
 * update-beta.json – all releases (stable + pre-release)
 *
 * Each call to this script APPENDS a new entry for the current package.json
 * version.  Existing entries for the same version are replaced so the script
 * is idempotent.  Entries for both Zotero 7 (v7) and Zotero 8 (v8) are
 * added to every run.
 *
 * Usage:
 *   node scripts/generate-update-json.mjs
 *
 * Environment variables (optional):
 *   ZOTERO_PLUGIN_UPDATE_HASH  – if set, added as "update_hash" on each entry
 *                                 (sha256: prefix required by Firefox/Zotero)
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// ---------------------------------------------------------------------------
// Read package.json
// ---------------------------------------------------------------------------
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = pkg.version;
const repoUrl = "https://github.com/royenheart/zotero-proxy-gui";
const addonId = "zotero-proxy-gui@royenheart";

// A version is considered a pre-release if it contains a hyphen (e.g. 1.0.0-beta.1)
const isPreRelease = version.includes("-");

console.log(`Generating update manifests for v${version} (pre-release: ${isPreRelease})`);

// ---------------------------------------------------------------------------
// Build the two update entries (one per Zotero target)
// ---------------------------------------------------------------------------
const targets = [
  {
    target: "v7",
    strict_min_version: "6.999",
    strict_max_version: "7.0.*",
  },
  {
    target: "v8",
    strict_min_version: "7.999",
    strict_max_version: "8.*",
  },
];

/**
 * Build one update-manifest entry for a given target.
 * @param {{ target: string, strict_min_version: string, strict_max_version: string }} t
 * @returns {object}
 */
function buildEntry(t) {
  const xpiName = `zotero-proxy-gui-${t.target}.xpi`;
  const entry = {
    version,
    update_link: `${repoUrl}/releases/download/v${version}/${xpiName}`,
    applications: {
      zotero: {
        strict_min_version: t.strict_min_version,
        strict_max_version: t.strict_max_version,
      },
    },
  };

  const hash = process.env.ZOTERO_PLUGIN_UPDATE_HASH;
  if (hash) {
    entry.update_hash = hash;
  }

  return entry;
}

const newEntries = targets.map(buildEntry);

// ---------------------------------------------------------------------------
// Read-or-initialise an update manifest file
// ---------------------------------------------------------------------------
function loadManifest(filePath) {
  if (existsSync(filePath)) {
    try {
      return JSON.parse(readFileSync(filePath, "utf8"));
    } catch {
      console.warn(`Warning: could not parse ${filePath}, re-initialising.`);
    }
  }
  return { addons: { [addonId]: { updates: [] } } };
}

// ---------------------------------------------------------------------------
// Upsert entries: remove any existing entries for the same version, then push
// ---------------------------------------------------------------------------
function upsertEntries(manifest, entries) {
  const updates = manifest.addons[addonId]?.updates ?? [];
  // Remove stale entries for the same version (idempotent re-runs)
  const filtered = updates.filter((e) => e.version !== version);
  filtered.push(...entries);
  if (!manifest.addons[addonId]) {
    manifest.addons[addonId] = {};
  }
  manifest.addons[addonId].updates = filtered;
  return manifest;
}

// ---------------------------------------------------------------------------
// Write update-beta.json  (all releases)
// ---------------------------------------------------------------------------
const betaPath = join(root, "update-beta.json");
const betaManifest = upsertEntries(loadManifest(betaPath), newEntries);
writeFileSync(betaPath, JSON.stringify(betaManifest, null, 2) + "\n");
console.log(`Written: update-beta.json  (${betaManifest.addons[addonId].updates.length} entries)`);

// ---------------------------------------------------------------------------
// Write update.json  (stable releases only)
// ---------------------------------------------------------------------------
const stablePath = join(root, "update.json");
const stableManifest = loadManifest(stablePath);

if (!isPreRelease) {
  upsertEntries(stableManifest, newEntries);
  console.log(`Written: update.json  (${stableManifest.addons[addonId].updates.length} entries)`);
} else {
  // Pre-release: keep update.json unchanged so stable users are unaffected
  console.log(`Skipped: update.json  (pre-release version, stable users unaffected)`);
}

writeFileSync(stablePath, JSON.stringify(stableManifest, null, 2) + "\n");
