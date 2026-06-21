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
    ) as { id?: number | string; userId?: number | string };

    const userId = Number(payload.userId ?? payload.id);

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

  if (token) {
    config.headers = AxiosHeaders.from(config.headers);
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});