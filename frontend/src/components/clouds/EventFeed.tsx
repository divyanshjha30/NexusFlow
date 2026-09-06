import type { DocumentEvent } from "@/types";
import { formatTime } from "@/lib/utils";
import { CloudDot } from "@/components/ui/CloudDot";

const EVENT_COLOR: Record<string, string> = {
  STORED_AWS: "text-green-400",
  STORED_AZURE: "text-green-400",
  STORED_GCP: "text-green-400",
  STORED_OCI: "text-green-400",
  AI_STARTED: "text-brand-light",
  AI_CLASSIFIED: "text-purple-400",
  AI_SUMMARISED: "text-purple-400",
  AI_ENTITIES: "text-purple-400",
  AI_EMBEDDED: "text-purple-400",
  AI_COMPLETE: "text-green-400",
  FAILED: "text-red-400",
};

export function EventFeed({ events }: Readonly<{ events: DocumentEvent[] }>) {
  if (events.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-small text-content-muted">
        No events yet. Upload a document to see live activity.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-edge-subtle font-mono text-caption">
      {events.map((event) => (
        <li
          key={`${event.documentId}-${event.eventType}-${event.createdAt}`}
          className="grid animate-slide-in-right grid-cols-[70px_130px_1fr_70px_50px] items-center gap-2 px-3 py-1.5"
        >
          <span className="text-content-muted">
            {formatTime(event.createdAt)}
          </span>
          <span
            className={EVENT_COLOR[event.eventType] ?? "text-content-secondary"}
          >
            {event.eventType}
          </span>
          <span className="truncate text-content-secondary">
            {event.message ?? "—"}
          </span>
          <span className="text-right text-content-muted">
            {event.durationMs != null ? `${event.durationMs}ms` : ""}
          </span>
          <span className="flex justify-end">
            {event.cloudProvider && (
              <CloudDot cloud={event.cloudProvider} showLabel={false} />
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
