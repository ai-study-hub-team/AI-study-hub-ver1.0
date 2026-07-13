import { apiClient } from "./apiClient";
import type { PageResponse } from "./adminDocumentReportApi";

export interface UserActivityLogResponse {
  id: number;
  userId: number;
  action: string;
  targetType?: string | null;
  targetId?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface RecentUserActivityResponse {
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

export interface RecentActivitiesParams {
  keyword?: string;
  role?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
  sort?: "lastActiveAt" | "lastLoginAt";
}

export const adminUserActivityApi = {
  getUserActivities: (userId: number, page = 0, size = 20) =>
    apiClient.get<PageResponse<UserActivityLogResponse>>(`/api/admin/users/${userId}/activities`, { params: { page, size } }),
  getRecentActivities: (params: RecentActivitiesParams = {}) =>
    apiClient.get<PageResponse<RecentUserActivityResponse>>("/api/admin/users/recent-activities", { params }),
};
