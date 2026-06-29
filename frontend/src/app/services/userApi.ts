import { apiClient } from "./apiClient";

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

export interface UpdateProfilePayload {
  fullName: string;
  email: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const userApi = {
  // Admin APIs
  getUsers: () => {
    return apiClient.get<UserResponse[]>("/api/users");
  },

  getUserById: (id: number) => {
    return apiClient.get<UserResponse>(`/api/users/${id}`);
  },

  updateUser: (id: number, payload: UpdateUserPayload) => {
    return apiClient.put<UserResponse>(`/api/users/${id}`, payload);
  },

  updateUserStatus: (id: number, payload: UpdateUserStatusPayload) => {
    return apiClient.patch<UserResponse>(
      `/api/users/${id}/status`,
      payload,
    );
  },

  deleteUser: (id: number) => {
    return apiClient.delete<void>(`/api/users/${id}`);
  },

  // Profile APIs
  getProfile: () => {
    return apiClient.get<UserResponse>("/api/account/me");
  },

  updateProfile: (payload: UpdateProfilePayload) => {
    return apiClient.put<UserResponse>("/api/account/me", payload);
  },

  changePassword: (payload: ChangePasswordPayload) => {
    return apiClient.put<void>(
      "/api/account/change-password",
      payload,
    );
  },
};