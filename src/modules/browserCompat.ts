/**
 * browserCompat.ts
 *
 * Compatibility shims for Zotero windows backed by newer Firefox platform
 * builds.
 */

type BrowserLike = {
  getTabForBrowser?: (browser: unknown) => unknown;
};

type WindowWithGBrowser = Window & {
  gBrowser?: BrowserLike;
};

/**
 * Firefox's <browser> custom element calls ownerGlobal.gBrowser.getTabForBrowser()
 * during pagehide when a window exposes gBrowser. Some Zotero windows expose a
 * partial gBrowser object without that browser-tab API, which causes harmless
 * but noisy TypeErrors on Zotero 8/9.
 */
export function installBrowserTabShim(win: Window | null | undefined): void {
  const gBrowser = (win as WindowWithGBrowser | null | undefined)?.gBrowser;
  if (!gBrowser || typeof gBrowser.getTabForBrowser === "function") {
    return;
  }

  Object.defineProperty(gBrowser, "getTabForBrowser", {
    configurable: true,
    writable: true,
    value: () => null,
  });
}
