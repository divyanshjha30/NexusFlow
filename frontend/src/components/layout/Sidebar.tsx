import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Library,
  MessageSquare,
  Cloud,
  Archive,
  Settings,
  Hexagon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/library", label: "Library", icon: Library },
  { to: "/chat", label: "AI Chat", icon: MessageSquare },
  { to: "/clouds", label: "Clouds", icon: Cloud },
  { to: "/archive", label: "Archive", icon: Archive },
  { to: "/settings", label: "Settings", icon: Settings },
];

const TAGS = ["invoice", "contract", "acme-corp", "2024", "receipt"];

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col gap-6 border-r border-edge bg-surface/50 p-4">
      <div className="flex items-center gap-2">
        <Hexagon className="h-5 w-5 fill-brand text-brand" />
        <span className="text-base font-semibold tracking-tight">
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
                  ? "bg-brand-dim/30 text-brand-light"
                  : "text-content-secondary hover:bg-surface-raised hover:text-content-primary",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2">
        <p className="px-2.5 text-caption uppercase tracking-wide text-content-muted">
          Tags
        </p>
        <div className="flex flex-wrap gap-1 px-2.5">
          {TAGS.map((tag) => (
            <NavLink
              key={tag}
              to={`/library?q=${tag}`}
              className="rounded bg-surface-raised px-1.5 py-0.5 text-caption text-content-secondary hover:bg-brand-dim/40 hover:text-brand-light"
            >
              #{tag}
            </NavLink>
          ))}
        </div>
      </div>
    </aside>
  );
}
