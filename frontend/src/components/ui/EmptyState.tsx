import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: Readonly<EmptyStateProps>) {
  return (
    <div
      className={cn(
        "card flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-edge bg-surface-raised">
        <span className="absolute inset-0 animate-pulse-glow rounded-2xl bg-brand/10" />
        <Icon className="relative h-6 w-6 text-brand-light" />
      </span>
      <div>
        <p className="text-body font-medium text-content-primary">{title}</p>
        {description && (
          <p className="mt-1 max-w-sm text-small text-content-secondary">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
