/**
 * globals.d.ts
 *
 * Ambient declarations for Zotero's non-standard browser globals
 * that are not covered by zotero-types.
 */

/// <reference types="zotero-types" />

/** Alias for XUL.Element — the base type returned by createXULElement */
type XULElement = XUL.Element;

/**
 * Zotero's main window extends the standard Window with Zotero-specific
 * objects and XUL document helpers.
 */
interface Window {
  /** Available in all Zotero windows */
  Zotero: _ZoteroConstructable;
  /** Preference window opener */
  Zotero_Preferences: {
    openPreferences(paneID?: string): void;
    init(): void;
  };
}

/** Extend Document to include XUL element factory */
interface Document {
  createXULElement(tagName: string): XUL.Element;
}

/** APP_SHUTDOWN is in scope inside bootstrap.js / loadSubScript context */
declare const APP_SHUTDOWN: number;
