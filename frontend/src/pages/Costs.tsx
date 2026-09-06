import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp, Info } from "lucide-react";
import { api } from "@/api/client";
import { StatCard } from "@/components/ui/StatCard";
import { CloudDot } from "@/components/ui/CloudDot";
import { cn, formatBytes } from "@/lib/utils";
import type { CloudProvider } from "@/types";

/** Published list prices per GB-month for the standard tier. */
const RATE_PER_GB: Record<CloudProvider, number> = {
  AWS: 0.023,
  AZURE: 0.0184,
  GCP: 0.02,
  OCI: 0.0255,
};

const CLOUDS: CloudProvider[] = ["AWS", "AZURE", "GCP", "OCI"];
const BAR_COLOR: Record<CloudProvider, string> = {
  AWS: "bg-cloud-aws",
  AZURE: "bg-cloud-azure",
  GCP: "bg-cloud-gcp",
  OCI: "bg-cloud-oci",
};

const GB = 1024 ** 3;

export function Costs() {
  const [months, setMonths] = useState(12);

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.getStats(),
  });

  const rows = CLOUDS.map((cloud) => {
    const usage = stats?.perCloud?.[cloud];
    const bytes = usage?.bytes ?? 0;
    const gb = bytes / GB;
    const rate = RATE_PER_GB[cloud];
    return {
      cloud,
      objects: usage?.objects ?? 0,
      bytes,
      gb,
      rate,
      monthly: gb * rate,
    };
  });

  const monthlyTotal = rows.reduce((sum, r) => sum + r.monthly, 0);
  const maxMonthly = Math.max(...rows.map((r) => r.monthly), Number.EPSILON);
  const projected = monthlyTotal * months;

  return (
    <div className="space-y-5 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Costs</h1>
          <p className="text-small text-content-secondary">
            Storage spend modelled from your actual replicated bytes.
          </p>
        </div>
        <div className="flex gap-1.5">
          {[1, 6, 12, 36].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMonths(m)}
              className={cn("chip", months === m && "chip-active")}
            >
              {m}mo
            </button>
          ))}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Monthly run rate"
          value={monthlyTotal}
          format={(n) => `$${n.toFixed(5)}`}
          icon={Wallet}
        />
        <StatCard
          label={`Projected ${months}mo`}
          value={projected}
          format={(n) => `$${n.toFixed(4)}`}
          icon={TrendingUp}
        />
        <StatCard
          label="Bytes replicated"
          value={rows.reduce((s, r) => s + r.bytes, 0)}
          format={formatBytes}
        />
        <StatCard
          label="Objects replicated"
          value={rows.reduce((s, r) => s + r.objects, 0)}
        />
      </section>

      <section className="card overflow-hidden">
        <h2 className="border-b border-edge px-3 py-2 text-caption uppercase tracking-wide text-content-muted">
          Breakdown by provider
        </h2>

        <div className="divide-y divide-edge-subtle">
          {rows.map((row) => (
            <div key={row.cloud} className="space-y-2 px-3 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <CloudDot cloud={row.cloud} />
                <span className="ml-auto font-mono text-caption text-content-muted">
                  ${row.rate.toFixed(5)}/GB·mo
                </span>
                <span className="w-24 text-right font-mono text-small text-content-primary">
                  ${row.monthly.toFixed(6)}
                </span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-edge-subtle">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    BAR_COLOR[row.cloud],
                  )}
                  style={{ width: `${(row.monthly / maxMonthly) * 100}%` }}
                />
              </div>

              <p className="text-caption text-content-muted">
                {row.objects} objects · {formatBytes(row.bytes)}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-edge px-3 py-2.5">
          <span className="text-small font-medium text-content-primary">
            Total
          </span>
          <span className="font-mono text-small text-content-primary">
            ${monthlyTotal.toFixed(6)}/mo
          </span>
        </div>
      </section>

      <p className="flex items-start gap-2 text-caption text-content-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Storage only — request, egress and AI inference charges are excluded.
        Local floci usage is free; these figures model the equivalent spend
        against real provider list prices.
      </p>
    </div>
  );
}
