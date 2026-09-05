import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { LayoutGrid, List, Search, X, FileSearch } from "lucide-react";
import { api } from "@/api/client";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { DocumentRow } from "@/components/documents/DocumentRow";
import { BulkActionBar } from "@/components/documents/BulkActionBar";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import type {
  DocumentDto,
  DocumentFilters,
  DocumentType,
  CloudProvider,
} from "@/types";

const TYPES: Array<DocumentType | "ALL"> = [
  "ALL",
  "INVOICE",
  "CONTRACT",
  "REPORT",
  "RECEIPT",
  "IMAGE",
  "AUDIO",
  "OTHER",
];
const CLOUDS: Array<CloudProvider | "ALL"> = [
  "ALL",
  "AWS",
  "AZURE",
  "GCP",
  "OCI",
];

function DocumentResults({
  documents,
  view,
  selected,
  onToggle,
}: Readonly<{
  documents: DocumentDto[];
  view: "grid" | "list";
  selected: string[];
  onToggle: (id: string) => void;
}>) {
  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileSearch}
        title="Nothing matches those filters"
        description="Try clearing a filter or searching for something broader."
      />
    );
  }

  if (view === "grid") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {documents.map((doc) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            selected={selected.includes(doc.id)}
            onToggleSelect={() => onToggle(doc.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-[1fr_100px_80px_120px_80px_40px] gap-3 border-b border-edge px-3 py-2 text-caption uppercase tracking-wide text-content-muted">
        <span>File name</span>
        <span>Type</span>
        <span>Size</span>
        <span>Clouds</span>
        <span>Date</span>
        <span className="text-right">AI</span>
      </div>
      {documents.map((doc) => (
        <DocumentRow key={doc.id} document={doc} />
      ))}
    </div>
  );
}

export function Library({
  archived = false,
}: Readonly<{ archived?: boolean }>) {
  const [params] = useSearchParams();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filters, setFilters] = useState<DocumentFilters>({
    page: 0,
    size: 20,
    sort: "createdAt",
    direction: "desc",
    type: "ALL",
    cloud: "ALL",
    search: params.get("q") ?? "",
    archived,
  });

  useEffect(() => {
    setFilters((f) => ({
      ...f,
      search: params.get("q") ?? "",
      archived,
      page: 0,
    }));
  }, [params, archived]);

  const { data, isFetching } = useQuery({
    queryKey: ["documents", filters],
    queryFn: () => api.listDocuments(filters),
    placeholderData: keepPreviousData,
  });

  const [selected, setSelected] = useState<string[]>([]);

  function update<K extends keyof DocumentFilters>(
    key: K,
    value: DocumentFilters[K],
  ) {
    setFilters((f) => ({ ...f, [key]: value, page: 0 }));
    setSelected([]);
  }

  return (
    <div className="space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {archived ? "Archive" : "Documents"}
          </h1>
          <p className="text-small text-content-secondary">
            {data?.totalElements ?? 0} {archived ? "archived" : "total"}
            {isFetching && <Spinner className="ml-2 h-3 w-3 align-middle" />}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-edge p-0.5">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={cn(
              "rounded p-1.5",
              view === "grid"
                ? "bg-surface-raised text-brand-light"
                : "text-content-muted",
            )}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "rounded p-1.5",
              view === "list"
                ? "bg-surface-raised text-brand-light"
                : "text-content-muted",
            )}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
          <input
            className="input pl-8"
            placeholder="Search documents, tags, summaries…"
            value={filters.search ?? ""}
            onChange={(e) => update("search", e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={filters.type}
          onChange={(e) =>
            update("type", e.target.value as DocumentType | "ALL")
          }
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "ALL" ? "All types" : t}
            </option>
          ))}
        </select>

        <select
          className="input w-auto"
          value={filters.cloud}
          onChange={(e) =>
            update("cloud", e.target.value as CloudProvider | "ALL")
          }
        >
          {CLOUDS.map((c) => (
            <option key={c} value={c}>
              {c === "ALL" ? "All clouds" : c}
            </option>
          ))}
        </select>

        <select
          className="input w-auto"
          value={`${filters.sort}:${filters.direction}`}
          onChange={(e) => {
            const [sort, direction] = e.target.value.split(":");
            setFilters((f) => ({
              ...f,
              sort,
              direction: direction as "asc" | "desc",
              page: 0,
            }));
          }}
        >
          <option value="createdAt:desc">Newest first</option>
          <option value="createdAt:asc">Oldest first</option>
          <option value="fileName:asc">Name A–Z</option>
          <option value="fileSize:desc">Largest first</option>
        </select>
      </div>

      {(filters.type !== "ALL" ||
        filters.cloud !== "ALL" ||
        !!filters.search?.trim()) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-caption text-content-muted">Filters</span>
          {filters.search?.trim() && (
            <button
              type="button"
              onClick={() => update("search", "")}
              className="chip chip-active"
            >
              “{filters.search}” <X className="h-3 w-3" />
            </button>
          )}
          {filters.type !== "ALL" && (
            <button
              type="button"
              onClick={() => update("type", "ALL")}
              className="chip chip-active"
            >
              {filters.type} <X className="h-3 w-3" />
            </button>
          )}
          {filters.cloud !== "ALL" && (
            <button
              type="button"
              onClick={() => update("cloud", "ALL")}
              className="chip chip-active"
            >
              {filters.cloud} <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      <DocumentResults
        documents={data?.content ?? []}
        view={view}
        selected={selected}
        onToggle={(id) =>
          setSelected((s) =>
            s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
          )
        }
      />

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            className="btn-ghost"
            disabled={filters.page === 0}
            onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
          >
            Previous
          </button>
          <span className="text-small text-content-secondary">
            Page {data.page + 1} of {data.totalPages}
          </span>
          <button
            type="button"
            className="btn-ghost"
            disabled={filters.page >= data.totalPages - 1}
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
          >
            Next
          </button>
        </div>
      )}

      <BulkActionBar count={selected.length} onClear={() => setSelected([])} />
    </div>
  );
}
