import { cn } from "@/lib/utils";

export function Spinner({ className }: Readonly<{ className?: string }>) {
  return (
    <output
      aria-label="Loading"
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand/30 border-t-brand",
        className,
      )}
    />
  );
}
