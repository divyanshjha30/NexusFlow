import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Backdrop is a sibling <button> rather than a wrapping div with onClick,
 * which keeps it operable by keyboard and screen readers.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: Readonly<ModalProps>) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
      />

      <dialog
        open
        aria-label={title}
        className={cn(
          "card-glass relative m-0 w-full max-w-lg animate-scale-in p-0 text-content-primary shadow-2xl",
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-edge px-4 py-3">
          <div>
            <h2 className="text-body font-semibold">{title}</h2>
            {description && (
              <p className="mt-0.5 text-small text-content-secondary">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-content-muted hover:bg-surface-raised hover:text-content-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-edge px-4 py-3">
            {footer}
          </footer>
        )}
      </dialog>
    </div>
  );
}
