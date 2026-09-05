import { useNavigate } from "react-router-dom";

const LABELS: Record<string, string> = {
  organizations: "Organizations",
  persons: "People",
  dates: "Dates",
  amounts: "Amounts",
  locations: "Locations",
  products: "Products",
};

export function EntityList({
  entities,
}: Readonly<{
  entities: Record<string, string[]>;
}>) {
  const navigate = useNavigate();
  const groups = Object.entries(entities).filter(
    ([, values]) => values.length > 0,
  );

  if (groups.length === 0) {
    return (
      <p className="text-small text-content-muted">No entities extracted.</p>
    );
  }

  return (
    <dl className="space-y-1.5">
      {groups.map(([key, values]) => (
        <div key={key} className="grid grid-cols-[100px_1fr] gap-2">
          <dt className="text-caption text-content-muted">
            {LABELS[key] ?? key}
          </dt>
          <dd className="flex flex-wrap gap-1">
            {values.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  navigate(`/library?q=${encodeURIComponent(value)}`)
                }
                className="rounded bg-surface-raised px-1.5 py-0.5 text-caption text-content-secondary transition-colors hover:bg-brand-dim/40 hover:text-brand-light"
                title={`Search for "${value}"`}
              >
                {value}
              </button>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}
