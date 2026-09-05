import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { CloudStatusCard } from "@/components/clouds/CloudStatusCard";
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

  return (
    <div className="space-y-5 p-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cloud Topology</h1>
          <p className="text-small text-content-secondary">
            Live status across all four providers.
          </p>
        </div>
        <span className="text-caption text-content-muted">
          Last checked{" "}
          {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "–"}
        </span>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {CLOUDS.map((cloud) =>
          data?.[cloud] ? (
            <CloudStatusCard key={cloud} cloud={cloud} status={data[cloud]} />
          ) : (
            <div key={cloud} className="card h-52 animate-pulse p-4" />
          ),
        )}
      </div>

      <section className="card overflow-hidden">
        <h2 className="border-b border-edge px-3 py-2 text-caption uppercase tracking-wide text-content-muted">
          Live event feed
        </h2>
        <div className="max-h-96 overflow-y-auto">
          <EventFeed events={events} />
        </div>
      </section>
    </div>
  );
}
