import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { api } from "@/api/client";
import { useUploadStore } from "@/stores/uploadStore";
import { relativeTime } from "@/lib/utils";

export function ActivitySidebar() {
  const items = useUploadStore((s) => s.items);

  const { data: events } = useQuery({
    queryKey: ["events", "sidebar"],
    queryFn: () => api.getRecentEvents(12),
    refetchInterval: 5_000,
  });

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.getMe(),
  });

  const processing = items.filter(
    (i) => i.status === "PROCESSING" || i.status === "UPLOADING",
  ).length;
  const done = items.filter((i) => i.status === "READY").length;

  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-5 border-l border-edge bg-surface/50 p-4 xl:flex">
      <section className="space-y-2">
        <h2 className="text-caption uppercase tracking-wide text-content-muted">
          Recent activity
        </h2>
        <ul className="space-y-1.5">
          {(events ?? []).slice(0, 6).map((event) => (
            <li
              key={`${event.documentId}-${event.eventType}-${event.createdAt}`}
              className="flex items-start gap-2"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <div className="min-w-0">
                <p className="truncate text-caption text-content-primary">
                  {event.message ?? event.eventType}
                </p>
                <p className="text-caption text-content-muted">
                  {event.eventType.replaceAll("_", " ").toLowerCase()} ·{" "}
                  {relativeTime(event.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-caption uppercase tracking-wide text-content-muted">
          AI queue
        </h2>
        <div className="card space-y-1.5 p-2.5">
          <div className="flex items-center gap-2 text-caption text-content-secondary">
            <Loader2 className="h-3.5 w-3.5 text-brand-light" />
            {processing} processing
          </div>
          <div className="flex items-center gap-2 text-caption text-content-secondary">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
            {done} complete
          </div>
        </div>
      </section>

      {user && (
        <section className="mt-auto space-y-2">
          <h2 className="text-caption uppercase tracking-wide text-content-muted">
            Storage
          </h2>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-edge-subtle">
            <div
              className="h-full rounded-full bg-brand"
              style={{
                width: `${Math.min(100, (user.storageUsedBytes / user.storageLimitBytes) * 100)}%`,
              }}
            />
          </div>
          <p className="text-caption text-content-muted">
            {(user.storageUsedBytes / 1024 ** 2).toFixed(0)} MB of{" "}
            {(user.storageLimitBytes / 1024 ** 3).toFixed(0)} GB
          </p>
        </section>
      )}
    </aside>
  );
}
