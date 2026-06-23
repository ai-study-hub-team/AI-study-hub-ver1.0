import axios, { AxiosHeaders } from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
});

export const getAuthToken = () => {
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

apiClient.interceptors.request.use((config) => {
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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("Unauthorized:", error.response.data);
    }

    return Promise.reject(error);
  },
);