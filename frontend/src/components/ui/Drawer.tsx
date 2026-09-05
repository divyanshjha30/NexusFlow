import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/** Right-hand slide-over panel. */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className,
}: Readonly<DrawerProps>) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-sm"
      />

      <aside
        aria-label={title}
        className={cn(
          "relative flex h-full w-full max-w-md animate-slide-in-right flex-col border-l border-edge bg-surface shadow-2xl",
          className,
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-edge px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-body font-semibold" title={title}>
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-caption text-content-muted">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1 text-content-muted hover:bg-surface-raised hover:text-content-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>

        {footer && (
          <footer className="flex items-center gap-2 border-t border-edge px-4 py-3">
            {footer}
          </footer>
        )}
      </aside>
    </div>
  );
}
