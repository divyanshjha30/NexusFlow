import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { formatBytes } from "@/lib/utils";

export function Settings() {
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.getMe(),
  });

  return (
    <div className="max-w-2xl space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-small text-content-secondary">
          Profile and preferences.
        </p>
      </header>

      <section className="card space-y-3 p-4">
        <h2 className="text-caption uppercase tracking-wide text-content-muted">
          Profile
        </h2>
        <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-small">
          <dt className="text-content-muted">Name</dt>
          <dd>{user?.displayName ?? "–"}</dd>
          <dt className="text-content-muted">Email</dt>
          <dd>{user?.email ?? "–"}</dd>
          <dt className="text-content-muted">Role</dt>
          <dd>{user?.role ?? "–"}</dd>
          <dt className="text-content-muted">Documents</dt>
          <dd>{user?.documentCount ?? 0}</dd>
          <dt className="text-content-muted">Storage used</dt>
          <dd>
            {formatBytes(user?.storageUsedBytes ?? 0)} of{" "}
            {formatBytes(user?.storageLimitBytes ?? 0)}
          </dd>
        </dl>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="text-caption uppercase tracking-wide text-content-muted">
          Preferences
        </h2>
        {[
          ["Auto-analyse uploads with AI", true],
          ["Email me when processing completes", true],
          ["Archive documents after 30 days", false],
        ].map(([label, checked]) => (
          <label
            key={label as string}
            className="flex items-center justify-between text-small"
          >
            <span className="text-content-secondary">{label}</span>
            <input
              type="checkbox"
              defaultChecked={checked as boolean}
              className="accent-brand"
            />
          </label>
        ))}
      </section>
    </div>
  );
}
