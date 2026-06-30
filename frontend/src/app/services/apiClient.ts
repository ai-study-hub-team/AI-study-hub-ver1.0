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
  const userIdFromStorage = localStorage.getItem("userId");

  if (userIdFromStorage) {
    const userId = Number(userIdFromStorage);
    if (Number.isInteger(userId) && userId > 0) return userId;
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
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userId");
  localStorage.removeItem("user");
  localStorage.removeItem("userId");
  localStorage.removeItem("role");
  localStorage.removeItem("email");
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

const publicApis = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/auth/verify-reset-code",
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/verify-reset-code",
];

const isPublicAuthApi = (url?: string) => {
  if (!url) return false;

  return (
    url.includes("/api/auth/login") ||
    url.includes("/api/auth/register") ||
    url.includes("/api/auth/refresh") ||
    url.includes("/api/auth/forgot-password") ||
    url.includes("/api/auth/reset-password") ||
    url.includes("/api/auth/verify-email") ||
    url.includes("/api/auth/verify-reset-code") ||
    url.includes("/auth/login") ||
    url.includes("/auth/register") ||
    url.includes("/auth/refresh")
  );
};

apiClient.interceptors.request.use((config) => {
  config.headers = AxiosHeaders.from(config.headers);

  if (isPublicAuthApi(config.url)) {
    config.headers.delete("Authorization");
    return config;
  }

  const token = getAuthToken();

  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      console.warn("Unauthorized - clearing local storage");

      clearAuthStorage();

      if (
        !window.location.pathname.includes("/login") &&
        !window.location.pathname.includes("/auth")
      ) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;