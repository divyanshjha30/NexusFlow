import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadStore } from "@/stores/uploadStore";
import { UploadProgress } from "./UploadProgress";

const MAX_SIZE = 100 * 1024 * 1024;

export function UploadZone() {
  const items = useUploadStore((s) => s.items);
  const addFiles = useUploadStore((s) => s.addFiles);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length) void addFiles(accepted);
    },
    [addFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX_SIZE,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-all",
          isDragActive
            ? "border-brand bg-brand/5"
            : "border-edge bg-surface/50 hover:border-brand/50 hover:bg-surface-raised/50",
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud
          className={cn(
            "h-8 w-8 transition-colors",
            isDragActive ? "text-brand" : "text-content-muted",
          )}
        />
        <div className="text-center">
          <p className="text-body font-medium text-content-primary">
            {isDragActive ? "Release to upload" : "Drop files here"}
          </p>
          <p className="text-small text-content-secondary">
            or click to browse — max 100MB
          </p>
        </div>
        <div className="flex items-center gap-2 text-caption text-content-muted">
          <span className="rounded border border-cloud-aws/30 bg-cloud-aws/10 px-1.5 py-0.5 text-cloud-aws">
            AWS
          </span>
          <span className="rounded border border-cloud-azure/30 bg-cloud-azure/10 px-1.5 py-0.5 text-cloud-azure">
            Azure
          </span>
          <span className="rounded border border-cloud-gcp/30 bg-cloud-gcp/10 px-1.5 py-0.5 text-cloud-gcp">
            GCP
          </span>
          <span className="rounded border border-cloud-oci/30 bg-cloud-oci/10 px-1.5 py-0.5 text-cloud-oci">
            OCI
          </span>
          <span className="ml-1">stored to all 4</span>
        </div>
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <UploadProgress key={item.documentId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
