/**
 * addon.ts
 *
 * Root singleton class for zotero-proxy-gui.
 * Holds references to all sub-modules and exposes them to hooks.ts.
 */

import { PreferencePane } from "./modules/preferencePane";
import { Toolbar } from "./modules/toolbar";

class Addon {
  readonly id = "zotero-proxy-gui@royenheart";
  readonly namespace = "zoteroproxygui";

  /** Initialised in startup() */
  rootURI!: string;

  /** Sub-module references */
  readonly preferencePane = PreferencePane;
  readonly toolbar = Toolbar;
}

export default new Addon();
