import type { Route } from "next";

/**
 * The single source of truth for the dashboard's keyboard shortcuts. The
 * sidebar tooltips, the command palette, the global digit handler, and the
 * "?" cheatsheet all read from these tables, so a change here stays in sync
 * everywhere.
 */

export type NavSection =
  | "dashboard"
  | "overview"
  | "links"
  | "profile"
  | "appearance"
  | "insights"
  | "settings";

export const NAV_SHORTCUTS = [
  {
    section: "dashboard",
    label: "Dashboard",
    digit: "1",
    keywords: ["home", "profiles", "stats", "all profiles"],
  },
  {
    section: "overview",
    label: "Overview",
    digit: "2",
    keywords: ["summary", "status"],
  },
  {
    section: "links",
    label: "Links",
    digit: "3",
    keywords: ["add", "edit", "reorder", "blocks", "links"],
  },
  {
    section: "profile",
    label: "Profile",
    digit: "4",
    keywords: ["bio", "avatar", "banner", "name"],
  },
  {
    section: "appearance",
    label: "Appearance",
    digit: "5",
    keywords: ["theme", "colors", "wallpaper", "customize", "design"],
  },
  {
    section: "insights",
    label: "Insights",
    digit: "6",
    keywords: ["analytics", "views", "clicks", "stats"],
  },
  {
    section: "settings",
    label: "Settings",
    digit: "7",
    keywords: ["username", "delete", "profile settings"],
  },
] as const;

export type NavShortcut = (typeof NAV_SHORTCUTS)[number];

export function navShortcutHref(section: NavSection, username: string): Route {
  if (section === "dashboard") {
    return "/dashboard";
  }
  // SAFETY: /:username/<section>; the typed route union is only knowable for literals.
  return `/${username}/${section}` as Route;
}

export type ShortcutRow = {
  label: string;
  /**
   * Display tokens. "mod" and "shift" resolve per platform at render time
   * (⌘/Ctrl, ⇧/Shift); everything else renders verbatim.
   */
  keys: string[];
};

export const GENERAL_SHORTCUTS: ShortcutRow[] = [
  { label: "Open command menu", keys: ["mod", "K"] },
  { label: "Toggle sidebar", keys: ["mod", "B"] },
  { label: "Show keyboard shortcuts", keys: ["?"] },
];

export const EDITOR_SHORTCUTS: ShortcutRow[] = [
  { label: "Undo change", keys: ["mod", "Z"] },
  { label: "Redo change", keys: ["mod", "shift", "Z"] },
];
