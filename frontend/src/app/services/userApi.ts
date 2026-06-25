import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
});

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export interface UserResponse {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  documentCount: number;
  categoryCount: number;
}

export interface UpdateUserPayload {
  fullName: string;
  email: string;
  role: string;
  status: string;
}

export interface UpdateUserStatusPayload {
  status: string;
}

export const userApi = {
  getUsers: () => {
    return api.get<UserResponse[]>("/api/users");
  },

  getUserById: (id: number) => {
    return api.get<UserResponse>(`/api/users/${id}`);
  },

  updateUser: (id: number, payload: UpdateUserPayload) => {
    return api.put<UserResponse>(`/api/users/${id}`, payload);
  },

  updateUserStatus: (id: number, payload: UpdateUserStatusPayload) => {
    return api.patch<UserResponse>(`/api/users/${id}/status`, payload);
  },

  deleteUser: (id: number) => {
    return api.delete<void>(`/api/users/${id}`);
  },
};