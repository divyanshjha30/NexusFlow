import { create } from "zustand";
import type { DocumentFilters } from "@/types";

export interface SavedView {
  id: string;
  name: string;
  filters: Pick<
    DocumentFilters,
    "search" | "type" | "cloud" | "sort" | "direction" | "archived"
  >;
}

interface SavedViewsStore {
  views: SavedView[];
  save: (name: string, filters: SavedView["filters"]) => void;
  remove: (id: string) => void;
}

const STORAGE_KEY = "nexusflow.savedViews";

function load(): SavedView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedView[]) : [];
  } catch {
    return [];
  }
}

function persist(views: SavedView[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}

export const useSavedViewsStore = create<SavedViewsStore>((set, get) => ({
  views: load(),

  save: (name, filters) => {
    const views = [...get().views, { id: crypto.randomUUID(), name, filters }];
    persist(views);
    set({ views });
  },

  remove: (id) => {
    const views = get().views.filter((v) => v.id !== id);
    persist(views);
    set({ views });
  },
}));

/** Serialises a saved view into Library query params. */
export function viewToSearch(view: SavedView): string {
  const p = new URLSearchParams();
  if (view.filters.search) p.set("q", view.filters.search);
  if (view.filters.type && view.filters.type !== "ALL")
    p.set("type", view.filters.type);
  if (view.filters.cloud && view.filters.cloud !== "ALL")
    p.set("cloud", view.filters.cloud);
  if (view.filters.sort) p.set("sort", view.filters.sort);
  if (view.filters.direction) p.set("dir", view.filters.direction);
  return p.toString();
}
