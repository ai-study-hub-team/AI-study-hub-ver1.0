import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
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
  // GET /api/users
  getUsers: () => {
    return api.get<UserResponse[]>("/api/users");
  },

  // GET /api/users/{id}
  getUserById: (id: number) => {
    return api.get<UserResponse>(`/api/users/${id}`);
  },

  // PUT /api/users/{id}
  updateUser: (id: number, payload: UpdateUserPayload) => {
    return api.put<UserResponse>(`/api/users/${id}`, payload);
  },

  // PATCH /api/users/{id}/status
  updateUserStatus: (id: number, payload: UpdateUserStatusPayload) => {
    return api.patch<UserResponse>(`/api/users/${id}/status`, payload);
  },

  // DELETE /api/users/{id}
  deleteUser: (id: number) => {
    return api.delete<void>(`/api/users/${id}`);
  },
};