import { cn } from "@/lib/utils";
import type { CloudProvider, ServiceStatus } from "@/types";

const DOT_COLOR: Record<CloudProvider, string> = {
  AWS: "bg-cloud-aws",
  AZURE: "bg-cloud-azure",
  GCP: "bg-cloud-gcp",
  OCI: "bg-cloud-oci",
};

interface CloudDotProps {
  cloud: CloudProvider;
  status?: ServiceStatus;
  showLabel?: boolean;
  className?: string;
}

export function CloudDot({
  cloud,
  status = "UP",
  showLabel = true,
  className,
}: Readonly<CloudDotProps>) {
  const statusColor =
    {
      UP: DOT_COLOR[cloud],
      CHECKING: "bg-amber-500",
      DOWN: "bg-content-muted",
    }[status] ?? "bg-content-muted";

  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      title={`${cloud} — ${status}`}
    >
      <span
        className={cn(
          "inline-block h-2 w-2 rounded-full",
          statusColor,
          status === "UP" && "animate-pulse",
        )}
      />
      {showLabel && (
        <span className="text-caption text-content-secondary">{cloud}</span>
      )}
    </span>
  );
}
