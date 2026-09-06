import { useState } from "react";
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
import { Spinner } from "@/components/ui/Spinner";
import { cn, formatTime, relativeTime } from "@/lib/utils";
import type { DocumentStatus } from "@/types";

const GROUP_ICON: Record<DocumentStatus, typeof CloudUpload> = {
  READY: Sparkles,
  PROCESSING: CloudUpload,
  UPLOADING: CloudUpload,
  ARCHIVED: Archive,
  FAILED: Trash2,
};

const AI_EVENTS = new Set([
  "AI_STARTED",
  "AI_CLASSIFIED",
  "AI_SUMMARISED",
  "AI_ENTITIES",
  "AI_EMBEDDED",
  "AI_COMPLETE",
]);

function Trace({ documentId }: Readonly<{ documentId: string }>) {
  const { data, isLoading } = useQuery({
    queryKey: ["events", documentId],
    queryFn: () => api.getDocumentEvents(documentId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-3 text-small text-content-muted">
        <Spinner /> Loading trace…
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="px-3 py-3 text-small text-content-muted">
        No recorded events for this document.
      </p>
    );
  }

  const total = data.reduce((sum, e) => sum + (e.durationMs ?? 0), 0);

  return (
    <ol className="animate-fade-slide-up divide-y divide-edge-subtle border-t border-edge">
      {data.map((step) => (
        <li
          key={`${step.eventType}-${step.createdAt}`}
          className="grid grid-cols-[16px_1fr_auto_auto] items-center gap-3 px-3 py-2"
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              AI_EVENTS.has(step.eventType) ? "bg-purple-400" : "bg-green-400",
            )}
          />
          <div className="min-w-0">
            <p className="truncate text-small text-content-primary">
              {step.eventType.replaceAll("_", " ").toLowerCase()}
            </p>
            <p className="truncate text-caption text-content-muted">
              {step.message ?? "—"}
            </p>
          </div>
          {step.cloudProvider ? (
            <CloudDot cloud={step.cloudProvider} showLabel={false} />
          ) : (
            <span />
          )}
          <span className="font-mono text-caption text-content-muted">
            {step.durationMs != null ? `${step.durationMs}ms` : "—"}
          </span>
        </li>
      ))}
      <li className="flex items-center justify-between px-3 py-2 text-caption text-content-muted">
        <span>Last event {formatTime(data[data.length - 1].createdAt)}</span>
        <span className="font-mono">{total}ms recorded</span>
      </li>
    </ol>
  );
}

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

  const groups = data?.content ?? [];

  return (
    <div className="space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <p className="text-small text-content-secondary">
          Every document with its recorded replication and AI trace.
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
                    <span className="shrink-0 text-caption text-content-muted">
                      {relativeTime(doc.createdAt)}
                    </span>
                  </button>

                  {open && <Trace documentId={doc.id} />}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
