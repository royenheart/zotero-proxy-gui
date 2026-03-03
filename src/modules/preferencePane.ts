/**
 * preferencePane.ts
 *
 * Registers the Zotero preference pane and drives the preferences.xhtml UI.
 * All DOM manipulation lives here; no inline scripts in the XHTML.
 */

import { ConfigStore, type ProxyConfig } from "./configStore";
import { ProxyManager } from "./proxyManager";

/** The id of the config currently selected in the list (not necessarily active) */
let _selectedId: string | null = null;
let _editingId: string | null = null;
let _doc: Document | null = null;

// ── Helpers ────────────────────────────────────────────────────────────────

function $(id: string): HTMLElement {
  return (_doc as Document).getElementById(id) as HTMLElement;
}

function input(id: string): HTMLInputElement {
  return (_doc as Document).getElementById(id) as HTMLInputElement;
}

function select(id: string): HTMLSelectElement {
  return (_doc as Document).getElementById(id) as HTMLSelectElement;
}

const XHTML_NS = "http://www.w3.org/1999/xhtml";

function htmlEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
): HTMLElementTagNameMap[K] {
  return (_doc as Document).createElementNS(XHTML_NS, tag) as HTMLElementTagNameMap[K];
}

function typeLabel(type: ProxyConfig["type"]): string {
  return type === "http" ? "HTTP" : type === "socks5" ? "SOCKS5" : "None";
}

// ── Status bar ─────────────────────────────────────────────────────────────

function updateStatus(): void {
  const status = ProxyManager.getStatus();
  const dot = $("status-dot");
  const label = $("status-label");

  dot.classList.toggle("active", status.active);

  const liveType = Zotero.Prefs.get("network.proxy.type", true) as number;

  // Use Fluent if available, else fall back to JS label
  label.removeAttribute("data-l10n-id");
  if (liveType === 5) {
    label.textContent = status.label;
  } else {
    label.textContent = status.active
      ? `${status.config?.name ?? ""} — ${status.label}`
      : status.label;
  }
}

// ── Config list ────────────────────────────────────────────────────────────

function renderList(): void {
  const list = $("config-list");
  const empty = $("config-empty");
  const configs = ConfigStore.getAll();
  const activeId = ConfigStore.getActiveId();

  // Remove old items (keep the empty placeholder)
  Array.from(list.querySelectorAll(".config-item")).forEach((el) => el.remove());

  if (configs.length === 0) {
    empty.style.display = "";
    updateButtons(null);
    return;
  }

  empty.style.display = "none";

  for (const cfg of configs) {
    const item = htmlEl("div");
    item.className = "config-item";
    if (cfg.id === activeId) item.classList.add("active-config");
    if (cfg.id === _selectedId) item.classList.add("selected-config");

    const name = htmlEl("span");
    name.className = "config-item-name";
    name.textContent = cfg.name;

    const meta = htmlEl("span");
    meta.className = "config-item-meta";
    meta.textContent =
      cfg.type === "none"
        ? "No proxy"
        : `${typeLabel(cfg.type)} ${cfg.host}:${cfg.port}`;

    const activeTag = htmlEl("span");
    if (cfg.id === activeId) {
      activeTag.style.cssText =
        "font-size:0.75em;background:#2ecc71;color:#fff;padding:1px 6px;border-radius:10px;";
      activeTag.textContent = "Active";
    }

    item.appendChild(name);
    item.appendChild(meta);
    if (cfg.id === activeId) item.appendChild(activeTag);

    item.addEventListener("click", () => {
      _selectedId = cfg.id;
      renderList();
    });

    list.appendChild(item);
  }

  updateButtons(_selectedId);
}

function updateButtons(selectedId: string | null): void {
  const hasSelection = selectedId !== null;
  const activeId = ConfigStore.getActiveId();
  const isActive = selectedId === activeId;

  (($("btn-edit")) as HTMLButtonElement).disabled = !hasSelection;
  (($("btn-delete")) as HTMLButtonElement).disabled = !hasSelection;
  (($("btn-activate")) as HTMLButtonElement).disabled = !hasSelection || isActive;
}

// ── Dialog ─────────────────────────────────────────────────────────────────

