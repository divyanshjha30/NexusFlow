import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useToastStore, type ToastVariant } from "@/stores/toastStore";
import { cn } from "@/lib/utils";

const ICON = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const ACCENT: Record<ToastVariant, string> = {
  success: "text-green-400",
  error: "text-red-400",
  info: "text-brand-light",
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICON[t.variant];
        return (
          <div
            key={t.id}
            className="card-glass pointer-events-auto flex animate-slide-in-right items-start gap-2.5 p-3 shadow-xl"
          >
            <Icon
              className={cn("mt-0.5 h-4 w-4 shrink-0", ACCENT[t.variant])}
            />
            <div className="min-w-0 flex-1">
              <p className="text-small font-medium text-content-primary">
                {t.title}
              </p>
              {t.description && (
                <p className="mt-0.5 text-caption text-content-secondary">
                  {t.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="shrink-0 rounded p-0.5 text-content-muted hover:bg-surface-raised hover:text-content-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
