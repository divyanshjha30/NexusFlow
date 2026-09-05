import { useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { GitCompare, ArrowLeftRight, Minus, Plus } from "lucide-react";
import { api } from "@/api/client";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileTypeIcon } from "@/components/ui/FileTypeIcon";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import type { DocumentDto } from "@/types";

type Side = "a" | "b";

function DocPicker({
  side,
  documents,
  value,
  onChange,
}: Readonly<{
  side: Side;
  documents: DocumentDto[];
  value: string;
  onChange: (side: Side, id: string) => void;
}>) {
  return (
    <select
      className="input"
      value={value}
      onChange={(e) => onChange(side, e.target.value)}
      aria-label={`Document ${side.toUpperCase()}`}
    >
      <option value="">Select a document…</option>
      {documents.map((doc) => (
        <option key={doc.id} value={doc.id}>
          {doc.fileName}
        </option>
      ))}
    </select>
  );
}

/** Renders a field on both sides, highlighting when the values differ. */
function CompareRow({
  label,
  left,
  right,
}: Readonly<{ label: string; left: string; right: string }>) {
  const differs = left !== right;
  return (
    <div className="grid grid-cols-[130px_1fr_1fr] gap-3 border-b border-edge-subtle px-3 py-2 text-small last:border-0">
      <span className="text-caption text-content-muted">{label}</span>
      <span
        className={cn(
          "min-w-0 break-words",
          differs ? "text-content-primary" : "text-content-secondary",
        )}
      >
        {left || "—"}
      </span>
      <span
        className={cn(
          "min-w-0 break-words",
          differs ? "text-content-primary" : "text-content-secondary",
        )}
      >
        {right || "—"}
      </span>
    </div>
  );
}

