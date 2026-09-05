import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { api } from "@/api/client";
import { UploadZone } from "@/components/upload/UploadZone";
import { DocumentCard } from "@/components/documents/DocumentCard";
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

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-small text-content-secondary">
          Drop a file to replicate it across all four clouds.
        </p>
      </header>

      <UploadZone />

      <section className="space-y-3">
        <h2 className="text-small font-semibold uppercase tracking-wide text-content-secondary">
          Storage overview
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {CLOUDS.map((cloud) => {
            const status = health?.[cloud];
            return (
              <div key={cloud} className="card space-y-2 p-3">
                <CloudDot cloud={cloud} status={status?.status ?? "CHECKING"} />
                <p className="text-caption text-content-muted">
                  {CLOUD_LABEL[cloud]}
                </p>
                <p className="text-lg font-semibold text-content-primary">
                  {formatBytes((status?.objectCount ?? 0) * 17_000)}
                </p>
                <p className="text-caption text-content-muted">
                  {status?.objectCount ?? 0} objects ·{" "}
                  {status?.latencyMs ?? "–"}ms
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {recent?.content.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      </section>
    </div>
  );
}
