import { apiClient } from "./apiClient";

export type NotificationType =
  | "AI_PROCESSING_COMPLETED"
  | "DOCUMENT_REPORTED"
  | "REPORT_RESOLVED"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "SUBSCRIPTION_EXPIRING_7_DAYS"
  | "SUBSCRIPTION_EXPIRED"
  | "DOCUMENT_SHARED"
  | "FOLDER_SHARED"
  | string;

export interface NotificationResponse {
  id: number;
  type: NotificationType;
  title: string;
  message: string;

  targetType?: string | null;
  targetId?: number | null;
  actionUrl?: string | null;

  read: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationPageResponse {
  content: NotificationResponse[];

  totalElements: number;
  totalPages: number;

  size: number;
  number: number;

  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface UnreadCountResponse {
  count: number;
}

export const notificationApi = {
  /**
   * Lấy danh sách thông báo có phân trang.
   */
  getNotifications: (
    page = 0,
    size = 20,
  ) => {
    return apiClient.get<NotificationPageResponse>(
      "/api/notifications",
      {
        params: {
          page,
          size,
        },
      },
    );
  },

  /**
   * Lấy tổng số thông báo chưa đọc.
   */
  getUnreadCount: () => {
    return apiClient.get<UnreadCountResponse>(
      "/api/notifications/unread-count",
    );
  },

  /**
   * Đánh dấu một thông báo đã đọc.
   */
  markRead: (
    notificationId: number,
  ) => {
    return apiClient.patch<NotificationResponse>(
      `/api/notifications/${notificationId}/read`,
    );
  },

  /**
   * Đánh dấu tất cả thông báo đã đọc.
   */
  markAllRead: () => {
    return apiClient.patch<void>(
      "/api/notifications/read-all",
    );
  },

  /**
   * Xóa một thông báo.
   */
  deleteNotification: (
    notificationId: number,
  ) => {
    return apiClient.delete<void>(
      `/api/notifications/${notificationId}`,
    );
  },
};