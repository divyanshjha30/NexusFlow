import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Share2, Archive } from "lucide-react";
import { api } from "@/api/client";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { FileTypeIcon } from "@/components/ui/FileTypeIcon";
import { AiSummaryCard } from "@/components/documents/AiSummaryCard";
import { TagEditor } from "@/components/documents/TagEditor";
import { EntityList } from "@/components/documents/EntityList";
import { StorageLocations } from "@/components/documents/StorageLocations";
import { formatBytes, formatDate } from "@/lib/utils";

export function DocumentDetail() {
  const { id = "" } = useParams();
  const {
    data: doc,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["documents", id],
    queryFn: () => api.getDocument(id),
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (isError || !doc) {
    return (
      <div className="p-6">
        <p className="card p-8 text-center text-small text-content-muted">
          Document not found.{" "}
          <Link to="/library" className="text-brand-light hover:underline">
            Back to library
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <Link
        to="/library"
        className="inline-flex items-center gap-1 text-small text-content-secondary hover:text-content-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to library
      </Link>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="card flex min-h-[420px] flex-col items-center justify-center gap-3 p-6">
          <span className="rounded-xl bg-surface-raised p-4 text-brand-light">
            <FileTypeIcon document={doc} className="h-10 w-10" />
          </span>
          <p className="text-small text-content-secondary">
            Preview not available in demo mode
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn-primary">
              <Download className="h-3.5 w-3.5" /> Download
            </button>
            <button type="button" className="btn-ghost">
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
            <button type="button" className="btn-ghost">
              <Archive className="h-3.5 w-3.5" /> Archive
            </button>
          </div>

          {doc.extractedText && (
            <div className="mt-4 w-full space-y-1">
              <h3 className="text-caption uppercase tracking-wide text-content-muted">
                Extracted text
              </h3>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-edge-subtle bg-canvas p-3 font-mono text-caption text-content-secondary">
                {doc.extractedText}
              </pre>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="space-y-1">
            <h1 className="break-words text-lg font-semibold tracking-tight">
              {doc.fileName}
            </h1>
            <p className="text-caption text-content-muted">
              {formatBytes(doc.fileSizeBytes)} · {doc.mimeType} ·{" "}
              {formatDate(doc.createdAt)}
            </p>
            <div className="flex flex-wrap gap-1 pt-1">
              <Badge variant={doc.status} />
              {doc.documentType && <Badge variant={doc.documentType} />}
              {doc.sentiment && <Badge variant={doc.sentiment} />}
              {doc.confidenceScore !== null && (
                <span className="text-caption text-content-muted">
                  {(doc.confidenceScore * 100).toFixed(1)}% confidence
                </span>
              )}
            </div>
          </div>

          <AiSummaryCard summary={doc.summary} status={doc.status} />

          <section className="space-y-2">
            <h2 className="text-caption uppercase tracking-wide text-content-muted">
              Tags
            </h2>
            <TagEditor aiTags={doc.aiTags} />
          </section>

          <section className="space-y-2">
            <h2 className="text-caption uppercase tracking-wide text-content-muted">
              Entities
            </h2>
            <EntityList entities={doc.entities} />
          </section>

          <section className="space-y-2">
            <h2 className="text-caption uppercase tracking-wide text-content-muted">
              Storage
            </h2>
            <StorageLocations document={doc} />
          </section>
        </aside>
      </div>
    </div>
  );
}
