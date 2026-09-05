import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  LayoutDashboard,
  Library as LibraryIcon,
  MessageSquare,
  Cloud,
  Archive,
  Settings as SettingsIcon,
  Moon,
  Sun,
  FileText,
  CornerDownLeft,
} from "lucide-react";
import { api } from "@/api/client";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: "Navigation" | "Documents" | "Actions";
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
}

export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["documents", "palette"],
    queryFn: () =>
      api.listDocuments({
        page: 0,
        size: 50,
        sort: "createdAt",
        direction: "desc",
      }),
    enabled: open,
  });

  const commands = useMemo<Command[]>(() => {
    const go = (path: string) => () => {
      navigate(path);
      setOpen(false);
    };

    const nav: Command[] = [
      {
        id: "n-dash",
        label: "Go to Dashboard",
        group: "Navigation",
        icon: LayoutDashboard,
        run: go("/dashboard"),
      },
      {
        id: "n-lib",
        label: "Go to Library",
        group: "Navigation",
        icon: LibraryIcon,
        run: go("/library"),
      },
      {
        id: "n-chat",
        label: "Go to AI Chat",
        group: "Navigation",
        icon: MessageSquare,
        run: go("/chat"),
      },
      {
        id: "n-clouds",
        label: "Go to Cloud Topology",
        group: "Navigation",
        icon: Cloud,
        run: go("/clouds"),
      },
      {
        id: "n-arch",
        label: "Go to Archive",
        group: "Navigation",
        icon: Archive,
        run: go("/archive"),
      },
      {
        id: "n-set",
        label: "Go to Settings",
        group: "Navigation",
        icon: SettingsIcon,
        run: go("/settings"),
      },
    ];

    const actions: Command[] = [
      {
        id: "a-theme",
        label:
          theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
        group: "Actions",
        icon: theme === "dark" ? Sun : Moon,
        run: () => {
          toggleTheme();
          setOpen(false);
        },
      },
    ];

    const docs: Command[] = (data?.content ?? []).map((doc) => ({
      id: `d-${doc.id}`,
      label: doc.fileName,
      hint: doc.documentType ?? undefined,
      group: "Documents",
      icon: FileText,
      run: go(`/documents/${doc.id}`),
    }));

    return [...nav, ...actions, ...docs];
  }, [data, navigate, setOpen, theme, toggleTheme]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.slice(0, 12);
    return commands
      .filter(
        (c) =>
          c.label.toLowerCase().includes(q) ||
          c.hint?.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [commands, query]);

  useEffect(() => setActive(0), [query, open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => (i + 1) % Math.max(results.length, 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive(
          (i) => (i - 1 + results.length) % Math.max(results.length, 1),
        );
      }
      if (e.key === "Enter") {
        e.preventDefault();
        results[active]?.run();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, active, setOpen]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
      <button
        type="button"
        aria-label="Close command palette"
        onClick={() => setOpen(false)}
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
      />

      <dialog
        open
        aria-label="Command palette"
        className="card-glass relative m-0 w-full max-w-xl animate-scale-in overflow-hidden p-0 text-content-primary shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-edge px-3">
          <Search className="h-4 w-4 shrink-0 text-content-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents, jump to a page, run an action…"
            className="w-full bg-transparent py-3 text-small text-content-primary outline-none focus-visible:ring-0 placeholder:text-content-muted"
          />
          <kbd className="kbd">Esc</kbd>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 && (
            <p className="px-3 py-6 text-center text-small text-content-muted">
              No matches for “{query}”.
            </p>
          )}

          {results.map((cmd, i) => {
            const showGroup = cmd.group !== lastGroup;
            lastGroup = cmd.group;
            const Icon = cmd.icon;
            return (
              <div key={cmd.id}>
                {showGroup && (
                  <p className="px-2 pb-1 pt-2 text-caption uppercase tracking-wide text-content-muted">
                    {cmd.group}
                  </p>
                )}
                <button
                  type="button"
                  data-index={i}
                  onMouseEnter={() => setActive(i)}
                  onClick={cmd.run}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-small transition-colors",
                    i === active
                      ? "bg-brand/15 text-content-primary"
                      : "text-content-secondary",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-brand-light" />
                  <span className="min-w-0 flex-1 truncate">{cmd.label}</span>
                  {cmd.hint && (
                    <span className="shrink-0 text-caption text-content-muted">
                      {cmd.hint}
                    </span>
                  )}
                  {i === active && (
                    <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-content-muted" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 border-t border-edge px-3 py-2 text-caption text-content-muted">
          <span className="flex items-center gap-1">
            <kbd className="kbd">↑</kbd>
            <kbd className="kbd">↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="kbd">↵</kbd> select
          </span>
          <span className="ml-auto flex items-center gap-1">
            <kbd className="kbd">⌘</kbd>
            <kbd className="kbd">K</kbd>
          </span>
        </div>
      </dialog>
    </div>
  );
}
