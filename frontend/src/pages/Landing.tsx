import { Link } from "react-router-dom";
import {
  Hexagon,
  ArrowRight,
  Sparkles,
  Shield,
  Search,
  Zap,
} from "lucide-react";

const CLOUDS = [
  { name: "AWS", color: "text-cloud-aws", border: "border-cloud-aws/30" },
  { name: "Azure", color: "text-cloud-azure", border: "border-cloud-azure/30" },
  { name: "GCP", color: "text-cloud-gcp", border: "border-cloud-gcp/30" },
  { name: "OCI", color: "text-cloud-oci", border: "border-cloud-oci/30" },
];

const FEATURES = [
  {
    icon: Zap,
    title: "Replicated instantly",
    body: "Every upload fans out to four clouds in parallel over Kafka.",
  },
  {
    icon: Sparkles,
    title: "Understood by AI",
    body: "Classified, summarised and tagged by a local LLM within seconds.",
  },
  {
    icon: Search,
    title: "Found in a keystroke",
    body: "Hybrid keyword and vector search over everything you own.",
  },
  {
    icon: Shield,
    title: "Audited end to end",
    body: "Every access recorded to an immutable compliance stream.",
  },
];

export function Landing() {
  return (
    <div className="relative h-full overflow-y-auto">
      <div className="pointer-events-none absolute inset-0 grid-lines" />

      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Hexagon className="h-5 w-5 fill-brand text-brand" />
          <span className="font-semibold tracking-tight">NexusFlow</span>
        </div>
        <Link to="/dashboard" className="btn-ghost">
          Sign in
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-10 px-6 py-16 text-center">
        <span className="chip animate-fade-slide-up">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          <span>Multi-cloud · event-driven · AI-native</span>
        </span>

        <div className="space-y-4">
          <Hexagon className="mx-auto h-16 w-16 animate-float fill-brand/20 text-brand" />
          <h1 className="text-gradient text-5xl font-bold tracking-tight">
            NexusFlow
          </h1>
          <p className="mx-auto max-w-lg text-base leading-relaxed text-content-secondary">
            Upload once. Stored everywhere. Understood by AI. Found instantly.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/dashboard" className="btn-primary px-5 py-2.5">
            Continue with Cognito
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/clouds" className="btn-ghost px-5 py-2.5">
            View live topology
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {CLOUDS.map((cloud) => (
            <div
              key={cloud.name}
              className={`card-glass px-5 py-2.5 ${cloud.border}`}
            >
              <span className={`text-small font-semibold ${cloud.color}`}>
                {cloud.name}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card-interactive p-4">
              <Icon className="h-5 w-5 text-brand-light" />
              <p className="mt-2 text-small font-semibold text-content-primary">
                {title}
              </p>
              <p className="mt-1 text-caption leading-relaxed text-content-secondary">
                {body}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
