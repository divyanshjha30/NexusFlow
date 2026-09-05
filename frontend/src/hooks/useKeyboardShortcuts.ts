import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUiStore } from "@/stores/uiStore";

const GO_TO: Record<string, string> = {
  d: "/dashboard",
  l: "/library",
  c: "/chat",
  t: "/clouds",
  a: "/archive",
  s: "/settings",
};

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return (
    !!el &&
    (el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.tagName === "SELECT" ||
      el.isContentEditable)
  );
}

/** Global shortcuts: Cmd/Ctrl+K, `?`, and Linear-style `g` then a letter. */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  useEffect(() => {
    let awaitingGo = false;
    let goTimer: number | undefined;

    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(!useUiStore.getState().paletteOpen);
        return;
      }

      if (isTypingTarget(e.target)) return;

      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        toggleTheme();
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }

      if (awaitingGo) {
        const path = GO_TO[e.key.toLowerCase()];
        awaitingGo = false;
        window.clearTimeout(goTimer);
        if (path) {
          e.preventDefault();
          navigate(path);
        }
        return;
      }

      if (e.key.toLowerCase() === "g") {
        awaitingGo = true;
        goTimer = window.setTimeout(() => {
          awaitingGo = false;
        }, 1200);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(goTimer);
    };
  }, [navigate, setPaletteOpen, setShortcutsOpen, toggleTheme]);
}