function EntityDiff({ a, b }: Readonly<{ a: DocumentDto; b: DocumentDto }>) {
  const keys = Array.from(
    new Set([...Object.keys(a.entities), ...Object.keys(b.entities)]),
  );

  if (keys.length === 0) {
    return (
      <p className="px-3 py-3 text-small text-content-muted">
        Neither document has extracted entities.
      </p>
    );
  }

  return (
    <div className="divide-y divide-edge-subtle">
      {keys.map((key) => {
        const left = new Set(a.entities[key] ?? []);
        const right = new Set(b.entities[key] ?? []);
        const all = Array.from(new Set([...left, ...right]));

        return (
          <div key={key} className="px-3 py-2">
            <p className="mb-1 text-caption uppercase tracking-wide text-content-muted">
              {key}
            </p>
            <div className="flex flex-wrap gap-1">
              {all.map((value) => {
                const inLeft = left.has(value);
                const inRight = right.has(value);
                const shared = inLeft && inRight;
                return (
                  <span
                    key={value}
                    className={cn(
                      "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-caption",
                      shared && "bg-surface-raised text-content-secondary",
                      !shared &&
                        inLeft &&
                        "bg-red-500/15 text-red-400 line-through",
                      !shared && inRight && "bg-green-500/15 text-green-400",
                    )}
                  >
                    {!shared &&
                      (inLeft ? (
                        <Minus className="h-3 w-3" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      ))}
                    {value}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DocHeader({ doc }: Readonly<{ doc: DocumentDto }>) {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-lg bg-surface-raised p-1.5 text-brand-light">
        <FileTypeIcon document={doc} className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <Link
          to={`/documents/${doc.id}`}
          className="block truncate text-small font-medium text-content-primary hover:underline"
        >
          {doc.fileName}
        </Link>
        <div className="mt-0.5 flex gap-1">
          {doc.documentType && <Badge variant={doc.documentType} />}
          <Badge variant={doc.status} />
        </div>
      </div>
    </div>
  );
}

export function Compare() {
  const [params, setParams] = useSearchParams();

  const { data } = useQuery({
    queryKey: ["documents", "compare"],
    queryFn: () =>
      api.listDocuments({
        page: 0,
        size: 50,
        sort: "createdAt",
        direction: "desc",
      }),
  });

  const documents = useMemo(() => data?.content ?? [], [data]);
  const idA = params.get("a") ?? "";
  const idB = params.get("b") ?? "";
  const docA = documents.find((d) => d.id === idA);
  const docB = documents.find((d) => d.id === idB);

  function pick(side: Side, id: string) {
    const next = new URLSearchParams(params);
    if (id) next.set(side, id);
    else next.delete(side);
    setParams(next);
  }

  function swap() {
    const next = new URLSearchParams(params);
    next.set("a", idB);
    next.set("b", idA);
    setParams(next);
  }

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Compare</h1>
        <p className="text-small text-content-secondary">
          Diff two documents side by side — metadata, AI results and entities.
        </p>
      </header>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <DocPicker side="a" documents={documents} value={idA} onChange={pick} />
        <button
          type="button"
          onClick={swap}
          disabled={!idA || !idB}
          aria-label="Swap sides"
          className="btn-ghost shrink-0"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <DocPicker side="b" documents={documents} value={idB} onChange={pick} />
      </div>

      {!docA || !docB ? (
        <EmptyState
          icon={GitCompare}
          title="Pick two documents"
          description="Select a document on each side to see a field-by-field diff. Differences are highlighted automatically."
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-3">
              <DocHeader doc={docA} />
            </div>
            <div className="card p-3">
              <DocHeader doc={docB} />
            </div>
          </div>

          <section className="card overflow-hidden">
            <h2 className="border-b border-edge px-3 py-2 text-caption uppercase tracking-wide text-content-muted">
              Metadata
            </h2>
            <CompareRow
              label="Type"
              left={docA.documentType ?? ""}
              right={docB.documentType ?? ""}
            />
            <CompareRow label="Status" left={docA.status} right={docB.status} />
            <CompareRow
              label="Size"
              left={formatBytes(docA.fileSizeBytes)}
              right={formatBytes(docB.fileSizeBytes)}
            />
            <CompareRow
              label="MIME type"
              left={docA.mimeType}
              right={docB.mimeType}
            />
            <CompareRow
              label="Created"
              left={formatDate(docA.createdAt)}
              right={formatDate(docB.createdAt)}
            />
            <CompareRow
              label="Sentiment"
              left={docA.sentiment ?? ""}
              right={docB.sentiment ?? ""}
            />
            <CompareRow
              label="Confidence"
              left={
                docA.confidenceScore
                  ? `${(docA.confidenceScore * 100).toFixed(1)}%`
                  : ""
              }
              right={
                docB.confidenceScore
                  ? `${(docB.confidenceScore * 100).toFixed(1)}%`
                  : ""
              }
            />
          </section>

          <section className="card overflow-hidden">
            <h2 className="border-b border-edge px-3 py-2 text-caption uppercase tracking-wide text-content-muted">
              AI summary
            </h2>
            <div className="grid grid-cols-2 divide-x divide-edge-subtle">
              <p className="p-3 text-small leading-relaxed text-content-secondary">
                {docA.summary ?? "No summary available."}
              </p>
              <p className="p-3 text-small leading-relaxed text-content-secondary">
                {docB.summary ?? "No summary available."}
              </p>
            </div>
          </section>

          <section className="card overflow-hidden">
            <h2 className="flex items-center gap-3 border-b border-edge px-3 py-2 text-caption uppercase tracking-wide text-content-muted">
              <span>Entities</span>
              <span className="flex items-center gap-1 normal-case text-red-400">
                <Minus className="h-3 w-3" />
                <span>only left</span>
              </span>
              <span className="flex items-center gap-1 normal-case text-green-400">
                <Plus className="h-3 w-3" />
                <span>only right</span>
              </span>
            </h2>
            <EntityDiff a={docA} b={docB} />
          </section>

          <section className="card overflow-hidden">
            <h2 className="border-b border-edge px-3 py-2 text-caption uppercase tracking-wide text-content-muted">
              Tags
            </h2>
            <div className="grid grid-cols-2 divide-x divide-edge-subtle">
              {[docA, docB].map((doc, i) => {
                const other = i === 0 ? docB : docA;
                return (
                  <div key={doc.id} className="flex flex-wrap gap-1 p-3">
                    {doc.aiTags.length === 0 && (
                      <span className="text-caption text-content-muted">
                        No tags
                      </span>
                    )}
                    {doc.aiTags.map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-caption",
                          other.aiTags.includes(tag)
                            ? "bg-surface-raised text-content-secondary"
                            : "bg-brand/15 text-brand-light",
                        )}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
