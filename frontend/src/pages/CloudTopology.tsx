import { useQuery } from "@tanstack/react-query";
import { Activity, Radio } from "lucide-react";
import { api } from "@/api/client";
import { CloudStatusCard } from "@/components/clouds/CloudStatusCard";
import { TopologyGraph } from "@/components/clouds/TopologyGraph";
import { EventFeed } from "@/components/clouds/EventFeed";
import { useEventStore } from "@/stores/eventStore";
import type { CloudProvider } from "@/types";

const CLOUDS: CloudProvider[] = ["AWS", "AZURE", "GCP", "OCI"];

export function CloudTopology() {
  const events = useEventStore((s) => s.events);
  const { data, dataUpdatedAt } = useQuery({
    queryKey: ["cloud-health"],
    queryFn: () => api.getCloudHealth(),
    refetchInterval: 30_000,
  });

  const allUp = CLOUDS.every((c) => data?.[c]?.status === "UP");

  return (
    <div className="space-y-5 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cloud Topology</h1>
          <p className="text-small text-content-secondary">
            Live status across all four providers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`chip ${allUp ? "border-green-500/40 text-green-400" : "border-amber-500/40 text-amber-400"}`}
          >
            <Radio className="h-3 w-3 animate-pulse" />
            {allUp ? "All systems operational" : "Degraded"}
          </span>
          <span className="text-caption text-content-muted">
            {dataUpdatedAt
              ? `Checked ${new Date(dataUpdatedAt).toLocaleTimeString()}`
              : "Checking…"}
          </span>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <section className="card overflow-hidden">
          <h2 className="border-b border-edge px-3 py-2 text-caption uppercase tracking-wide text-content-muted">
            Replication flow
          </h2>
          <div className="h-[300px] p-2">
            <TopologyGraph status={data} />
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          {CLOUDS.map((cloud) =>
            data?.[cloud] ? (
              <CloudStatusCard key={cloud} cloud={cloud} status={data[cloud]} />
            ) : (
              <div key={cloud} className="card h-52 animate-pulse p-4" />
            ),
          )}
        </div>
      </div>

      <section className="card overflow-hidden">
        <h2 className="flex items-center gap-2 border-b border-edge px-3 py-2 text-caption uppercase tracking-wide text-content-muted">
          <Activity className="h-3.5 w-3.5" />
          Live event feed
          <span className="ml-auto normal-case text-content-muted">
            {events.length} events
          </span>
        </h2>
        <div className="max-h-96 overflow-y-auto">
          <EventFeed events={events} />
        </div>
      </section>
    </div>
  );
}
