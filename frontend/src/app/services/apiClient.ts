import axios, { AxiosHeaders } from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
});

export const getAuthToken = () => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt")
  );
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt");

  if (!token) return null;

  return token.replace(/^Bearer\s+/i, "").trim();
};

export const getCurrentUserId = (): number | null => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = Number(user?.id ?? user?.userId);

    if (Number.isInteger(userId) && userId > 0) {
      return userId;
    }
  } catch {
    // Fall back to token.
  }

  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return Number(user?.id || user?.userId || 0);
    const token = getAuthToken();
    const encodedPayload = token?.split(".")[1];

    if (!encodedPayload) return null;

    const payload = JSON.parse(
      atob(encodedPayload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as {
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

export const clearAuthStorage = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("jwt");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("fullName");
  localStorage.removeItem("name");
};

export const getAuthHeader = () => {
  const token = getAuthToken();

  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  };
};

const isPublicAuthApi = (url?: string) => {
  if (!url) return false;

  return (
    url.includes("/api/auth/login") ||
    url.includes("/api/auth/register") ||
    url.includes("/api/auth/refresh") ||
    url.includes("/auth/login") ||
    url.includes("/auth/register") ||
    url.includes("/auth/refresh")
  );
};

// =====================
// Request Interceptor
// =====================
apiClient.interceptors.request.use((config) => {
  if (isPublicAuthApi(config.url)) {
    if (config.headers) {
      const headers = AxiosHeaders.from(config.headers);
      headers.delete("Authorization");
      config.headers = headers;
    }

    return config;
  }

  const token = getAuthToken();
  const url = config.url || "";

  const publicApis = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/verify-email",
    "/api/auth/verify-reset-code",
  ];

  const isPublicApi = publicApis.some((api) => url.includes(api));

  config.headers = AxiosHeaders.from(config.headers);

  if (token && !isPublicApi) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});

// =====================
// Response Interceptor
// =====================
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Unauthorized - clearing local storage");

      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("jwt");
      localStorage.removeItem("user");
      localStorage.removeItem("userId");

      if (
        !window.location.pathname.includes("/login") &&
        !window.location.pathname.includes("/auth")
      ) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
      console.error("Unauthorized:", error.response.data);
    }

    return Promise.reject(error);
  },
);
