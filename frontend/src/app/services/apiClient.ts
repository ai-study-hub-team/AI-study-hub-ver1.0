import axios, { AxiosHeaders } from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
});

export const getAuthToken = (): string | null => {
  const token =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt");

  if (!token) {
    return null;
  }

  return token.replace(/^Bearer\s+/i, "").trim();
};

export const getCurrentUserId = (): number | null => {
  const storedUserId = localStorage.getItem("userId");

  if (storedUserId) {
    const userId = Number(storedUserId);

    if (Number.isInteger(userId) && userId > 0) {
      return userId;
    }
  }

  try {
    const token = getAuthToken();
    const encodedPayload = token?.split(".")[1];

    if (!encodedPayload) {
      return null;
    }

    const normalizedPayload = encodedPayload
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      "=",
    );

    const payload = JSON.parse(atob(paddedPayload)) as {
      id?: number | string;
      userId?: number | string;
      sub?: number | string;
    };

    const userId = Number(
      payload.userId ??
        payload.id ??
        payload.sub,
    );

    return Number.isInteger(userId) && userId > 0
      ? userId
      : null;
  } catch {
    return null;
  }
};

export const clearAuthStorage = (): void => {
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("jwt");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userId");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("email");
  localStorage.removeItem("fullName");
  localStorage.removeItem("name");
};

export const getAuthHeader = () => {
  const token = getAuthToken();

  return {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  };
};

const isPublicApi = (url?: string): boolean => {
  if (!url) {
    return false;
  }

  return (
    url.includes("/api/public/") ||
    url.includes("/api/auth/login") ||
    url.includes("/api/auth/google") ||
    url.includes("/api/auth/register") ||
    url.includes("/api/auth/refresh") ||
    url.includes("/api/auth/forgot-password") ||
    url.includes("/api/auth/reset-password") ||
    url.includes("/api/auth/verify-email") ||
    url.includes("/api/auth/resend-verification") ||
    url.includes("/api/auth/verify-reset-code") ||
    url.includes("/auth/login") ||
    url.includes("/auth/register") ||
    url.includes("/auth/refresh")
  );
};

apiClient.interceptors.request.use(
  (config) => {
    config.headers = AxiosHeaders.from(config.headers);

    const requestUrl = String(config.url || "");

    /*
     * Public APIs must not include an access token stored
     * in localStorage. This prevents an old login JWT from
     * causing errors for verify-email, register, login, etc.
     */
    if (isPublicApi(requestUrl)) {
      config.headers.delete("Authorization");
      return config;
    }

    const token = getAuthToken();

    if (token) {
      config.headers.set(
        "Authorization",
        `Bearer ${token}`,
      );
    } else {
      config.headers.delete("Authorization");
    }

    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = String(error.config?.url || "");

    /*
     * Do not automatically log the user out when a public API
     * returns 401. Only clear authentication data when a
     * protected API returns 401.
     */
    if (
      status === 401 &&
      !isPublicApi(requestUrl)
    ) {
      console.warn(
        "The access token is invalid or has expired.",
      );

      clearAuthStorage();

      const currentPath = window.location.pathname;

      if (
        !currentPath.includes("/login") &&
        !currentPath.includes("/register") &&
        !currentPath.includes("/verify-email")
      ) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;