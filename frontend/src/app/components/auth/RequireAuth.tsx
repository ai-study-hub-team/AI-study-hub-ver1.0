import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Navigate, useLocation } from "react-router";

import { clearAuthStorage, getAuthToken } from "../../services/apiClient";
import { userApi, type UserResponse } from "../../services/userApi";

type AuthState =
  | { status: "checking"; user: null }
  | { status: "authenticated"; user: UserResponse }
  | { status: "unauthenticated"; user: null };

const AuthSessionContext = createContext<UserResponse | null>(null);

const normalizeRole = (role?: string | null): string =>
  (role || "").trim().toUpperCase().replace(/^ROLE_/, "");

const hasJwtStructure = (token: string): boolean => {
  const parts = token.split(".");
  return parts.length === 3 && parts.every(Boolean);
};

const hasExpired = (token: string): boolean => {
  try {
    const encodedPayload = token.split(".")[1];
    const normalizedPayload = encodedPayload
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      "=",
    );
    const payload = JSON.parse(atob(paddedPayload)) as { exp?: number };

    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

const cacheVerifiedUser = (user: UserResponse): void => {
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("userId", String(user.id));
  localStorage.setItem("role", normalizeRole(user.role));
  localStorage.setItem("email", user.email || "");
  localStorage.setItem("fullName", user.fullName || "");
};

function AuthLoadingScreen() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600"
      aria-busy="true"
      aria-label="Checking your session"
    >
      <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 shadow-sm">
        <span className="size-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span>Checking your session...</span>
      </div>
    </main>
  );
}

interface RequireAuthProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export function RequireAuth({
  children,
  allowedRoles,
}: RequireAuthProps) {
  const location = useLocation();
  const token = getAuthToken();
  const [authState, setAuthState] = useState<AuthState>({
    status: "checking",
    user: null,
  });

  const normalizedAllowedRoles = useMemo(
    () => allowedRoles?.map(normalizeRole),
    [allowedRoles],
  );

  useEffect(() => {
    let active = true;

    const verifySession = async (): Promise<void> => {
      const refreshToken = localStorage.getItem("refreshToken")?.trim();

      if (
        !token ||
        !hasJwtStructure(token) ||
        (hasExpired(token) && !refreshToken)
      ) {
        clearAuthStorage();
        if (active) {
          setAuthState({ status: "unauthenticated", user: null });
        }
        return;
      }

      try {
        const { data: user } = await userApi.getProfile();

        if (!active) return;

        cacheVerifiedUser(user);
        setAuthState({ status: "authenticated", user });
      } catch {
        clearAuthStorage();
        if (active) {
          setAuthState({ status: "unauthenticated", user: null });
        }
      }
    };

    setAuthState({ status: "checking", user: null });
    void verifySession();

    return () => {
      active = false;
    };
  }, [token]);

  if (authState.status === "checking") {
    return <AuthLoadingScreen />;
  }

  if (authState.status === "unauthenticated") {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (
    normalizedAllowedRoles?.length &&
    !normalizedAllowedRoles.includes(normalizeRole(authState.user.role))
  ) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <AuthSessionContext.Provider value={authState.user}>
      {children}
    </AuthSessionContext.Provider>
  );
}

interface RequireRoleProps {
  children: ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

export function RequireRole({
  children,
  allowedRoles,
  redirectTo = "/app/dashboard",
}: RequireRoleProps) {
  const user = useContext(AuthSessionContext);
  const permitted = allowedRoles
    .map(normalizeRole)
    .includes(normalizeRole(user?.role));

  return permitted ? children : <Navigate to={redirectTo} replace />;
}
