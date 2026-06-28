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
};

export const getCurrentUserId = () => {
  const userId = localStorage.getItem("userId");

  if (userId) {
    return Number(userId);
  }

  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return Number(user?.id || user?.userId || 0);
  } catch {
    return 0;
  }
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

  if (token) {
    config.headers = AxiosHeaders.from(config.headers);
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