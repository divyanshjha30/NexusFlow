import { create } from "zustand";

type Theme = "dark" | "light";

interface UiStore {
  theme: Theme;
  paletteOpen: boolean;
  shortcutsOpen: boolean;
  toggleTheme: () => void;
  setPaletteOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
}

const STORAGE_KEY = "nexusflow.theme";

function initialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(STORAGE_KEY, theme);
}

const startingTheme = initialTheme();
applyTheme(startingTheme);

export const useUiStore = create<UiStore>((set, get) => ({
  theme: startingTheme,
  paletteOpen: false,
  shortcutsOpen: false,

  toggleTheme: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    applyTheme(next);
    set({ theme: next });
  },

  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
}));
