import { Check, AlertCircle } from "lucide-react";
import type { UploadItem, CloudProvider } from "@/types";
import { formatBytes, cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { CloudDot } from "@/components/ui/CloudDot";

const CLOUDS: CloudProvider[] = ["AWS", "AZURE", "GCP", "OCI"];

export function UploadProgress({ item }: Readonly<{ item: UploadItem }>) {
  const done = item.status === "READY";
  const failed = item.status === "FAILED";

  return (
    <div
      className={cn(
        "card animate-fade-slide-up space-y-2 p-3",
        item.status === "PROCESSING" && "animate-processing",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-small font-medium text-content-primary">
            {item.fileName}
          </span>
          <span className="shrink-0 text-caption text-content-muted">
            {formatBytes(item.fileSizeBytes)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {done && <Check className="h-4 w-4 text-green-400" />}
          {failed && <AlertCircle className="h-4 w-4 text-red-400" />}
          {!done && !failed && <Spinner />}
          {item.documentType && <Badge variant={item.documentType} />}
        </div>
      </div>

      <ProgressBar clouds={item.clouds} />

      <div className="flex items-center gap-3">
        {CLOUDS.map((cloud) => (
          <CloudDot
            key={cloud}
            cloud={cloud}
            status={item.clouds[cloud] ? "UP" : "DOWN"}
          />
        ))}
        <span className="ml-auto text-caption text-content-muted">
          {item.progress}%
        </span>
      </div>
    </div>
  );
}
