import { cn } from "@/lib/utils";
import type { CloudProvider } from "@/types";

const SEGMENTS: Array<{ cloud: CloudProvider; color: string }> = [
  { cloud: "AWS", color: "bg-cloud-aws" },
  { cloud: "AZURE", color: "bg-cloud-azure" },
  { cloud: "GCP", color: "bg-cloud-gcp" },
  { cloud: "OCI", color: "bg-cloud-oci" },
];

interface ProgressBarProps {
  clouds: Record<CloudProvider, boolean>;
  className?: string;
}

/** Four segments, one per cloud, filling left-to-right as each confirms. */
export function ProgressBar({ clouds, className }: Readonly<ProgressBarProps>) {
  return (
    <div className={cn("flex h-1.5 w-full gap-0.5", className)}>
      {SEGMENTS.map(({ cloud, color }) => (
        <div
          key={cloud}
          className="h-full flex-1 overflow-hidden rounded-full bg-edge-subtle"
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              clouds[cloud] ? `w-full ${color}` : "w-0",
            )}
          />
        </div>
      ))}
    </div>
  );
}
