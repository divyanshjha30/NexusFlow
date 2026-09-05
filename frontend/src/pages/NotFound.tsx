import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <p className="text-4xl font-bold text-brand">404</p>
      <p className="text-small text-content-secondary">
        This page does not exist.
      </p>
      <Link to="/dashboard" className="btn-primary">
        Back to dashboard
      </Link>
    </div>
  );
}
