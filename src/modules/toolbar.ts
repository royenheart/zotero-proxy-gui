/**
 * toolbar.ts
 *
 * Injects a toolbar button into Zotero's main window.
 * The button shows the current proxy status and opens a popup menu
 * listing all saved configurations for one-click switching.
 */

import { ConfigStore } from "./configStore";
import { ProxyManager } from "./proxyManager";

const BUTTON_ID = "zotero-proxy-gui-toolbar-button";
const POPUP_ID = "zotero-proxy-gui-popup";

/** Track injected elements so we can clean them up on shutdown */
const _injected: Map<Window, Element[]> = new Map();

// ── Build the toolbar button element ───────────────────────────────────────

function buildButton(doc: Document, rootURI: string): XUL.Element {
  const btn = doc.createXULElement("toolbarbutton");
  btn.id = BUTTON_ID;
  btn.setAttribute("type", "menu");
  btn.setAttribute("class", "zotero-tb-button");
  btn.setAttribute("tooltiptext", "Proxy GUI");
  btn.setAttribute("image", rootURI + "content/icons/toolbar.svg");
  btn.setAttribute(
    "style",
    "list-style-image: url('" + rootURI + "content/icons/toolbar.svg');",
  );

  const popup = buildPopup(doc, rootURI);
  btn.appendChild(popup);

  return btn;
}

// ── Build the dropdown popup ───────────────────────────────────────────────

function buildPopup(doc: Document, rootURI: string): XUL.Element {
  const popup = doc.createXULElement("menupopup");
  popup.id = POPUP_ID;

  popup.addEventListener("popupshowing", () => {
    refreshPopup(doc, popup, rootURI);
  });

  return popup;
}

function refreshPopup(
  doc: Document,
  popup: XUL.Element,
  rootURI: string,
): void {
  // Clear all existing items
  while (popup.firstChild) {
    popup.removeChild(popup.firstChild);
  }

  const activeId = ConfigStore.getActiveId();
  const configs = ConfigStore.getAll();

  // "Disable proxy" item at top
  const disableItem = doc.createXULElement("menuitem");
  disableItem.setAttribute("data-l10n-id", "proxy-menu-disable");
  disableItem.setAttribute("label", "Disable Proxy");
  if (!activeId) {
    disableItem.setAttribute("checked", "true");
    disableItem.setAttribute("type", "radio");
  }
  disableItem.addEventListener("command", () => {
    ProxyManager.deactivate();
    updateButtonLabel(doc, rootURI);
  });
  popup.appendChild(disableItem);

  if (configs.length > 0) {
    const sep = doc.createXULElement("menuseparator");
    popup.appendChild(sep);

    for (const cfg of configs) {
      const item = doc.createXULElement("menuitem");
      item.setAttribute("type", "radio");
      item.setAttribute(
        "label",
        `${cfg.name} — ${cfg.type === "http" ? "HTTP" : "SOCKS5"} ${cfg.host}:${cfg.port}`,
      );
      if (cfg.id === activeId) {
        item.setAttribute("checked", "true");
      }
      item.addEventListener("command", () => {
        ProxyManager.activate(cfg.id);
        updateButtonLabel(doc, rootURI);
      });
      popup.appendChild(item);
    }
  }

  // Separator + open preferences link
  const sep2 = doc.createXULElement("menuseparator");
  popup.appendChild(sep2);

  const prefsItem = doc.createXULElement("menuitem");
  prefsItem.setAttribute("data-l10n-id", "proxy-menu-open-prefs");
  prefsItem.setAttribute("label", "Proxy Settings…");
  prefsItem.addEventListener("command", () => {
    const mainWin = Zotero.getMainWindow() as Window;
    (mainWin as Window & { Zotero_Preferences: { openPreferences(id?: string): void } })
      .Zotero_Preferences?.openPreferences("zotero-proxy-gui@royenheart");
  });
  popup.appendChild(prefsItem);
}

function updateButtonLabel(doc: Document, rootURI: string): void {
  const btn = doc.getElementById(BUTTON_ID);
  if (!btn) return;
  const status = ProxyManager.getStatus();
  btn.setAttribute(
    "tooltiptext",
    status.active ? `Proxy: ${status.label}` : "Proxy: Disabled",
  );
}

// ── Inject / remove per window ─────────────────────────────────────────────

export const Toolbar = {
  /** Called from onMainWindowLoad — add button to a window */
  inject(win: Window, rootURI: string): void {
    const doc = win.document;

    // Don't inject twice
    if (doc.getElementById(BUTTON_ID)) return;

    const btn = buildButton(doc, rootURI);

    // Append to the nav-bar palette so users can add it via toolbar
    // customisation.  Also try to place it in the toolbar directly.
    const palette = doc.getElementById("navigator-toolbox")
      ?.querySelector("toolbarpalette");

    if (palette) {
      palette.appendChild(btn.cloneNode(true));
    }

    // Try to insert next to existing Zotero toolbar buttons
    const zoteroToolbar =
      doc.getElementById("zotero-toolbar") ??
      doc.getElementById("nav-bar") ??
      doc.getElementById("toolbar-menubar");

    let inserted: Element | null = null;
    if (zoteroToolbar) {
      // Clone btn for actual insertion (the palette copy is for drag)
      const liveBtn = buildButton(doc, rootURI);
      zoteroToolbar.appendChild(liveBtn);
      inserted = liveBtn;
    }

    // Track what we added for cleanup
    const added: Element[] = [];
    if (inserted) added.push(inserted);
    _injected.set(win, added);

    updateButtonLabel(doc, rootURI);
  },

  /** Called from onMainWindowUnload — remove injected elements */
  remove(win: Window): void {
    const elements = _injected.get(win);
    if (elements) {
      elements.forEach((el) => el.parentNode?.removeChild(el));
      _injected.delete(win);
    }
  },

  /** Remove from all tracked windows (shutdown) */
  removeAll(): void {
    for (const [win] of _injected) {
      this.remove(win);
    }
  },
};
