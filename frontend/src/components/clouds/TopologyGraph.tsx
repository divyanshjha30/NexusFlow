import type { CloudProvider, CloudStatus } from "@/types";

const NODES: Array<{
  cloud: CloudProvider;
  x: number;
  y: number;
  color: string;
  label: string;
}> = [
  { cloud: "AWS", x: 90, y: 60, color: "#ff9900", label: "S3" },
  { cloud: "AZURE", x: 310, y: 60, color: "#0078d4", label: "Blob" },
  { cloud: "GCP", x: 90, y: 200, color: "#4285f4", label: "GCS" },
  { cloud: "OCI", x: 310, y: 200, color: "#c74634", label: "Object" },
];

const HUB = { x: 200, y: 130 };

/** Radial topology with packets animating from the hub out to each cloud. */
export function TopologyGraph({
  status,
}: Readonly<{ status?: Record<CloudProvider, CloudStatus> }>) {
  return (
    <svg
      viewBox="0 0 400 260"
      className="h-full w-full"
      role="img"
      aria-label="Multi-cloud replication topology"
    >
      <defs>
        <radialGradient id="hubGlow">
          <stop offset="0%" stopColor="rgb(var(--brand))" stopOpacity="0.55" />
          <stop offset="100%" stopColor="rgb(var(--brand))" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx={HUB.x} cy={HUB.y} r="60" fill="url(#hubGlow)" />

      {NODES.map((node) => {
        const up = status?.[node.cloud]?.status !== "DOWN";
        return (
          <g key={`link-${node.cloud}`}>
            <line
              x1={HUB.x}
              y1={HUB.y}
              x2={node.x}
              y2={node.y}
              stroke="rgb(var(--edge))"
              strokeWidth="1.5"
            />
            {up && (
              <line
                x1={HUB.x}
                y1={HUB.y}
                x2={node.x}
                y2={node.y}
                stroke={node.color}
                strokeWidth="2"
                strokeDasharray="4 12"
                strokeLinecap="round"
                className="animate-dash"
                opacity="0.9"
              />
            )}
          </g>
        );
      })}

      <g>
        <circle
          cx={HUB.x}
          cy={HUB.y}
          r="26"
          fill="rgb(var(--surface))"
          stroke="rgb(var(--brand))"
          strokeWidth="1.5"
        />
        <text
          x={HUB.x}
          y={HUB.y - 1}
          textAnchor="middle"
          fontSize="9"
          fontWeight="600"
          fill="rgb(var(--text-1))"
        >
          Nexus
        </text>
        <text
          x={HUB.x}
          y={HUB.y + 10}
          textAnchor="middle"
          fontSize="7"
          fill="rgb(var(--text-3))"
        >
          Kafka
        </text>
      </g>

      {NODES.map((node) => {
        const info = status?.[node.cloud];
        const up = info?.status !== "DOWN";
        return (
          <g key={node.cloud}>
            <circle
              cx={node.x}
              cy={node.y}
              r="30"
              fill="rgb(var(--surface))"
              stroke={up ? node.color : "rgb(var(--edge))"}
              strokeWidth="1.5"
            />
            <circle
              cx={node.x}
              cy={node.y}
              r="30"
              fill={node.color}
              opacity="0.08"
            />
            <text
              x={node.x}
              y={node.y - 3}
              textAnchor="middle"
              fontSize="9"
              fontWeight="700"
              fill={node.color}
            >
              {node.cloud}
            </text>
            <text
              x={node.x}
              y={node.y + 8}
              textAnchor="middle"
              fontSize="7"
              fill="rgb(var(--text-3))"
            >
              {info?.objectCount ?? 0} obj
            </text>
            <text
              x={node.x}
              y={node.y + 45}
              textAnchor="middle"
              fontSize="7"
              fill="rgb(var(--text-3))"
            >
              {node.label} · {info?.latencyMs ?? "–"}ms
            </text>
          </g>
        );
      })}
    </svg>
  );
}
