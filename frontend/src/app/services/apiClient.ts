import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
});

export const getAuthToken = (): string | null => {
  const token =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt");

  if (!token || token === "null" || token === "undefined") {
    return null;
  }

  return token.trim();
};

const isValidJwtStructure = (token: string): boolean => {
  const parts = token.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
};

export const clearAuthStorage = (): void => {
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("jwt");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  localStorage.removeItem("userId");
  localStorage.removeItem("role");
  localStorage.removeItem("email");
  localStorage.removeItem("fullName");
  localStorage.removeItem("name");
  localStorage.removeItem("avatarUrl");
  sessionStorage.clear();
};

const publicAuthEndpoints = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/google",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/resend-verification",
  "/api/auth/verify-email",
  "/api/auth/verify-reset-code",
  "/api/auth/check-email",
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
];

const isPublicEndpoint = (url?: string): boolean => {
  if (!url) return false;

  if (url.includes("/api/public/")) return true;

  return publicAuthEndpoints.some(
    (endpoint) =>
      url === endpoint ||
      url.startsWith(`${endpoint}?`) ||
      url.includes(endpoint),
  );
};

const isExternalRedirectResponse = (error: any): boolean => {
  const responseUrl = String(error?.request?.responseURL || "");
  const apiBaseUrl = String(apiClient.defaults.baseURL || "");

  if (!responseUrl || !apiBaseUrl) return false;

  try {
    const finalOrigin = new URL(responseUrl, window.location.origin).origin;
    const apiOrigin = new URL(apiBaseUrl, window.location.origin).origin;
    return finalOrigin !== apiOrigin;
  } catch {
    return false;
  }
};

export const getAuthHeader = (): Record<string, string> => {
  const token = getAuthToken();

  if (!token || !isValidJwtStructure(token)) {
    return {};
  }

  return { Authorization: `Bearer ${token}` };
};

apiClient.interceptors.request.use(
  (config) => {
    const headers = AxiosHeaders.from(config.headers);

    if (isPublicEndpoint(config.url)) {
      headers.delete("Authorization");
      config.headers = headers;
      return config;
    }

    const token = getAuthToken();

    if (token && isValidJwtStructure(token)) {
      headers.set("Authorization", `Bearer ${token}`);
    } else {
      headers.delete("Authorization");

      if (token) {
        localStorage.removeItem("token");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("jwt");
      }
    }

    config.headers = headers;
    return config;
  },
  (error) => Promise.reject(error),
);

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retryAfterRefresh?: boolean;
  _accessTokenRefreshed?: boolean;
};

type RefreshResponse = {
  accessToken?: string;
  token?: string;
  jwt?: string;
  refreshToken?: string;
};

let refreshRequest: Promise<string> | null = null;

const refreshAccessToken = (): Promise<string> => {
  if (refreshRequest) return refreshRequest;

  const refreshToken = localStorage.getItem("refreshToken")?.trim();
  if (!refreshToken) {
    return Promise.reject(new Error("No refresh token is available"));
  }

  refreshRequest = apiClient
    .post<RefreshResponse>("/api/auth/refresh", { refreshToken })
    .then(({ data }) => {
      const accessToken = (data.accessToken || data.token || data.jwt)?.trim();

      if (!accessToken || !isValidJwtStructure(accessToken)) {
        throw new Error("The refresh response does not contain a valid access token");
      }

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("token", accessToken);

      if (data.refreshToken?.trim()) {
        localStorage.setItem("refreshToken", data.refreshToken.trim());
      }

      return accessToken;
    })
    .finally(() => {
      refreshRequest = null;
    });

  return refreshRequest;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const requestUrl = String(error?.config?.url || "");
    const isAuthenticationRequest = isPublicEndpoint(requestUrl);
    const isExternalResponse = isExternalRedirectResponse(error);
    const originalRequest = error?.config as RetryableRequestConfig | undefined;
    const isBlobRequest = originalRequest?.responseType === "blob";

    if (
      status === 401 &&
      !isAuthenticationRequest &&
      !isExternalResponse &&
      originalRequest &&
      !originalRequest._retryAfterRefresh
    ) {
      originalRequest._retryAfterRefresh = true;

      try {
        const accessToken = await refreshAccessToken();
        const headers = AxiosHeaders.from(originalRequest.headers);
        headers.set("Authorization", `Bearer ${accessToken}`);
        originalRequest.headers = headers;
        originalRequest._accessTokenRefreshed = true;

        return apiClient(originalRequest);
      } catch {
        // The refresh token is missing, expired, revoked, or otherwise invalid.
      }
    }

    if (
      status === 401 &&
      !isAuthenticationRequest &&
      !isExternalResponse &&
      !isBlobRequest &&
      !originalRequest?._accessTokenRefreshed
    ) {
      clearAuthStorage();

      const currentPath = window.location.pathname;
      const isPublicPage =
        currentPath === "/login" ||
        currentPath === "/register" ||
        currentPath === "/forgot-password" ||
        currentPath.startsWith("/reset-password") ||
        currentPath.startsWith("/verify-email");

      if (!isPublicPage) {
        window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  },
);

export const getCurrentUserId = (): number | null => {
  const storedUserId = Number(localStorage.getItem("userId"));
  if (Number.isInteger(storedUserId) && storedUserId > 0) {
    return storedUserId;
  }

  try {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}") as {
      id?: number | string;
      userId?: number | string;
    };

    const userId = Number(storedUser.id ?? storedUser.userId);
    if (Number.isInteger(userId) && userId > 0) {
      return userId;
    }
  } catch {
    // Continue by reading the JWT payload.
  }

  try {
    const token = getAuthToken();
    if (!token || !isValidJwtStructure(token)) {
      return null;
    }

    const encodedPayload = token.split(".")[1];
    const normalizedPayload = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      "=",
    );

    const payload = JSON.parse(atob(paddedPayload)) as {
      id?: number | string;
      userId?: number | string;
      sub?: number | string;
    };

    const userId = Number(payload.userId ?? payload.id ?? payload.sub);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
};
