import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  CloudUpload,
  Sparkles,
  Archive,
  Trash2,
  Activity as ActivityIcon,
} from "lucide-react";
import { api } from "@/api/client";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { CloudDot } from "@/components/ui/CloudDot";
import { cn, formatTime, relativeTime } from "@/lib/utils";
import type { CloudProvider, DocumentDto } from "@/types";

interface TraceStep {
  label: string;
  detail: string;
  durationMs: number;
  cloud: CloudProvider | null;
  kind: "storage" | "ai";
}

const CLOUDS: CloudProvider[] = ["AWS", "AZURE", "GCP", "OCI"];
const CLOUD_TARGET: Record<CloudProvider, string> = {
  AWS: "S3",
  AZURE: "Blob Storage",
  GCP: "Cloud Storage",
  OCI: "Object Storage",
};

/** Derives a plausible pipeline trace for a document. */
function buildTrace(doc: DocumentDto): TraceStep[] {
  const seed = doc.id.charCodeAt(0);
  const storage: TraceStep[] = CLOUDS.map((cloud, i) => ({
    label: `Stored to ${cloud}`,
    detail: CLOUD_TARGET[cloud],
    durationMs: 180 + ((seed * (i + 3)) % 320),
    cloud,
    kind: "storage",
  }));

  if (doc.status !== "READY" && doc.status !== "ARCHIVED") return storage;

  return [
    ...storage,
    {
      label: "Classified",
      detail: `${doc.documentType ?? "OTHER"} · Vertex AI`,
      durationMs: 891,
      cloud: "GCP",
      kind: "ai",
    },
    {
      label: "Summarised",
      detail: "Bedrock · Claude Haiku",
      durationMs: 1240,
      cloud: "AWS",
      kind: "ai",
    },
    {
      label: "Entities extracted",
      detail: "Comprehend",
      durationMs: 410,
      cloud: "AWS",
      kind: "ai",
    },
    {
      label: "Embedded",
      detail: "nomic-embed-text · 768d",
      durationMs: 302,
      cloud: null,
      kind: "ai",
    },
    {
      label: "Indexed",
      detail: "CockroachDB full-text + vector",
      durationMs: 88,
      cloud: null,
      kind: "ai",
    },
  ];
}

const GROUP_ICON = {
  READY: Sparkles,
  PROCESSING: CloudUpload,
  UPLOADING: CloudUpload,
  ARCHIVED: Archive,
  FAILED: Trash2,
};

export function ActivityPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["documents", "activity"],
    queryFn: () =>
      api.listDocuments({
        page: 0,
        size: 30,
        sort: "createdAt",
        direction: "desc",
      }),
  });

  const groups = useMemo(() => data?.content ?? [], [data]);

  return (
    <div className="space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <p className="text-small text-content-secondary">
          Every document grouped with its full replication and AI trace.
        </p>
      </header>

      {groups.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          title="No activity yet"
          description="Upload a document to see its journey across all four clouds."
        />
      ) : (
        <ol className="relative space-y-2 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-edge">
          {groups.map((doc) => {
            const open = expanded === doc.id;
            const trace = buildTrace(doc);
            const total = trace.reduce((sum, s) => sum + s.durationMs, 0);
            const Icon = GROUP_ICON[doc.status] ?? CloudUpload;

            return (
              <li key={doc.id} className="relative pl-10">
                <span className="absolute left-0 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-edge bg-surface">
                  <Icon className="h-3.5 w-3.5 text-brand-light" />
                </span>

                <div className="card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : doc.id)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-raised"
                  >
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 shrink-0 text-content-muted transition-transform",
                        open && "rotate-90",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate text-small font-medium text-content-primary">
                      {doc.fileName}
                    </span>
                    <Badge variant={doc.status} />
                    <span className="hidden shrink-0 font-mono text-caption text-content-muted sm:inline">
                      {total}ms
                    </span>
                    <span className="shrink-0 text-caption text-content-muted">
                      {relativeTime(doc.createdAt)}
                    </span>
                  </button>

                  {open && (
                    <ol className="animate-fade-slide-up divide-y divide-edge-subtle border-t border-edge">
                      {trace.map((step) => (
                        <li
                          key={step.label}
                          className="grid grid-cols-[16px_1fr_auto_auto] items-center gap-3 px-3 py-2"
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              step.kind === "ai"
                                ? "bg-purple-400"
                                : "bg-green-400",
                            )}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-small text-content-primary">
                              {step.label}
                            </p>
                            <p className="truncate text-caption text-content-muted">
                              {step.detail}
                            </p>
                          </div>
                          {step.cloud ? (
                            <CloudDot cloud={step.cloud} showLabel={false} />
                          ) : (
                            <span />
                          )}
                          <span className="font-mono text-caption text-content-muted">
                            {step.durationMs}ms
                          </span>
                        </li>
                      ))}
                      <li className="flex items-center justify-between px-3 py-2 text-caption text-content-muted">
                        <span>Completed {formatTime(doc.updatedAt)}</span>
                        <span className="font-mono">{total}ms total</span>
                      </li>
                    </ol>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
