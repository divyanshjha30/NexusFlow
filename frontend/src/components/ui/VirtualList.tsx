import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface VirtualListProps<T> {
  items: T[];
  rowHeight: number;
  height: number;
  overscan?: number;
  renderRow: (item: T, index: number) => React.ReactNode;
  getKey: (item: T, index: number) => string;
  className?: string;
}

/**
 * Fixed-height windowing. Only rows in view (plus overscan) are mounted, so a
 * library of thousands stays responsive without pulling in a virtualisation lib.
 */
export function VirtualList<T>({
  items,
  rowHeight,
  height,
  overscan = 6,
  renderRow,
  getKey,
  className,
}: Readonly<VirtualListProps<T>>) {
  const [scrollTop, setScrollTop] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const total = items.length * rowHeight;
  const first = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(height / rowHeight) + overscan * 2;
  const last = Math.min(items.length, first + visibleCount);
  const slice = items.slice(first, last);

  return (
    <div
      ref={ref}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      style={{ height }}
      className={cn("relative overflow-y-auto", className)}
    >
      <div style={{ height: total }} className="relative">
        <div
          style={{ transform: `translateY(${first * rowHeight}px)` }}
          className="absolute inset-x-0 top-0"
        >
          {slice.map((item, i) => (
            <div key={getKey(item, first + i)} style={{ height: rowHeight }}>
              {renderRow(item, first + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
