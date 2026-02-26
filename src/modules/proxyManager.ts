/**
 * proxyManager.ts
 *
 * Reads and writes Zotero's network.proxy.* preferences to activate,
 * switch, and disable proxy configurations.
 *
 * Proxy type values used by Firefox/Zotero:
 *   0 = Direct (no proxy)
 *   1 = Manual configuration
 *   2 = PAC URL
 *   4 = Auto-detect (WPAD)
 *   5 = System proxy
 */

import { type ProxyConfig, ConfigStore } from "./configStore";

/** Current proxy state as a human-readable summary */
export interface ProxyStatus {
  active: boolean;
  config: ProxyConfig | null;
  /** Short description for tooltip / status display */
  label: string;
}

export const ProxyManager = {
  /**
   * Apply a saved ProxyConfig to Zotero's network preferences.
   * Passing null or a config with type "none" disables the proxy.
   */
  apply(config: ProxyConfig | null): void {
    if (!config || config.type === "none") {
      this.disable();
      return;
    }

    if (config.type === "http") {
      Zotero.Prefs.set("network.proxy.type", 1);
      Zotero.Prefs.set("network.proxy.http", config.host);
      Zotero.Prefs.set("network.proxy.http_port", config.port);
      // SSL/HTTPS traffic
      const sslHost = config.sslHost ?? config.host;
      const sslPort = config.sslPort ?? config.port;
      Zotero.Prefs.set("network.proxy.ssl", sslHost);
      Zotero.Prefs.set("network.proxy.ssl_port", sslPort);
      // Clear SOCKS fields
      Zotero.Prefs.set("network.proxy.socks", "");
      Zotero.Prefs.set("network.proxy.socks_port", 0);
    } else if (config.type === "socks5") {
      Zotero.Prefs.set("network.proxy.type", 1);
      Zotero.Prefs.set("network.proxy.socks", config.host);
      Zotero.Prefs.set("network.proxy.socks_port", config.port);
      Zotero.Prefs.set("network.proxy.socks_version", 5);
      Zotero.Prefs.set(
        "network.proxy.socks_remote_dns",
        config.remoteDns !== false, // default true
      );
      // Clear HTTP fields
      Zotero.Prefs.set("network.proxy.http", "");
      Zotero.Prefs.set("network.proxy.http_port", 0);
      Zotero.Prefs.set("network.proxy.ssl", "");
      Zotero.Prefs.set("network.proxy.ssl_port", 0);
    }

    Zotero.log(
      `[zotero-proxy-gui] Applied proxy "${config.name}" (${config.type} ${config.host}:${config.port})`,
    );
  },

  /** Disable proxy (set type to 0 = Direct) */
  disable(): void {
    Zotero.Prefs.set("network.proxy.type", 0);
    Zotero.log("[zotero-proxy-gui] Proxy disabled");
  },

  /**
   * Activate a config by id — applies it to Zotero prefs and records
   * it as the active config in the store.
   */
  activate(id: string): void {
    const configs = ConfigStore.getAll();
    const config = configs.find((c) => c.id === id) ?? null;
    this.apply(config);
    ConfigStore.setActiveId(config ? id : "");
  },

  /** Disable proxy and clear the active config id */
  deactivate(): void {
    this.disable();
    ConfigStore.setActiveId("");
  },

  /** Read current status from ConfigStore + live Zotero prefs */
  getStatus(): ProxyStatus {
    const config = ConfigStore.getActive();
    const liveType = Zotero.Prefs.get("network.proxy.type") as number;
    const active = liveType !== 0 && config !== null;

    let label: string;
    if (!active || !config) {
      label = "No proxy (direct connection)";
    } else if (config.type === "http") {
      label = `HTTP ${config.host}:${config.port}`;
    } else if (config.type === "socks5") {
      label = `SOCKS5 ${config.host}:${config.port}`;
    } else {
      label = config.name;
    }

    return { active, config, label };
  },
};
