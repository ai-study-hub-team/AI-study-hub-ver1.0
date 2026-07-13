import { apiClient } from "./apiClient";

export interface UserResponse {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status: string;

  createdAt: string;
  updatedAt: string;

  totalStorageUsedBytes: number;
  documentCount: number;
  categoryCount: number;

  emailVerified: boolean;
  avatarUrl: string | null;
  phone: string | null;
}

export interface UpdateUserPayload {
  fullName: string;
  role?: string;
  status?: string;
}

export interface UpdateUserStatusPayload {
  status: string;
}

export interface UpdateProfilePayload {
  fullName: string;
  avatarUrl?: string | null;
  phone?: string | null;
  bio?: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const userApi = {
  // =========================
  // Admin APIs
  // =========================

  getUsers: () => {
    return apiClient.get<UserResponse[]>(
      "/api/users",
    );
  },

  getUserById: (id: number) => {
    return apiClient.get<UserResponse>(
      `/api/users/${id}`,
    );
  },

  updateUser: (
    id: number,
    payload: UpdateUserPayload,
  ) => {
    return apiClient.put<UserResponse>(
      `/api/users/${id}`,
      payload,
    );
  },

  updateUserStatus: (
    id: number,
    payload: UpdateUserStatusPayload,
  ) => {
    return apiClient.patch<UserResponse>(
      `/api/users/${id}/status`,
      payload,
    );
  },

  deleteUser: (id: number) => {
    return apiClient.delete<void>(
      `/api/users/${id}`,
    );
  },

  // =========================
  // Current user profile APIs
  // =========================

  getProfile: () => {
    return apiClient.get<UserResponse>(
      "/api/account/me",
    );
  },

  updateProfile: (
    payload: UpdateProfilePayload,
  ) => {
    return apiClient.put<UserResponse>(
      "/api/account/me",
      payload,
    );
  },

  updateAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    return apiClient.patch<UserResponse>(
      "/api/account/me/avatar",
      formData,
    );
  },

  changePassword: (
    payload: ChangePasswordPayload,
  ) => {
    return apiClient.put<UserResponse>(
      "/api/account/change-password",
      payload,
    );
  },
};