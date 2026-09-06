import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Hexagon, ArrowRight, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { Spinner } from "@/components/ui/Spinner";

export function Login() {
  const session = useAuthStore((s) => s.session);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const navigate = useNavigate();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isSignUp = mode === "signup";

  if (session) return <Navigate to="/dashboard" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = isSignUp
      ? await register(email, password)
      : await login(email, password);
    if (ok) navigate("/dashboard");
  }

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 grid-lines" />

      <form
        onSubmit={submit}
        className="card-glass relative z-10 w-full max-w-sm animate-scale-in space-y-4 p-6"
      >
        <div className="text-center">
          <Hexagon className="mx-auto h-10 w-10 fill-brand/20 text-brand" />
          <h1 className="mt-3 text-lg font-semibold tracking-tight">
            {isSignUp ? "Create your account" : "Sign in to NexusFlow"}
          </h1>
          <p className="mt-1 text-small text-content-secondary">
            Authenticated by AWS Cognito
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-caption text-red-400">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-caption text-content-secondary"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-caption text-content-secondary"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            minLength={isSignUp ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
          />
          {isSignUp && (
            <p className="text-caption text-content-muted">
              At least 8 characters, with upper and lower case, a number and a
              symbol.
            </p>
          )}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <Spinner />
          ) : (
            <>
              {isSignUp ? "Create account" : "Sign in"}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        <p className="text-center text-caption text-content-secondary">
          {isSignUp ? "Already have an account?" : "New to NexusFlow?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(isSignUp ? "signin" : "signup");
              setPassword("");
            }}
            className="font-medium text-brand hover:underline"
          >
            {isSignUp ? "Sign in" : "Create one"}
          </button>
        </p>
      </form>
    </div>
  );
}
