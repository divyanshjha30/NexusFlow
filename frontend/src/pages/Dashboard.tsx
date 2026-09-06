import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  FileStack,
  HardDrive,
  Sparkles,
  Zap,
  Inbox,
} from "lucide-react";
import { api } from "@/api/client";
import { UploadZone } from "@/components/upload/UploadZone";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { TopologyGraph } from "@/components/clouds/TopologyGraph";
import { CloudDot } from "@/components/ui/CloudDot";
import { formatBytes } from "@/lib/utils";
import type { CloudProvider } from "@/types";

const CLOUDS: CloudProvider[] = ["AWS", "AZURE", "GCP", "OCI"];
const CLOUD_LABEL: Record<CloudProvider, string> = {
  AWS: "AWS S3",
  AZURE: "Azure Blob",
  GCP: "GCP Storage",
  OCI: "OCI Object",
};

export function Dashboard() {
  const { data: health } = useQuery({
    queryKey: ["cloud-health"],
    queryFn: () => api.getCloudHealth(),
    refetchInterval: 30_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.getStats(),
    refetchInterval: 15_000,
  });

  const { data: recent } = useQuery({
    queryKey: ["documents", "recent"],
    queryFn: () =>
      api.listDocuments({
        page: 0,
        size: 4,
        sort: "createdAt",
        direction: "desc",
      }),
  });

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.getMe(),
  });

  const uploadTrend = stats?.uploadsByDay.map((d) => d.count) ?? [];
  const maxCloudBytes = Math.max(
    1,
    ...CLOUDS.map((c) => stats?.perCloud?.[c]?.bytes ?? 0),
  );

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{user?.displayName ? `, ${user.displayName}` : ""}
          </h1>
          <p className="text-small text-content-secondary">
            Drop a file anywhere to replicate it across all four clouds.
          </p>
        </div>
        <Link to="/library" className="btn-ghost">
          Browse library <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Documents"
          value={stats?.documentCount ?? 0}
          icon={FileStack}
          points={uploadTrend}
        />
        <StatCard
          label="Cloud replicas"
          value={stats?.replicaCount ?? 0}
          icon={Zap}
          points={uploadTrend.map((c) => c * 4)}
        />
        <StatCard
          label="Storage used"
          value={stats?.totalBytes ?? 0}
          format={formatBytes}
          icon={HardDrive}
        />
        <StatCard
          label="AI analysed"
          value={stats?.analysedCount ?? 0}
          icon={Sparkles}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <UploadZone />

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-edge px-3 py-2">
            <h2 className="text-caption uppercase tracking-wide text-content-muted">
              Replication topology
            </h2>
            <Link
              to="/clouds"
              className="text-caption text-brand-light hover:underline"
            >
              Details
            </Link>
          </div>
          <div className="h-[260px] p-2">
            <TopologyGraph status={health} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-small font-semibold uppercase tracking-wide text-content-secondary">
          Storage by provider
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {CLOUDS.map((cloud) => {
            const status = health?.[cloud];
            const usage = stats?.perCloud?.[cloud];
            const pct = ((usage?.bytes ?? 0) / maxCloudBytes) * 100;
            return (
              <div key={cloud} className="card-interactive p-3">
                <div className="flex items-center justify-between">
                  <CloudDot
                    cloud={cloud}
                    status={status?.status ?? "CHECKING"}
                  />
                  <span className="font-mono text-caption text-content-muted">
                    {status?.latencyMs ?? "–"}ms
                  </span>
                </div>
                <p className="mt-2 text-caption text-content-muted">
                  {CLOUD_LABEL[cloud]}
                </p>
                <p className="text-lg font-semibold text-content-primary">
                  {formatBytes(usage?.bytes ?? 0)}
                </p>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-edge-subtle">
                  <div
                    className="h-full rounded-full bg-brand transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1 text-caption text-content-muted">
                  {usage?.objects ?? 0} replicated
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-small font-semibold uppercase tracking-wide text-content-secondary">
            Recent documents
          </h2>
          <Link
            to="/library"
            className="inline-flex items-center gap-1 text-small text-brand-light hover:underline"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recent?.content.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No documents yet"
            description="Drop a file above and NexusFlow will store it across AWS, Azure, GCP and OCI, then analyse it with a local LLM."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {recent?.content.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
