import axios, { AxiosHeaders } from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
});

export const getAuthToken = () => {
  return localStorage.getItem("token") || localStorage.getItem("accessToken");
};

export const getCurrentUserId = () => {
  const userId = localStorage.getItem("userId");

  if (userId) {
    return Number(userId);
  }

  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return Number(user?.id || 0);
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

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers = AxiosHeaders.from(config.headers);
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});