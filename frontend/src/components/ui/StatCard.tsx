import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Counts up to `value`, falling back to the exact value when animation cannot run. */
function useCountUp(value: number, duration = 700) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const canAnimate =
      typeof requestAnimationFrame === "function" &&
      document.visibilityState === "visible" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!canAnimate) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      setDisplay(value);
    };
  }, [value, duration]);

  return display;
}

export function Sparkline({
  points,
  className,
}: Readonly<{ points: number[]; className?: string }>) {
  if (points.length < 2) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * 100;
    const y = 28 - ((p - min) / span) * 24;
    return `${x},${y}`;
  });

  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      className={cn("h-8 w-full", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--brand))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(var(--brand))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,30 ${coords.join(" ")} 100,30`}
        fill="url(#sparkFill)"
      />
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="rgb(var(--brand-light))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  format?: (n: number) => string;
  delta?: number;
  points?: number[];
  accent?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function StatCard({
  label,
  value,
  format = (n) => Math.round(n).toLocaleString(),
  delta,
  points,
  accent = "text-brand-light",
  icon: Icon,
}: Readonly<StatCardProps>) {
  const animated = useCountUp(value);
  const positive = (delta ?? 0) >= 0;
  const Trend = positive ? TrendingUp : TrendingDown;

  return (
    <div className="card-interactive overflow-hidden p-4">
      <div className="flex items-center justify-between">
        <p className="text-caption uppercase tracking-wide text-content-muted">
          {label}
        </p>
        {Icon && <Icon className={cn("h-4 w-4", accent)} />}
      </div>

      <p className="mt-2 text-2xl font-semibold tracking-tight text-content-primary">
        {format(animated)}
      </p>

      {delta !== undefined && (
        <p
          className={cn(
            "mt-0.5 flex items-center gap-1 text-caption",
            positive ? "text-green-400" : "text-red-400",
          )}
        >
          <Trend className="h-3 w-3" />
          {positive ? "+" : ""}
          {delta}% vs last week
        </p>
      )}

      {points && <Sparkline points={points} className="mt-3" />}
    </div>
  );
}
