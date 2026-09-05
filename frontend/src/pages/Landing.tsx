import { Link } from "react-router-dom";
import { Hexagon, ArrowRight } from "lucide-react";

const CLOUDS = [
  { name: "AWS", color: "text-cloud-aws", border: "border-cloud-aws/30" },
  { name: "Azure", color: "text-cloud-azure", border: "border-cloud-azure/30" },
  { name: "GCP", color: "text-cloud-gcp", border: "border-cloud-gcp/30" },
  { name: "OCI", color: "text-cloud-oci", border: "border-cloud-oci/30" },
];

export function Landing() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <ParticleBackdrop />

      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Hexagon className="h-5 w-5 fill-brand text-brand" />
          <span className="font-semibold tracking-tight">NexusFlow</span>
        </div>
        <Link to="/dashboard" className="btn-ghost">
          Sign in
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
        <div className="space-y-4">
          <Hexagon className="mx-auto h-14 w-14 fill-brand/20 text-brand" />
          <h1 className="bg-gradient-to-r from-brand via-brand-light to-purple-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
            NexusFlow
          </h1>
          <p className="mx-auto max-w-md text-body leading-relaxed text-content-secondary">
            Upload once. Stored everywhere.
            <br />
            Understood by AI. Found instantly.
          </p>
        </div>

        <Link to="/dashboard" className="btn-primary px-5 py-2.5">
          Continue with Cognito
          <ArrowRight className="h-4 w-4" />
        </Link>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {CLOUDS.map((cloud) => (
            <div
              key={cloud.name}
              className={`rounded-lg border ${cloud.border} bg-surface/60 px-4 py-2 backdrop-blur`}
            >
              <span className={`text-small font-semibold ${cloud.color}`}>
                {cloud.name}
              </span>
            </div>
          ))}
        </div>

        <p className="text-caption text-content-muted">
          Every document replicated across four clouds, analysed by a local LLM.
        </p>
      </main>
    </div>
  );
}

/** Lightweight CSS-only particle field — avoids pulling a canvas engine into the bundle. */
function ParticleBackdrop() {
  const dots = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: `${(i * 37) % 100}%`,
    top: `${(i * 53) % 100}%`,
    delay: `${(i % 10) * 0.4}s`,
    size: i % 3 === 0 ? 3 : 2,
  }));

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(99,102,241,0.12),transparent_60%)]" />
      {dots.map((dot) => (
        <span
          key={dot.id}
          className="absolute animate-pulse rounded-full bg-brand-light/40"
          style={{
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            animationDelay: dot.delay,
            animationDuration: "3s",
          }}
        />
      ))}
    </div>
  );
}
