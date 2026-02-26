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
      // Register our preference pane
      Zotero.PreferencePanes.register({
        pluginID: addon.id,
        src: rootURI + "content/preferences.xhtml",
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
