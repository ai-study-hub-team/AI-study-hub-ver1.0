import { apiClient } from "./apiClient";

export type ReportPeriod =
  | "DAY"
  | "WEEK"
  | "MONTH"
  | "CUSTOM";

/**
 * Alias dùng trong AnalyticsDashboard.
 * Giữ cả hai tên để tránh lỗi import giữa các phiên bản.
 */
export type BackendReportPeriod =
  ReportPeriod;


export interface AdminActiveUserItem {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  totalStorageUsedBytes: number;
}

export interface RevenueDailyItem {
  date: string;
  totalRevenue: number;
  successfulTransactionCount: number;
}

export interface RevenueReportResponse {
  totalRevenue: number;
  successfulTransactionCount: number;
  currency: string;
  period?: BackendReportPeriod | string | null;
  fromDate?: string | null;
  toDate?: string | null;
  numberOfDays?: number | null;
  dailyRevenue?: RevenueDailyItem[] | null;
}

export interface RevenueReportParams {
  period?: BackendReportPeriod;
  date?: string;
  fromDate?: string;
  toDate?: string;
}

export interface StorageDocumentItem {
  documentId: number;
  title?: string | null;
  fileName?: string | null;
  originalName?: string | null;
  fileType?: string | null;
  fileSizeBytes: number;
  uploadedAt?: string | null;
}

export interface UserStorageItem {
  userId: number;
  fullName: string;
  email: string;
  totalStorageBytes: number;
  documentCount: number;
  documents: StorageDocumentItem[];
}

export interface StorageReportResponse {
  scope:
    | "ALL_USERS"
    | "SINGLE_USER"
    | string;

  userId?: number | null;
  totalStorageBytes: number;
  userCount: number;
  documentCount: number;
  users: UserStorageItem[];
}

export interface TokenTotals {
  chatTokens: number;
  summaryTokens: number;
  quizTokens: number;
  extractTokens: number;
  totalTokens: number;
  overallTokens: number;
}

export interface TokenDailyItem
  extends TokenTotals {
  date: string;
}

export interface TokenUsageReportResponse {
  scope:
    | "ALL_USERS"
    | "SINGLE_USER"
    | string;

  userId?: number | null;
  period: BackendReportPeriod;
  fromDate: string;
  toDate: string;
  numberOfDays: number;
  totals: TokenTotals;
  dailyUsage: TokenDailyItem[];
}

export interface TokenUsageReportParams {
  userId?: number;
  period: BackendReportPeriod;
  date?: string;
  fromDate?: string;
  toDate?: string;
}

export const adminAnalyticsApi = {
  /** GET /api/admin/dashboard/active-users */
  getActiveUsers: () => {
    return apiClient.get<AdminActiveUserItem[]>(
      "/api/admin/dashboard/active-users",
    );
  },

  /**
   * GET /api/admin/dashboard/revenue
   */
  getRevenue: (
    params: RevenueReportParams = {},
  ) => {
    return apiClient.get<RevenueReportResponse>(
      "/api/admin/dashboard/revenue",
      {
        params,
      },
    );
  },

  /**
   * GET /api/admin/dashboard/storage
   *
   * Không truyền userId: tất cả user.
   * Có userId: một user cụ thể.
   */
  getStorage: (userId?: number) => {
    return apiClient.get<StorageReportResponse>(
      "/api/admin/dashboard/storage",
      {
        params:
          userId !== undefined
            ? { userId }
            : {},
      },
    );
  },

  /**
   * GET /api/admin/token-usage/report
   */
  getTokenUsage: (
    params: TokenUsageReportParams,
  ) => {
    return apiClient.get<TokenUsageReportResponse>(
      "/api/admin/token-usage/report",
      {
        params,
      },
    );
  },
};  