import { Sparkles, RefreshCw } from "lucide-react";
import type { DocumentStatus } from "@/types";

interface AiSummaryCardProps {
  summary: string | null;
  status: DocumentStatus;
}

export function AiSummaryCard({
  summary,
  status,
}: Readonly<AiSummaryCardProps>) {
  if (status === "PROCESSING" || status === "UPLOADING") {
    return (
      <div className="card space-y-2 p-3">
        <Header />
        <div className="space-y-1.5">
          <div className="skeleton h-3 w-full" />
          <div className="skeleton h-3 w-[92%]" />
          <div className="skeleton h-3 w-[70%]" />
        </div>
      </div>
    );
  }

  if (status === "FAILED" || !summary) {
    return (
      <div className="card space-y-2 border-red-500/30 p-3">
        <Header />
        <p className="text-small text-content-secondary">
          {status === "FAILED"
            ? "AI analysis failed for this document."
            : "No summary available."}
        </p>
        <button type="button" className="btn-ghost">
          <RefreshCw className="h-3.5 w-3.5" />
          Re-analyse
        </button>
      </div>
    );
  }

  return (
    <div className="relative space-y-2 rounded-xl border border-brand/30 bg-gradient-to-br from-brand/10 to-transparent p-3">
      <Header />
      <p className="text-small leading-relaxed text-content-primary">
        {summary}
      </p>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-1.5">
      <Sparkles className="h-3.5 w-3.5 text-brand-light" />
      <h3 className="text-caption font-semibold uppercase tracking-wide text-content-secondary">
        AI Summary
      </h3>
    </div>
  );
}
