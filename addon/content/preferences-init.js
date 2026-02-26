/* preferences-init.js
 *
 * Loaded via Zotero.PreferencePanes.register({ scripts: [...] }).
 * Runs inside a Cu.Sandbox whose prototype is the preferences window.
 * index.js is loaded first (also via scripts[]), which sets
 * zoteroproxygui on this sandbox's globalThis.
 *
 * Zotero inserts the pane src as an HTML fragment into the preferences
 * document and then dispatches a non-bubbling 'load' event directly on
 * each top-level child of the pane container.  Since scripts run *before*
 * the fragment is inserted, we must wait for the element to appear.
 *
 * Race condition: MutationObserver callbacks run at microtask boundaries,
 * so if Zotero dispatches the 'load' event synchronously after insertion,
 * we may miss it. To handle this, we both:
 *   1. Attach a 'load' listener (in case the event hasn't fired yet), and
 *   2. Call init() directly from the observer callback as a fallback.
 * The `initialized` flag ensures init() is called exactly once.
 */
(function () {
  var initialized = false;

  function initPane() {
    if (!initialized) {
      initialized = true;
      zoteroproxygui.preferencePane.init(document);
    }
  }

  function onPaneShowing() {
    if (initialized) {
      zoteroproxygui.preferencePane.refresh();
    }
  }

  function attachListeners(root) {
    // Listen for 'load' in case it hasn't fired yet
    root.addEventListener("load", initPane);
    // Listen for 'showing' to refresh status when pane becomes visible again
    root.addEventListener("showing", onPaneShowing);
    // Also call initPane directly as fallback (may have missed 'load')
    // Use setTimeout(0) to ensure the DOM is fully settled
    setTimeout(initPane, 0);
  }

  var root = document.querySelector(".proxy-pane");
  if (root) {
    attachListeners(root);
  } else {
    var observer = new MutationObserver(function () {
      var el = document.querySelector(".proxy-pane");
      if (el) {
        observer.disconnect();
        attachListeners(el);
      }
    });
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
})();
