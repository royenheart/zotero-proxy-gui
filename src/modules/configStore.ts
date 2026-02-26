/**
 * configStore.ts
 *
 * Manages serialization/deserialization of proxy configuration presets
 * stored in Zotero preferences as JSON.
 */

export interface ProxyConfig {
  /** UUID uniquely identifying this preset */
  id: string;
  /** Human-readable display name (e.g. "Work Proxy", "Home VPN") */
  name: string;
  /** Proxy type */
  type: "http" | "socks5" | "none";
  /** Proxy host (IP or hostname) */
  host: string;
  /** Proxy port */
  port: number;
  /** HTTPS traffic host (HTTP proxy only; usually same as host) */
  sslHost?: string;
  /** HTTPS traffic port (HTTP proxy only) */
  sslPort?: number;
  /** Route DNS through the proxy (SOCKS5 only; default true) */
  remoteDns?: boolean;
}

const PREF_CONFIGS = "extensions.zotero-proxy-gui.configs";
const PREF_ACTIVE_ID = "extensions.zotero-proxy-gui.activeConfigId";

function generateId(): string {
  // Simple UUID v4-like generator using Math.random (no crypto needed)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const ConfigStore = {
  /** Load all saved proxy configurations from Zotero prefs */
  getAll(): ProxyConfig[] {
    try {
      const raw = Zotero.Prefs.get(PREF_CONFIGS, true) as string | undefined;
      if (!raw) return [];
      return JSON.parse(raw) as ProxyConfig[];
    } catch (e) {
      Zotero.log(`[zotero-proxy-gui] Failed to parse configs: ${e}`, "error");
      return [];
    }
  },

  /** Persist configs array to Zotero prefs */
  saveAll(configs: ProxyConfig[]): void {
    Zotero.Prefs.set(PREF_CONFIGS, JSON.stringify(configs), true);
  },

  /** Get the currently active config id (empty string = none/disabled) */
  getActiveId(): string {
    return (Zotero.Prefs.get(PREF_ACTIVE_ID, true) as string | undefined) ?? "";
  },

  /** Set the active config id */
  setActiveId(id: string): void {
    Zotero.Prefs.set(PREF_ACTIVE_ID, id, true);
  },

  /** Get the currently active config object, or null if none/disabled */
  getActive(): ProxyConfig | null {
    const id = this.getActiveId();
    if (!id) return null;
    return this.getAll().find((c) => c.id === id) ?? null;
  },

  /** Add a new config and return it */
  add(partial: Omit<ProxyConfig, "id">): ProxyConfig {
    const configs = this.getAll();
    const config: ProxyConfig = { id: generateId(), ...partial };
    configs.push(config);
    this.saveAll(configs);
    return config;
  },

  /** Update an existing config by id; returns true if found and updated */
  update(id: string, changes: Partial<Omit<ProxyConfig, "id">>): boolean {
    const configs = this.getAll();
    const idx = configs.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    configs[idx] = { ...configs[idx], ...changes };
    this.saveAll(configs);
    return true;
  },

  /** Remove a config by id; also clears activeId if it matched */
  remove(id: string): boolean {
    const configs = this.getAll();
    const newConfigs = configs.filter((c) => c.id !== id);
    if (newConfigs.length === configs.length) return false;
    this.saveAll(newConfigs);
    if (this.getActiveId() === id) {
      this.setActiveId("");
    }
    return true;
  },
};
