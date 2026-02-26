/**
 * index.ts
 *
 * Plugin bundle entry point.
 *
 * This file is compiled by ESBuild into content/index.js.
 * bootstrap.js loads that file via loadSubScript(), which places
 * everything into the `zoteroproxygui` namespace on the global object.
 *
 * Exports:
 *   zoteroproxygui.hooks        — lifecycle functions for bootstrap.js
 *   zoteroproxygui.preferencePane — used by preferences.xhtml
 */

import { hooks } from "./hooks";
import { PreferencePane } from "./modules/preferencePane";

// Expose to bootstrap.js and preferences.xhtml via the global namespace
(globalThis as unknown as Record<string, unknown>).zoteroproxygui = {
  hooks,
  preferencePane: PreferencePane,
};
