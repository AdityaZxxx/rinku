"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import type { profiles } from "@/lib/db/schema";
import {
  ChartBarIcon,
  CheckIcon,
  GearIcon,
  HouseIcon,
  KeyboardIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  SidebarIcon,
  SignOutIcon,
  SquaresFourIcon,
  SunIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { useTheme } from "next-themes";

import { signOut } from "@/app/actions/auth";
import { Kbd, ShortcutKeys } from "@/components/dashboard/kbd";
import { useConfirmLeave } from "@/components/profile/unsaved-changes-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMac } from "@/hooks/use-is-mac";
import { anyDialogOpen, isEditableTarget } from "@/lib/dashboard/keyboard";
import {
  EDITOR_SHORTCUTS,
  GENERAL_SHORTCUTS,
  NAV_SHORTCUTS,
  navShortcutHref,
  type NavSection,
} from "@/lib/dashboard/shortcuts";
import { EDIT_SECTIONS } from "@/lib/profiles/sections";

type Profile = typeof profiles.$inferSelect;

/**
 * Cross-component open signal: the mobile dock's trigger shares this palette
 * with the header one without lifting the dialog's state out of the component.
 */
const openListeners = new Set<() => void>();

export function openCommandPalette() {
  for (const listener of openListeners) {
    listener();
  }
}

const NAV_ICONS: Record<NavSection, ReactNode> = {
  dashboard: <HouseIcon />,
  overview: <SquaresFourIcon />,
  links: <LinkIcon />,
  profile: <UserCircleIcon />,
  appearance: <PaletteIcon />,
  insights: <ChartBarIcon />,
  settings: <GearIcon />,
};

type PaletteAction = {
  id: string;
  group: "Go to" | "Profiles" | "Actions";
  label: string;
  keywords: string[];
  icon: ReactNode;
  /** Keycap tokens; "mod"/"shift" resolve per platform at render time. */
  hint?: string[];
  suffix?: ReactNode;
  run: () => void;
};

/**
 * ⌘K command menu for the protected app, plus the global handlers for the
 * other shortcuts (digits 1–7 jump between sections, "?" opens the cheatsheet
 * below), so bare-key routing lives in one place. Every navigation goes
 * through `useConfirmLeave`: a keyboard jump must warn about unpublished
 * edits the same way a sidebar click does.
 */
export function CommandPalette({ profiles: allProfiles }: { profiles: Profile[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const confirmLeave = useConfirmLeave();
  const { theme, setTheme } = useTheme();
  const { toggleSidebar } = useSidebar();
  const isMac = useIsMac();

  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // /dashboard and /account carry no username: the edit context falls back to
  // the first profile, and profile switches keep the current section. Both
  // rules must stay in lockstep with the header's ProfilePicker.
  const segments = pathname.split("/");
  const urlProfile = allProfiles.find((profile) => profile.username === segments[1]);
  const editing = (urlProfile ?? allProfiles[0])?.username ?? "";
  const urlSection = EDIT_SECTIONS.find((section) => section === segments[2]);
  const switchSection = urlProfile && urlSection ? urlSection : "overview";

  function go(href: Route) {
    setOpen(false);
    if (href === pathname) {
      return;
    }
    confirmLeave(() => router.push(href));
  }

  const actions: PaletteAction[] = [
    ...NAV_SHORTCUTS.map((item) => ({
      id: item.section,
      group: "Go to" as const,
      label: item.label,
      keywords: [...item.keywords],
      icon: NAV_ICONS[item.section],
      hint: [item.digit],
      run: () => go(navShortcutHref(item.section, editing)),
    })),
    {
      id: "account-settings",
      group: "Go to",
      label: "Account settings",
      keywords: ["email", "password", "account"],
      icon: <GearIcon />,
      run: () => go("/account/settings"),
    },
    ...allProfiles
      .filter((profile) => profile.username !== editing)
      .map((profile) => ({
        id: `switch-${profile.id}`,
        group: "Profiles" as const,
        label: `Switch to ${profile.displayName ?? profile.username}`,
        keywords: ["switch", "profile", profile.username],
        icon: (
          <Avatar className="size-4">
            <AvatarFallback className="text-[8px] font-medium">
              {(profile.displayName ?? profile.username)[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ),
        // SAFETY: /:username/:section; the typed route union is only knowable
        // for literals.
        run: () => go(`/${profile.username}/${switchSection}` as Route),
      })),
    ...(["light", "dark", "system"] as const).map((value) => ({
      id: `theme-${value}`,
      group: "Actions" as const,
      label: `Theme: ${value[0]?.toUpperCase()}${value.slice(1)}`,
      keywords: ["theme", "appearance", value, "mode"],
      icon:
        value === "light" ? (
          <SunIcon />
        ) : value === "dark" ? (
          <MoonIcon />
        ) : (
          <MonitorIcon />
        ),
      suffix:
        (theme ?? "system") === value ? (
          <CheckIcon className="ms-auto shrink-0" aria-label="Active" />
        ) : null,
      run: () => setTheme(value),
    })),
    {
      id: "toggle-sidebar",
      group: "Actions",
      label: "Toggle sidebar",
      keywords: ["sidebar", "collapse", "expand"],
      icon: <SidebarIcon />,
      hint: ["mod", "B"],
      run: toggleSidebar,
    },
    {
      id: "shortcuts",
      group: "Actions",
      label: "Keyboard shortcuts",
      keywords: ["help", "keys", "cheatsheet"],
      icon: <KeyboardIcon />,
      hint: ["?"],
      run: () => setHelpOpen(true),
    },
    {
      id: "logout",
      group: "Actions",
      label: "Log out",
      keywords: ["sign out", "log out", "exit"],
      icon: <SignOutIcon />,
      run: () => confirmLeave(() => void signOut()),
    },
  ];

  const term = query.trim().toLowerCase();
  const matches = term
    ? actions.filter(
        (action) =>
          action.label.toLowerCase().includes(term) ||
          action.keywords.some((keyword) => keyword.includes(term)),
      )
    : actions;
  const active = matches.find((action) => action.id === activeId) ?? matches[0];

  const groups = new Map<string, PaletteAction[]>();
  for (const action of matches) {
    const group = groups.get(action.group) ?? [];
    group.push(action);
    groups.set(action.group, group);
  }

  function invoke(action: PaletteAction) {
    setOpen(false);
    action.run();
  }

  function resetSearch() {
    setQuery("");
    setActiveId(null);
  }

  function onPaletteOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      resetSearch();
    }
  }

  function onQueryChange(event: React.ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
    setActiveId(null);
  }

  function onListKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (matches.length === 0 || !active) {
      return;
    }
    const index = matches.findIndex((action) => action.id === active.id);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const next = (index + delta + matches.length) % matches.length;
      setActiveId(matches[next]?.id ?? null);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActiveId(
        (event.key === "Home" ? matches[0] : matches[matches.length - 1])?.id ?? null,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      invoke(active);
    }
  }

  // Focused via effect, not the autoFocus attribute: jsx-a11y/no-autofocus is
  // an error in this repo.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    const listener = () => setOpen(true);
    openListeners.add(listener);
    return () => {
      openListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!open || !active) {
      return;
    }
    document
      .getElementById(`${listboxId}-${active.id}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active, listboxId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      // ⌘K fires even from text fields: it opens an overlay, so no keystroke
      // meant for the field is lost.
      if (mod && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (open || helpOpen) {
        return;
      }
      if (mod || event.altKey || isEditableTarget(event.target) || anyDialogOpen()) {
        return;
      }
      if (event.key === "?") {
        event.preventDefault();
        setHelpOpen(true);
        return;
      }
      const shortcut = NAV_SHORTCUTS.find((item) => item.digit === event.key);
      if (shortcut) {
        event.preventDefault();
        go(navShortcutHref(shortcut.section, editing));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const cheatsheet = [
    {
      title: "Go to",
      rows: NAV_SHORTCUTS.map((item) => ({
        label: item.label,
        keys: [item.digit],
      })),
    },
    { title: "General", rows: GENERAL_SHORTCUTS },
    { title: "While editing", rows: EDITOR_SHORTCUTS },
  ];

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        aria-label="Open command menu"
        aria-keyshortcuts="Meta+K"
        className="text-muted-foreground h-8 gap-2 rounded-xl px-2.5 font-normal max-lg:hidden"
      >
        <MagnifyingGlassIcon aria-hidden />
        <span>Search</span>
        <Kbd>{isMac ? "⌘K" : "Ctrl K"}</Kbd>
      </Button>

      <Dialog open={open} onOpenChange={onPaletteOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="top-[12vh] flex max-h-[min(70dvh,30rem)] translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        >
          <DialogTitle className="sr-only">Command menu</DialogTitle>
          <DialogDescription className="sr-only">
            Search pages, profiles, and actions. Arrow keys move through the results and
            Enter runs the highlighted one.
          </DialogDescription>

          <div className="flex shrink-0 items-center gap-2 border-b px-3">
            <MagnifyingGlassIcon
              aria-hidden
              className="text-muted-foreground size-4 shrink-0"
            />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded
              aria-controls={listboxId}
              aria-activedescendant={active ? `${listboxId}-${active.id}` : undefined}
              aria-label="Search pages, profiles, and actions"
              value={query}
              onChange={onQueryChange}
              onKeyDown={onListKeyDown}
              placeholder="Type a command or search…"
              className="placeholder:text-muted-foreground h-12 w-full bg-transparent text-sm outline-none"
            />
            <Kbd>esc</Kbd>
          </div>

          <div className="max-h-80 min-h-0 overflow-y-auto overscroll-contain p-1.5">
            {matches.length === 0 ? (
              <p className="text-muted-foreground px-2 py-6 text-center text-sm">
                No results for “{query}”.
              </p>
            ) : (
              // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- APG combobox: a native select can't host group headers, avatars and keycap hints inside a dialog
              <div role="listbox" id={listboxId} aria-label="Results">
                {[...groups].map(([group, items]) => (
                  <div
                    key={group}
                    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- optgroup semantics without a select ancestor
                    role="group"
                    aria-label={group}
                    className="pb-1 last:pb-0"
                  >
                    <div className="text-muted-foreground px-2 pt-2 pb-1 text-xs font-medium">
                      {group}
                    </div>
                    {items.map((action) => (
                      // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- keyboard activation happens at the combobox input: Enter invokes the active option (APG aria-activedescendant pattern)
                      <div
                        key={action.id}
                        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- APG combobox: options participate via aria-activedescendant on the input, not native option elements
                        role="option"
                        id={`${listboxId}-${action.id}`}
                        aria-selected={action.id === active?.id}
                        data-active={action.id === active?.id || undefined}
                        tabIndex={-1}
                        onMouseMove={() => setActiveId(action.id)}
                        onClick={() => invoke(action)}
                        className="data-active:bg-accent flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm select-none"
                      >
                        <span
                          aria-hidden
                          className="text-muted-foreground flex size-4 shrink-0 items-center justify-center"
                        >
                          {action.icon}
                        </span>
                        <span className="truncate">{action.label}</span>
                        {action.suffix}
                        {action.hint ? (
                          <ShortcutKeys
                            keys={action.hint}
                            className={action.suffix ? undefined : "ms-auto"}
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-muted-foreground flex shrink-0 items-center gap-4 border-t px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>↵</Kbd>
              to select
            </span>
            <span className="ms-auto flex items-center gap-1.5">
              <Kbd>?</Kbd>
              all shortcuts
            </span>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="flex max-h-[min(85dvh,38rem)] flex-col overflow-hidden sm:max-w-sm">
          <DialogHeader className="shrink-0">
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>
              Number keys and &ldquo;?&rdquo; are ignored while you&apos;re typing in a
              field.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain">
            {cheatsheet.map((group) => (
              <div key={group.title} className="flex flex-col">
                <h3 className="text-muted-foreground pb-1 text-xs font-medium tracking-wide uppercase">
                  {group.title}
                </h3>
                {group.rows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 py-1 text-sm"
                  >
                    <span>{row.label}</span>
                    <ShortcutKeys keys={row.keys} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
