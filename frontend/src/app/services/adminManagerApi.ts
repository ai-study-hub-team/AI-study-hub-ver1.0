import { apiClient } from "./apiClient";
import type { UserResponse } from "./userApi";

export interface CreateManagerPayload {
  fullName: string;
  email: string;
  password: string;
}

export const adminManagerApi = {
  createManager(payload: CreateManagerPayload) {
    return apiClient.post<UserResponse>("/api/admin/managers", payload);
  },
};
