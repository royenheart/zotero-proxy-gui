/* Bootstrap entry point for zotero-proxy-gui
 * This file is loaded by Zotero. It delegates to the compiled TypeScript
 * bundle (content/index.js) which exports the real lifecycle hooks.
 */

var chromeHandle;

function startup({ id, version, rootURI }, reason) {
  if (typeof Zotero === "undefined") {
    var { Zotero } = ChromeUtils.importESModule("chrome://zotero/content/zotero.mjs");
  }

  // Load the compiled plugin bundle
  Services.scriptloader.loadSubScript(rootURI + "content/index.js", { Zotero, rootURI });

  // Delegate to the exported startup function
  zoteroproxygui.hooks.onStartup({ id, version, rootURI }, reason);
}

function shutdown({ id, version, rootURI }, reason) {
  if (reason === APP_SHUTDOWN) return;

  zoteroproxygui.hooks.onShutdown({ id, version, rootURI }, reason);

  // Clean up chrome handle
  if (chromeHandle) {
    chromeHandle.destruct();
    chromeHandle = undefined;
  }

  // Cu.unload() was removed in newer Firefox/Zotero 8; loadSubScript does not
  // use the Cu module cache, so no explicit unload is needed.
}

function install(data, reason) {
  // Nothing to do on install
}

function uninstall(data, reason) {
  // Nothing to do on uninstall
}

function onMainWindowLoad({ window }) {
  zoteroproxygui.hooks.onMainWindowLoad({ window });
}

function onMainWindowUnload({ window }) {
  zoteroproxygui.hooks.onMainWindowUnload({ window });
}
