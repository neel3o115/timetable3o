import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";

export type AuthUser = {
  _id: string;
  email: string;
  name?: string;
  picture?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setAuthenticatedUser: (user: AuthUser | null) => void;
  showLogin: boolean;
  setShowLogin: (v: boolean) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const refreshRequestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++refreshRequestIdRef.current;
    setIsLoading(true);

    console.log("[auth] checking session...");

    try {
      const data = await apiFetch<{ user: AuthUser | null }>("/auth/session");

      if (refreshRequestIdRef.current !== requestId) {
        return;
      }

      console.log("[auth] session response:", data);
      setUser(data.user);
    } catch (error) {
      if (refreshRequestIdRef.current !== requestId) {
        return;
      }

      if (error instanceof ApiError && error.status === 401) {
        console.warn("[auth] session check returned 401; clearing user");
        setUser(null);
      } else {
        console.error("[auth] session check failed; preserving current auth state", error);
      }
    } finally {
      if (refreshRequestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const setAuthenticatedUser = useCallback((nextUser: AuthUser | null) => {
    refreshRequestIdRef.current += 1;
    setUser(nextUser);
    setIsLoading(false);
  }, []);

  const completeAuth = useCallback(async (path: "/auth/login" | "/auth/signup", email: string, password: string) => {
    const data = await apiFetch<{ user: AuthUser | null }>(path, {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    setAuthenticatedUser(data.user);
    await refresh();
  }, [refresh, setAuthenticatedUser]);

  const login = useCallback(async (email: string, password: string) => {
    await completeAuth("/auth/login", email, password);
  }, [completeAuth]);

  const signup = useCallback(async (email: string, password: string) => {
    await completeAuth("/auth/signup", email, password);
  }, [completeAuth]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      refresh,
      login,
      signup,
      signOut,
      setAuthenticatedUser,
      showLogin,
      setShowLogin
    }),
    [user, isLoading, refresh, login, signup, signOut, setAuthenticatedUser, showLogin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
