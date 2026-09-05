import type { CloudEvent } from "@/types";
import { formatTime } from "@/lib/utils";
import { CloudDot } from "@/components/ui/CloudDot";

const EVENT_COLOR: Record<string, string> = {
  FILE_STORED: "text-green-400",
  FILE_UPLOADED: "text-brand-light",
  AI_CLASSIFIED: "text-purple-400",
  AI_SUMMARISED: "text-purple-400",
  AI_COMPLETE: "text-green-400",
  FAILED: "text-red-400",
};

export function EventFeed({ events }: Readonly<{ events: CloudEvent[] }>) {
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
          key={event.id}
          className="grid animate-slide-in-right grid-cols-[70px_130px_1fr_90px_60px] items-center gap-2 px-3 py-1.5"
        >
          <span className="text-content-muted">
            {formatTime(event.timestamp)}
          </span>
          <span
            className={EVENT_COLOR[event.eventType] ?? "text-content-secondary"}
          >
            {event.eventType}
          </span>
          <span className="truncate text-content-secondary">
            {event.fileName} <span className="text-content-muted">→</span>{" "}
            {event.target}
          </span>
          <span className="text-right text-content-muted">
            {event.durationMs}ms
          </span>
          <span className="flex justify-end">
            {event.cloud && <CloudDot cloud={event.cloud} showLabel={false} />}
          </span>
        </li>
      ))}
    </ul>
  );
}
