import type { CloudProvider, CloudStatus } from "@/types";
import { cn } from "@/lib/utils";
import { CloudDot } from "@/components/ui/CloudDot";

const BORDER: Record<string, string> = {
  UP: "border-green-500/30",
  DOWN: "border-red-500/40",
  CHECKING: "border-amber-500/30",
};

export function CloudStatusCard({
  cloud,
  status,
}: Readonly<{
  cloud: CloudProvider;
  status: CloudStatus;
}>) {
  const services = Object.entries(status.services);
  const upCount = services.filter(([, s]) => s === "UP").length;

  return (
    <div className={cn("card space-y-3 p-4", BORDER[status.status])}>
      <div className="flex items-center justify-between">
        <CloudDot cloud={cloud} status={status.status} />
        <span className="font-mono text-caption text-content-muted">
          {status.endpoint.replace("http://", "")}
        </span>
      </div>

      <ul className="space-y-1">
        {services.map(([name, state]) => (
          <li
            key={name}
            className="flex items-center justify-between text-caption"
          >
            <span className="text-content-secondary">{name}</span>
            <span
              className={state === "UP" ? "text-green-400" : "text-red-400"}
            >
              {state === "UP" ? "✓" : "✕"}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-edge-subtle pt-2 text-caption">
        <span className="text-content-muted">
          {upCount}/{services.length} services UP
        </span>
        <span className="font-mono text-content-secondary">
          {status.latencyMs}ms
        </span>
      </div>

      <div className="text-caption text-content-muted">
        {status.objectCount} objects stored
      </div>
    </div>
  );
}
