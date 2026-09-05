import { Link } from "react-router-dom";
import type { CloudProvider, DocumentDto } from "@/types";
import { formatBytes, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { CloudDot } from "@/components/ui/CloudDot";
import { FileTypeIcon } from "@/components/ui/FileTypeIcon";

const CLOUD_KEYS: Array<
  [CloudProvider, keyof DocumentDto["storageLocations"]]
> = [
  ["AWS", "awsS3Url"],
  ["AZURE", "azureBlobUrl"],
  ["GCP", "gcpStorageUrl"],
  ["OCI", "ociObjectUrl"],
];

export function DocumentCard({
  document: doc,
}: Readonly<{ document: DocumentDto }>) {
  return (
    <Link
      to={`/documents/${doc.id}`}
      className="card group flex animate-fade-slide-up flex-col gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
    >
      <div className="flex items-start justify-between">
        <span className="rounded-lg bg-surface-raised p-2 text-brand-light">
          <FileTypeIcon document={doc} />
        </span>
        <Badge variant={doc.status} />
      </div>

      <div className="min-w-0">
        <p
          className="truncate text-small font-medium text-content-primary"
          title={doc.fileName}
        >
          {doc.fileName}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {doc.documentType && <Badge variant={doc.documentType} />}
          {doc.sentiment && <Badge variant={doc.sentiment} />}
        </div>
      </div>

      <p className="line-clamp-3 min-h-[3.5rem] text-caption leading-relaxed text-content-secondary">
        {doc.summary ??
          (doc.status === "PROCESSING"
            ? "AI analysis in progress…"
            : "No summary available.")}
      </p>

      <div className="flex flex-wrap gap-1">
        {doc.aiTags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded bg-brand-dim/30 px-1.5 py-0.5 text-caption text-brand-light"
          >
            #{tag}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-edge-subtle pt-2">
        <div className="flex items-center gap-1.5">
          {CLOUD_KEYS.map(([cloud, key]) => (
            <CloudDot
              key={cloud}
              cloud={cloud}
              status={doc.storageLocations[key] ? "UP" : "DOWN"}
              showLabel={false}
            />
          ))}
        </div>
        <span className="text-caption text-content-muted">
          {formatBytes(doc.fileSizeBytes)} · {formatDate(doc.createdAt)}
        </span>
      </div>
    </Link>
  );
}
