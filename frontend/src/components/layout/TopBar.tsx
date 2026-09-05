import { Link, useLocation } from "react-router-dom";
import { Search, Moon, Sun, Keyboard, Bell } from "lucide-react";
import { useUiStore } from "@/stores/uiStore";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/library": "Documents",
  "/archive": "Archive",
  "/chat": "AI Chat",
  "/clouds": "Cloud Topology",
  "/settings": "Settings",
};

export function TopBar() {
  const { pathname } = useLocation();
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  const title =
    TITLES[pathname] ??
    (pathname.startsWith("/documents") ? "Document" : "NexusFlow");

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-edge bg-canvas/70 px-5 backdrop-blur-xl">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-small"
      >
        <Link
          to="/dashboard"
          className="text-content-muted hover:text-content-primary"
        >
          NexusFlow
        </Link>
        <span className="text-content-muted">/</span>
        <span className="font-medium text-content-primary">{title}</span>
      </nav>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="ml-auto flex w-72 items-center gap-2 rounded-lg border border-edge bg-surface px-2.5 py-1.5 text-small text-content-muted transition-colors hover:border-brand/40 hover:text-content-secondary"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search everything…</span>
        <kbd className="kbd">⌘</kbd>
        <kbd className="kbd">K</kbd>
      </button>

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => setShortcutsOpen(true)}
          aria-label="Keyboard shortcuts"
          className="rounded-lg p-2 text-content-muted hover:bg-surface-raised hover:text-content-primary"
        >
          <Keyboard className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-content-muted hover:bg-surface-raised hover:text-content-primary"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="rounded-lg p-2 text-content-muted hover:bg-surface-raised hover:text-content-primary"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand to-purple-500 text-caption font-semibold text-white">
        D
      </div>
    </header>
  );
}
