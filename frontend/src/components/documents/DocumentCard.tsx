import { Link } from "react-router-dom";
import { Check, Download, Share2 } from "lucide-react";
import type { CloudProvider, DocumentDto } from "@/types";
import { formatBytes, formatDate, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { CloudDot } from "@/components/ui/CloudDot";
import { FileTypeIcon } from "@/components/ui/FileTypeIcon";
import { toast } from "@/stores/toastStore";

const CLOUD_KEYS: Array<
  [CloudProvider, keyof DocumentDto["storageLocations"]]
> = [
  ["AWS", "awsS3Url"],
  ["AZURE", "azureBlobUrl"],
  ["GCP", "gcpStorageUrl"],
  ["OCI", "ociObjectUrl"],
];

interface DocumentCardProps {
  document: DocumentDto;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function DocumentCard({
  document: doc,
  selected = false,
  onToggleSelect,
}: Readonly<DocumentCardProps>) {
  return (
    <div
      className={cn(
        "card-interactive group flex animate-fade-slide-up flex-col gap-3 p-4",
        selected && "border-brand ring-1 ring-brand",
        doc.status === "PROCESSING" && "animate-processing",
      )}
    >
      {onToggleSelect && (
        <button
          type="button"
          onClick={onToggleSelect}
          aria-label={selected ? "Deselect document" : "Select document"}
          className={cn(
            "absolute left-3 top-3 z-10 flex h-4 w-4 items-center justify-center rounded border transition-all",
            selected
              ? "border-brand bg-brand text-white"
              : "border-edge bg-surface opacity-0 group-hover:opacity-100",
          )}
        >
          {selected && <Check className="h-3 w-3" />}
        </button>
      )}

      <div className="flex items-start justify-between">
        <span className="rounded-lg bg-surface-raised p-2 text-brand-light transition-transform group-hover:scale-105">
          <FileTypeIcon document={doc} />
        </span>
        <Badge variant={doc.status} />
      </div>

      <Link to={`/documents/${doc.id}`} className="min-w-0 space-y-1">
        <p
          className="truncate text-small font-medium text-content-primary"
          title={doc.fileName}
        >
          {doc.fileName}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {doc.documentType && <Badge variant={doc.documentType} />}
          {doc.sentiment && <Badge variant={doc.sentiment} />}
        </div>
      </Link>

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
            className="rounded bg-brand/15 px-1.5 py-0.5 text-caption text-brand-light"
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

        <span className="text-caption text-content-muted transition-opacity group-hover:opacity-0">
          {formatBytes(doc.fileSizeBytes)} · {formatDate(doc.createdAt)}
        </span>

        <div className="absolute bottom-3 right-3 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            aria-label="Download"
            onClick={() => toast.success("Download started", doc.fileName)}
            className="rounded p-1 text-content-muted hover:bg-surface-raised hover:text-content-primary"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Share"
            onClick={() => toast.info("Share link copied", doc.fileName)}
            className="rounded p-1 text-content-muted hover:bg-surface-raised hover:text-content-primary"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
