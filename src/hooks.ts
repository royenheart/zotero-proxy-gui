/**
 * hooks.ts
 *
 * Lifecycle hooks called from bootstrap.js.
 * Wires up sub-modules at the appropriate lifecycle stage.
 */

import addon from "./addon";

export const hooks = {
  onStartup(
    { id, version, rootURI }: { id: string; version: string; rootURI: string },
    _reason: number,
  ): void {
    addon.rootURI = rootURI;

    // Wait for Zotero to be fully initialised before doing anything
    Zotero.initializationPromise.then(() => {
      // Register our preference pane.
      // The `scripts` array is evaluated by Zotero inside the pane's window
      // after the document is ready — this is the correct way to init a pane
      // in Zotero 7/8 instead of relying on DOMContentLoaded inside the XHTML.
      // The pane src is loaded as a raw HTML fragment (not a full document),
      // so any <script> tags inside preferences.xhtml are ignored by Zotero.
      // The `scripts` array is the correct way to load code for a pane.
      // Scripts run inside a Cu.Sandbox whose prototype is the preferences
      // window, giving them access to window globals like Zotero and Services.
      // We load index.js first (makes zoteroproxygui available in the sandbox),
      // then preferences-init.js calls zoteroproxygui.preferencePane.init().
      Zotero.PreferencePanes.register({
        pluginID: addon.id,
        src: rootURI + "content/preferences.xhtml",
        scripts: [
          rootURI + "content/index.js",
          rootURI + "content/preferences-init.js",
        ],
        stylesheets: [rootURI + "content/preferences.css"],
        label: "Proxy GUI",
        image: `${rootURI}content/icons/favicon.png`,
      });

      Zotero.log(`[zotero-proxy-gui] v${version} started (${rootURI})`);
    });
  },

  onShutdown(
    { rootURI }: { id: string; version: string; rootURI: string },
    _reason: number,
  ): void {
    // Remove toolbar buttons from all windows
    addon.toolbar.removeAll();

    Zotero.log("[zotero-proxy-gui] Shutdown complete");
  },

  onMainWindowLoad({ window }: { window: Window }): void {
    // Wait for Zotero ready, then inject toolbar button
    Zotero.initializationPromise.then(() => {
      addon.toolbar.inject(window, addon.rootURI);
    });
  },

  onMainWindowUnload({ window }: { window: Window }): void {
    addon.toolbar.remove(window);
  },
};
