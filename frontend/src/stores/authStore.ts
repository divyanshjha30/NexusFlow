import { create } from "zustand";

interface Session {
  idToken: string;
  refreshToken: string;
  expiresAt: number;
  email: string;
}

interface AuthStore {
  session: Session | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const STORAGE_KEY = "nexusflow.session";
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
const REFRESH_SKEW_MS = 60_000;

function load(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

function decodeEmail(idToken: string): string {
  try {
    const payload = idToken.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return (JSON.parse(json).email as string) ?? "";
  } catch {
    return "";
  }
}

interface TokenResponse {
  idToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

function persist(session: Session): Session {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

function toSession(
  tokens: TokenResponse,
  fallbackEmail: string,
  keepRefreshToken?: string,
): Session {
  return {
    idToken: tokens.idToken,
    // Cognito omits the refresh token on a refresh exchange; keep the old one.
    refreshToken: tokens.refreshToken || keepRefreshToken || "",
    expiresAt: Date.now() + (tokens.expiresIn ?? 3600) * 1000,
    email: decodeEmail(tokens.idToken) || fallbackEmail,
  };
}

type SetState = (partial: Partial<AuthStore>) => void;

async function authenticate(
  set: SetState,
  path: string,
  email: string,
  password: string,
  fallbackMessage: string,
): Promise<boolean> {
  set({ loading: true, error: null });
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      set({ loading: false, error: body.message ?? fallbackMessage });
      return false;
    }

    const session = persist(toSession(await res.json(), email));
    set({ session, loading: false, error: null });
    return true;
  } catch (e) {
    set({
      loading: false,
      error: e instanceof Error ? e.message : fallbackMessage,
    });
    return false;
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: load(),
  loading: false,
  error: null,

  async login(email, password) {
    return authenticate(set, "/auth/login", email, password, "Sign-in failed");
  },

  async register(email, password) {
    return authenticate(
      set,
      "/auth/register",
      email,
      password,
      "Sign-up failed",
    );
  },

  logout() {
    localStorage.removeItem(STORAGE_KEY);
    set({ session: null });
  },
}));

/** Read directly from the store so non-React callers (the API client) stay in sync. */
export function currentToken(): string | null {
  return useAuthStore.getState().session?.idToken ?? null;
}

/** Shared so concurrent requests trigger only one refresh exchange. */
let inFlightRefresh: Promise<string | null> | null = null;

async function exchangeRefreshToken(session: Session): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!res.ok) {
      useAuthStore.getState().logout();
      return null;
    }
    const next = persist(
      toSession(await res.json(), session.email, session.refreshToken),
    );
    useAuthStore.setState({ session: next });
    return next.idToken;
  } catch {
    return null;
  }
}

/**
 * Resolves a token valid for at least another minute, refreshing first when
 * needed so a long-lived tab never fires a request that is already doomed.
 */
export async function freshToken(): Promise<string | null> {
  const session = useAuthStore.getState().session;
  if (!session) return null;
  if (session.expiresAt - Date.now() > REFRESH_SKEW_MS) return session.idToken;

  if (!session.refreshToken) {
    useAuthStore.getState().logout();
    return null;
  }

  inFlightRefresh ??= exchangeRefreshToken(session).finally(() => {
    inFlightRefresh = null;
  });
  return inFlightRefresh;
}
