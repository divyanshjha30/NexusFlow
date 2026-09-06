import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Library,
  MessageSquare,
  Cloud,
  Archive,
  Settings,
  Hexagon,
  Activity,
  Wallet,
  Bookmark,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/api/client";
import { useSavedViewsStore, viewToSearch } from "@/stores/savedViewsStore";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/library", label: "Library", icon: Library },
  { to: "/chat", label: "AI Chat", icon: MessageSquare },
  { to: "/clouds", label: "Clouds", icon: Cloud },
  { to: "/activity", label: "Activity", icon: Activity },
  { to: "/costs", label: "Costs", icon: Wallet },
  { to: "/archive", label: "Archive", icon: Archive },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const views = useSavedViewsStore((s) => s.views);
  const remove = useSavedViewsStore((s) => s.remove);

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.getTags(),
    staleTime: 60_000,
  });

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-6 overflow-y-auto border-r border-edge bg-surface/50 p-4">
      <div className="flex items-center gap-2">
        <Hexagon className="h-5 w-5 fill-brand text-brand" />
        <span className="text-[15px] font-semibold tracking-tight text-content-primary">
          NexusFlow
        </span>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-2 text-small transition-colors",
                isActive
                  ? "bg-brand/15 text-brand-light"
                  : "text-content-secondary hover:bg-surface-raised hover:text-content-primary",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {views.length > 0 && (
        <div className="space-y-2">
          <p className="px-2.5 text-caption uppercase tracking-wide text-content-muted">
            Saved views
          </p>
          <div className="flex flex-col gap-0.5">
            {views.map((view) => (
              <div key={view.id} className="group flex items-center">
                <NavLink
                  to={`/library?${viewToSearch(view)}`}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-1.5 text-small text-content-secondary hover:bg-surface-raised hover:text-content-primary"
                >
                  <Bookmark className="h-3.5 w-3.5 shrink-0 text-brand-light" />
                  <span className="truncate">{view.name}</span>
                </NavLink>
                <button
                  type="button"
                  onClick={() => remove(view.id)}
                  aria-label={`Delete view ${view.name}`}
                  className="rounded p-1 text-content-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tags && tags.length > 0 && (
        <div className="space-y-2">
          <p className="px-2.5 text-caption uppercase tracking-wide text-content-muted">
            Tags
          </p>
          <div className="flex flex-wrap gap-1 px-2.5">
            {tags.map((tag) => (
              <NavLink
                key={tag}
                to={`/library?q=${encodeURIComponent(tag)}`}
                className="rounded bg-surface-raised px-1.5 py-0.5 text-caption text-content-secondary hover:bg-brand/20 hover:text-brand-light"
              >
                #{tag}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
