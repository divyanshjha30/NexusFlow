import { cn } from "@/lib/utils";

const VARIANTS: Record<string, string> = {
  INVOICE: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  CONTRACT: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  REPORT: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  RECEIPT: "bg-green-500/20 text-green-400 border-green-500/30",
  IMAGE: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  AUDIO: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  OTHER: "bg-slate-500/20 text-slate-400 border-slate-500/30",

  READY: "bg-green-500/20 text-green-400 border-green-500/30",
  PROCESSING: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  UPLOADING: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  FAILED: "bg-red-500/20 text-red-400 border-red-500/30",
  ARCHIVED: "bg-slate-500/20 text-slate-400 border-slate-500/30",

  AWS: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  AZURE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  GCP: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  OCI: "bg-red-600/20 text-red-400 border-red-600/30",

  NEUTRAL: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  POSITIVE: "bg-green-500/20 text-green-400 border-green-500/30",
  NEGATIVE: "bg-red-500/20 text-red-400 border-red-500/30",
  MIXED: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

interface BadgeProps {
  variant: string;
  children?: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className }: Readonly<BadgeProps>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-caption font-medium uppercase tracking-wide",
        VARIANTS[variant] ?? VARIANTS.OTHER,
        className,
      )}
    >
      {children ?? variant}
    </span>
  );
}
