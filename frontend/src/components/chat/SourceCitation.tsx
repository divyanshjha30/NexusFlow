import { Link } from "react-router-dom";
import { FileText, ArrowRight } from "lucide-react";
import type { SourceRef } from "@/types";

export function SourceCitation({ source }: Readonly<{ source: SourceRef }>) {
  return (
    <Link
      to={`/documents/${source.documentId}`}
      className="block rounded-lg border border-edge bg-surface p-2 transition-colors hover:border-brand/40 hover:bg-surface-raised"
    >
      <div className="flex items-center gap-1.5">
        <FileText className="h-3.5 w-3.5 shrink-0 text-brand-light" />
        <span className="truncate text-caption font-medium text-content-primary">
          {source.fileName}
        </span>
        <span className="ml-auto shrink-0 text-caption text-content-muted">
          {Math.round(source.relevanceScore * 100)}%
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-caption italic text-content-secondary">
        “{source.excerpt}”
      </p>
      <span className="mt-1 inline-flex items-center gap-1 text-caption text-brand-light">
        Open document <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}
