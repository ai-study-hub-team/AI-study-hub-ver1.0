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