function openDialog(editId: string | null = null): void {
  _editingId = editId;

  const title = $("dialog-title");
  title.setAttribute(
    "data-l10n-id",
    editId ? "proxy-dialog-edit-title" : "proxy-dialog-add-title",
  );

  // Reset error
  const errEl = $("dialog-error");
  errEl.classList.remove("visible");
  errEl.textContent = "";

  if (editId) {
    const cfg = ConfigStore.getAll().find((c) => c.id === editId);
    if (cfg) {
      input("field-name").value = cfg.name;
      select("field-type").value = cfg.type === "none" ? "http" : cfg.type;
      input("field-host").value = cfg.host;
      input("field-port").value = String(cfg.port);
      input("field-ssl-host").value = cfg.sslHost ?? "";
      input("field-ssl-port").value = cfg.sslPort ? String(cfg.sslPort) : "";
      input("field-remote-dns").checked = cfg.remoteDns !== false;
    }
  } else {
    input("field-name").value = "";
    select("field-type").value = "http";
    input("field-host").value = "";
    input("field-port").value = "";
    input("field-ssl-host").value = "";
    input("field-ssl-port").value = "";
    input("field-remote-dns").checked = true;
  }

  onTypeChange();
  $("dialog-backdrop").classList.add("open");
  input("field-name").focus();
}

function closeDialog(): void {
  $("dialog-backdrop").classList.remove("open");
  _editingId = null;
}

function onTypeChange(): void {
  const type = select("field-type").value;
  $("ssl-section").classList.toggle("visible", type === "http");
  $("socks-section").classList.toggle("visible", type === "socks5");
}

function saveDialog(): void {
  const errEl = $("dialog-error");
  errEl.classList.remove("visible");

  const name = input("field-name").value.trim();
  const type = select("field-type").value as "http" | "socks5";
  const host = input("field-host").value.trim();
  const portRaw = input("field-port").value.trim();
  const port = parseInt(portRaw, 10);

  // Validation
  if (!name) {
    errEl.textContent = "Name is required.";
    errEl.classList.add("visible");
    return;
  }
  if (!host) {
    errEl.textContent = "Host is required.";
    errEl.classList.add("visible");
    return;
  }
  if (!portRaw || isNaN(port) || port < 1 || port > 65535) {
    errEl.textContent = "Port must be a number between 1 and 65535.";
    errEl.classList.add("visible");
    return;
  }

  const partial: Omit<ProxyConfig, "id"> = { name, type, host, port };

  if (type === "http") {
    const sslHost = input("field-ssl-host").value.trim();
    const sslPortRaw = input("field-ssl-port").value.trim();
    if (sslHost) partial.sslHost = sslHost;
    if (sslPortRaw) partial.sslPort = parseInt(sslPortRaw, 10);
  } else if (type === "socks5") {
    partial.remoteDns = input("field-remote-dns").checked;
  }

  if (_editingId) {
    ConfigStore.update(_editingId, partial);
    // If this was the active config, re-apply changes
    if (ConfigStore.getActiveId() === _editingId) {
      const updated = ConfigStore.getAll().find((c) => c.id === _editingId);
      if (updated) ProxyManager.apply(updated);
    }
  } else {
    ConfigStore.add(partial);
  }

  closeDialog();
  renderList();
  updateStatus();
}

// ── Public API ─────────────────────────────────────────────────────────────

export const PreferencePane = {
  /**
   * Called once when the pane fragment is first inserted into the document.
   * Wires up all event listeners and renders the initial state.
   */
  init(doc: Document): void {
    _doc = doc;

    renderList();
    updateStatus();

    // Buttons
    $("btn-add").addEventListener("click", () => openDialog(null));
    $("btn-edit").addEventListener("click", () => {
      if (_selectedId) openDialog(_selectedId);
    });
    $("btn-delete").addEventListener("click", () => {
      if (!_selectedId) return;
      const cfg = ConfigStore.getAll().find((c) => c.id === _selectedId);
      if (!cfg) return;
      // Simple confirm dialog — Zotero provides Services.prompt
      const ok = Services.prompt.confirm(
        null,
        "Delete config",
        `Delete "${cfg.name}"?`,
      );
      if (!ok) return;
      ConfigStore.remove(_selectedId);
      _selectedId = null;
      renderList();
      updateStatus();
    });
    $("btn-activate").addEventListener("click", () => {
      if (_selectedId) {
        ProxyManager.activate(_selectedId);
        renderList();
        updateStatus();
      }
    });
    $("btn-disable").addEventListener("click", () => {
      ProxyManager.deactivate();
      renderList();
      updateStatus();
    });
    $("btn-system-proxy").addEventListener("click", () => {
      ProxyManager.useSystemProxy();
      renderList();
      updateStatus();
    });

    // Dialog
    $("dialog-cancel").addEventListener("click", closeDialog);
    $("dialog-save").addEventListener("click", saveDialog);
    $("dialog-backdrop").addEventListener("click", (e) => {
      if (e.target === $("dialog-backdrop")) closeDialog();
    });
    select("field-type").addEventListener("change", onTypeChange);
  },

  /**
   * Called every time the pane becomes visible again (after the initial init).
   * Refreshes dynamic UI (status bar, config list) without re-binding events.
   */
  refresh(): void {
    if (!_doc) return;
    renderList();
    updateStatus();
  },
};
