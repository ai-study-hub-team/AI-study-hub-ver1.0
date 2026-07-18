import { apiClient } from "./apiClient";

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first?: boolean;
  last?: boolean;
}

export interface RecentUserActivity {
  userId: number;
  fullName: string;
  email: string;
  role: string;
  accountStatus: string;
  lastLoginAt?: string | null;
  lastActiveAt?: string | null;
  lastAction?: string | null;
  totalDocuments: number;
  totalSharedDocuments: number;
  totalReports: number;
}

export interface UserActivityLog {
  id: number;
  userId: number;
  action: string;
  targetType?: string | null;
  targetId?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface RecentActivityParams {
  keyword?: string;
  role?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
  sort?: "lastActiveAt" | "lastLoginAt";
}

export const adminActivityApi = {
  getRecentActivities: (params: RecentActivityParams = {}) =>
    apiClient.get<PageResponse<RecentUserActivity>>(
      "/api/admin/users/recent-activities",
      { params },
    ),

  getUserActivities: (userId: number, page = 0, size = 20) =>
    apiClient.get<PageResponse<UserActivityLog>>(
      `/api/admin/users/${userId}/activities`,
      { params: { page, size } },
    ),
};
