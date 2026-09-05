import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import type { CloudProvider, DocumentDto, DocumentStatus } from "@/types";
import { formatBytes, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { CloudDot } from "@/components/ui/CloudDot";
import { FileTypeIcon } from "@/components/ui/FileTypeIcon";
import { Spinner } from "@/components/ui/Spinner";

const CLOUD_KEYS: Array<
  [CloudProvider, keyof DocumentDto["storageLocations"]]
> = [
  ["AWS", "awsS3Url"],
  ["AZURE", "azureBlobUrl"],
  ["GCP", "gcpStorageUrl"],
  ["OCI", "ociObjectUrl"],
];

function StatusIndicator({ status }: Readonly<{ status: DocumentStatus }>) {
  if (status === "READY") return <Check className="h-4 w-4 text-green-400" />;
  if (status === "PROCESSING") return <Spinner />;
  return <Badge variant={status} />;
}

export function DocumentRow({
  document: doc,
}: Readonly<{ document: DocumentDto }>) {
  return (
    <Link
      to={`/documents/${doc.id}`}
      className="grid grid-cols-[1fr_100px_80px_120px_80px_40px] items-center gap-3 border-b border-edge-subtle px-3 py-2.5 transition-colors hover:bg-surface-raised"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-brand-light">
          <FileTypeIcon document={doc} className="h-4 w-4" />
        </span>
        <span className="truncate text-small text-content-primary">
          {doc.fileName}
        </span>
      </div>

      <div>{doc.documentType && <Badge variant={doc.documentType} />}</div>

      <span className="text-caption text-content-secondary">
        {formatBytes(doc.fileSizeBytes)}
      </span>

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
        {formatDate(doc.createdAt)}
      </span>

      <div className="flex justify-end">
        <StatusIndicator status={doc.status} />
      </div>
    </Link>
  );
}
