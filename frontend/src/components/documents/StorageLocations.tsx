import { useState } from "react";
import { Check, Copy, ExternalLink, RotateCw } from "lucide-react";
import type { CloudProvider, DocumentDto } from "@/types";

const ROWS: Array<{
  cloud: CloudProvider;
  label: string;
  detail: string;
  key: keyof DocumentDto["storageLocations"];
  color: string;
}> = [
  {
    cloud: "AWS",
    label: "AWS S3",
    detail: "us-east-1",
    key: "awsS3Url",
    color: "text-cloud-aws",
  },
  {
    cloud: "AZURE",
    label: "Azure Blob",
    detail: "devstoreaccount1",
    key: "azureBlobUrl",
    color: "text-cloud-azure",
  },
  {
    cloud: "GCP",
    label: "GCP Storage",
    detail: "nexusflow-documents",
    key: "gcpStorageUrl",
    color: "text-cloud-gcp",
  },
  {
    cloud: "OCI",
    label: "OCI Object",
    detail: "nexusflow-archive",
    key: "ociObjectUrl",
    color: "text-cloud-oci",
  },
];

export function StorageLocations({
  document: doc,
}: Readonly<{ document: DocumentDto }>) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(cloud: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(cloud);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <ul className="space-y-1">
      {ROWS.map(({ cloud, label, detail, key, color }) => {
        const url = doc.storageLocations[key] as string | null;
        return (
          <li
            key={cloud}
            className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
              url
                ? "border-edge-subtle bg-surface"
                : "border-red-500/20 bg-red-500/5"
            }`}
          >
            {url ? (
              <Check className={`h-3.5 w-3.5 shrink-0 ${color}`} />
            ) : (
              <RotateCw className="h-3.5 w-3.5 shrink-0 text-red-400" />
            )}

            <div className="min-w-0 flex-1">
              <p className="text-caption font-medium text-content-primary">
                {label}
              </p>
              <p className="truncate text-caption text-content-muted">
                {detail}
              </p>
            </div>

            {url ? (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => void copy(cloud, url)}
                  className="rounded p-1 text-content-muted hover:bg-surface-raised hover:text-content-primary"
                  title="Copy URL"
                >
                  {copied === cloud ? (
                    <Check className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded p-1 text-content-muted hover:bg-surface-raised hover:text-content-primary"
                  title="Open"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              <button
                type="button"
                className="shrink-0 text-caption text-red-400 hover:underline"
              >
                Retry
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
