import { apiClient } from "./apiClient";

/* =========================================================
   NOTIFICATION TYPES
========================================================= */

export type NotificationType =
  /* =========================
     AI
  ========================= */
  | "AI_PROCESSING_COMPLETED"

  /* =========================
     REPORT
  ========================= */
  | "DOCUMENT_REPORTED"
  | "REPORT_RESOLVED"

  /* =========================
     PAYMENT / SUBSCRIPTION
  ========================= */
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "SUBSCRIPTION_EXPIRING_7_DAYS"
  | "SUBSCRIPTION_EXPIRED"

  /* =========================
     DOCUMENT SHARE
  ========================= */
  | "DOCUMENT_SHARED"
  | "DOCUMENT_SHARE_SENT"
  | "DOCUMENT_SHARE_REVOKED_BY_OWNER"
  | "DOCUMENT_ACCESS_REVOKED"
  | "DOCUMENT_SHARE_EXPIRED_OWNER"
  | "DOCUMENT_SHARE_EXPIRED_RECEIVER"

  /* =========================
     FOLDER SHARE
  ========================= */
  | "FOLDER_SHARED"
  | "FOLDER_SHARE_SENT"
  | "FOLDER_SHARE_REVOKED_BY_OWNER"
  | "FOLDER_ACCESS_REVOKED"
  | "FOLDER_SHARE_EXPIRED_OWNER"
  | "FOLDER_SHARE_EXPIRED_RECEIVER"

  /* =========================
     UPLOAD LINK
  ========================= */
  | "UPLOAD_LINK_CREATED"
  | "UPLOAD_LINK_ACCESS_GRANTED"
  | "UPLOAD_LINK_USER_ADDED"
  | "UPLOAD_LINK_USER_REMOVED"
  | "UPLOAD_LINK_ACCESS_REMOVED"
  | "UPLOAD_LINK_REVOKED_OWNER"
  | "UPLOAD_LINK_REVOKED_RECEIVER"
  | "UPLOAD_LINK_EXPIRED_OWNER"
  | "UPLOAD_LINK_EXPIRED_RECEIVER"

  /* =========================
     SHARED UPLOAD
  ========================= */
  | "SHARED_UPLOAD_SUBMITTED_RECEIVER"
  | "SHARED_UPLOAD_SUBMITTED_OWNER"
  | "SHARED_UPLOAD_APPROVED"
  | "SHARED_UPLOAD_REJECTED";

/* =========================================================
   RESPONSE TYPES
========================================================= */

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

/* =========================================================
   PAGINATION RESPONSE
========================================================= */

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

/* =========================================================
   UNREAD COUNT RESPONSE
========================================================= */

export interface UnreadCountResponse {
  count: number;
}

/* =========================================================
   NOTIFICATION API
========================================================= */

export const notificationApi = {
  /**
   * Lấy danh sách notification có phân trang.
   *
   * GET /api/notifications?page=0&size=20
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
   * Lấy tổng số notification chưa đọc.
   *
   * GET /api/notifications/unread-count
   */
  getUnreadCount: () => {
    return apiClient.get<UnreadCountResponse>(
      "/api/notifications/unread-count",
    );
  },

  /**
   * Đánh dấu một notification đã đọc.
   *
   * PATCH /api/notifications/{id}/read
   */
  markRead: (
    notificationId: number,
  ) => {
    return apiClient.patch<NotificationResponse>(
      `/api/notifications/${notificationId}/read`,
    );
  },

  /**
   * Đánh dấu tất cả notification đã đọc.
   *
   * PATCH /api/notifications/read-all
   */
  markAllRead: () => {
    return apiClient.patch<void>(
      "/api/notifications/read-all",
    );
  },

  /**
   * Xóa một notification.
   *
   * DELETE /api/notifications/{id}
   */
  deleteNotification: (
    notificationId: number,
  ) => {
    return apiClient.delete<void>(
      `/api/notifications/${notificationId}`,
    );
  },
};