import {
  Bell,
  Bot,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileCheck2,
  FileUp,
  FileWarning,
  FolderOpen,
  Link2,
  Share2,
  ShieldCheck,
  UserMinus,
  UserPlus,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import type { NotificationType } from "../services/notificationApi";

/* =========================================================
   NOTIFICATION ICON
========================================================= */

/**
 * Trả về icon tương ứng với từng notification type.
 *
 * Dùng chung cho:
 * - NotificationBell.tsx
 * - NotificationsPage.tsx
 */
export const getNotificationIcon = (
  type: NotificationType,
): LucideIcon => {
  switch (type) {
    /* =========================
       AI
    ========================= */

    case "AI_PROCESSING_COMPLETED":
      return Bot;

    /* =========================
       REPORT
    ========================= */

    case "DOCUMENT_REPORTED":
      return FileWarning;

    case "REPORT_RESOLVED":
      return FileCheck2;

    /* =========================
       PAYMENT / SUBSCRIPTION
    ========================= */

    case "PAYMENT_SUCCESS":
      return CheckCircle2;

    case "PAYMENT_FAILED":
      return XCircle;

    case "SUBSCRIPTION_EXPIRING_7_DAYS":
      return Clock3;

    case "SUBSCRIPTION_EXPIRED":
      return CreditCard;

    /* =========================
       DOCUMENT SHARE
    ========================= */

    case "DOCUMENT_SHARED":
    case "DOCUMENT_SHARE_SENT":
      return Share2;

    case "DOCUMENT_SHARE_REVOKED_BY_OWNER":
    case "DOCUMENT_ACCESS_REVOKED":
      return UserMinus;

    case "DOCUMENT_SHARE_EXPIRED_OWNER":
    case "DOCUMENT_SHARE_EXPIRED_RECEIVER":
      return Clock3;

    /* =========================
       FOLDER SHARE
    ========================= */

    case "FOLDER_SHARED":
    case "FOLDER_SHARE_SENT":
      return FolderOpen;

    case "FOLDER_SHARE_REVOKED_BY_OWNER":
    case "FOLDER_ACCESS_REVOKED":
      return UserMinus;

    case "FOLDER_SHARE_EXPIRED_OWNER":
    case "FOLDER_SHARE_EXPIRED_RECEIVER":
      return Clock3;

    /* =========================
       UPLOAD LINK
    ========================= */

    case "UPLOAD_LINK_CREATED":
      return Link2;

    case "UPLOAD_LINK_ACCESS_GRANTED":
      return ShieldCheck;

    case "UPLOAD_LINK_USER_ADDED":
      return UserPlus;

    case "UPLOAD_LINK_USER_REMOVED":
    case "UPLOAD_LINK_ACCESS_REMOVED":
      return UserMinus;

    case "UPLOAD_LINK_REVOKED_OWNER":
    case "UPLOAD_LINK_REVOKED_RECEIVER":
      return XCircle;

    case "UPLOAD_LINK_EXPIRED_OWNER":
    case "UPLOAD_LINK_EXPIRED_RECEIVER":
      return Clock3;

    /* =========================
       SHARED UPLOAD
    ========================= */

    case "SHARED_UPLOAD_SUBMITTED_RECEIVER":
    case "SHARED_UPLOAD_SUBMITTED_OWNER":
      return FileUp;

    case "SHARED_UPLOAD_APPROVED":
      return CheckCircle2;

    case "SHARED_UPLOAD_REJECTED":
      return FileWarning;

    default:
      return Bell;
  }
};

/* =========================================================
   NOTIFICATION LABEL
========================================================= */

/**
 * Chuyển enum backend thành label dễ đọc trên UI.
 *
 * Ví dụ:
 *
 * UPLOAD_LINK_ACCESS_GRANTED
 * =>
 * Access granted
 */
export const getNotificationLabel = (
  type: NotificationType,
): string => {
  switch (type) {
    /* =========================
       AI
    ========================= */

    case "AI_PROCESSING_COMPLETED":
      return "AI processing";

    /* =========================
       REPORT
    ========================= */

    case "DOCUMENT_REPORTED":
      return "Document report";

    case "REPORT_RESOLVED":
      return "Report resolved";

    /* =========================
       PAYMENT / SUBSCRIPTION
    ========================= */

    case "PAYMENT_SUCCESS":
      return "Payment successful";

    case "PAYMENT_FAILED":
      return "Payment failed";

    case "SUBSCRIPTION_EXPIRING_7_DAYS":
      return "Subscription expiring";

    case "SUBSCRIPTION_EXPIRED":
      return "Subscription expired";

    /* =========================
       DOCUMENT SHARE
    ========================= */

    case "DOCUMENT_SHARED":
    case "DOCUMENT_SHARE_SENT":
      return "Document share";

    case "DOCUMENT_SHARE_REVOKED_BY_OWNER":
      return "Document share revoked";

    case "DOCUMENT_ACCESS_REVOKED":
      return "Document access revoked";

    case "DOCUMENT_SHARE_EXPIRED_OWNER":
    case "DOCUMENT_SHARE_EXPIRED_RECEIVER":
      return "Document share expired";

    /* =========================
       FOLDER SHARE
    ========================= */

    case "FOLDER_SHARED":
    case "FOLDER_SHARE_SENT":
      return "Folder share";

    case "FOLDER_SHARE_REVOKED_BY_OWNER":
      return "Folder share revoked";

    case "FOLDER_ACCESS_REVOKED":
      return "Folder access revoked";

    case "FOLDER_SHARE_EXPIRED_OWNER":
    case "FOLDER_SHARE_EXPIRED_RECEIVER":
      return "Folder share expired";

    /* =========================
       UPLOAD LINK
    ========================= */

    case "UPLOAD_LINK_CREATED":
      return "Upload link";

    case "UPLOAD_LINK_ACCESS_GRANTED":
      return "Access granted";

    case "UPLOAD_LINK_USER_ADDED":
      return "User added";

    case "UPLOAD_LINK_USER_REMOVED":
      return "User removed";

    case "UPLOAD_LINK_ACCESS_REMOVED":
      return "Access removed";

    case "UPLOAD_LINK_REVOKED_OWNER":
    case "UPLOAD_LINK_REVOKED_RECEIVER":
      return "Upload link revoked";

    case "UPLOAD_LINK_EXPIRED_OWNER":
    case "UPLOAD_LINK_EXPIRED_RECEIVER":
      return "Upload link expired";

    /* =========================
       SHARED UPLOAD
    ========================= */

    case "SHARED_UPLOAD_SUBMITTED_RECEIVER":
    case "SHARED_UPLOAD_SUBMITTED_OWNER":
      return "Shared upload";

    case "SHARED_UPLOAD_APPROVED":
      return "Upload approved";

    case "SHARED_UPLOAD_REJECTED":
      return "Upload rejected";

    default:
      return formatFallbackLabel(type);
  }
};

/* =========================================================
   FALLBACK LABEL
========================================================= */

/**
 * Nếu sau này backend có notification mới
 * nhưng frontend chưa map label,
 * hàm này vẫn hiển thị enum thành dạng dễ đọc.
 *
 * Ví dụ:
 *
 * SOME_NEW_NOTIFICATION
 * =>
 * Some New Notification
 */
const formatFallbackLabel = (
  type: string,
): string => {
  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
};

/* =========================================================
   NORMALIZE ACTION URL
========================================================= */

/**
 * Chuyển actionUrl backend gửi về
 * thành route frontend hiện tại.
 *
 * Đồng thời chỉ cho phép internal route.
 */
export const normalizeActionUrl = (
  url?: string | null,
): string | null => {
  if (!url) {
    return null;
  }

  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return null;
  }

  /*
   * Chỉ chấp nhận URL nội bộ.
   *
   * Không cho:
   * https://example.com
   * javascript:...
   */
  if (!trimmedUrl.startsWith("/")) {
    return null;
  }

  /* =========================
     ADMIN DOCUMENT REPORT
  ========================= */

  if (
    trimmedUrl.startsWith(
      "/admin/document-reports",
    )
  ) {
    return "/admin/reports";
  }

  /* =========================
     USER DOCUMENT REPORT
  ========================= */

  if (
    trimmedUrl.startsWith(
      "/document-reports",
    )
  ) {
    return "/app/dashboard";
  }

  /* =========================
     DOCUMENT
  ========================= */

  if (
    trimmedUrl.startsWith(
      "/documents/",
    )
  ) {
    const urlParts = trimmedUrl
      .split("?")[0]
      .split("#")[0]
      .split("/")
      .filter(Boolean);

    /*
     * /documents/12
     *
     * =>
     *
     * [
     *   "documents",
     *   "12"
     * ]
     */
    const documentId =
      urlParts[1];

    if (!documentId) {
      return null;
    }

    return `/app/library/${documentId}/preview`;
  }

  /* =========================
     SHARED FOLDER
  ========================= */

  if (
    trimmedUrl.startsWith(
      "/folders/",
    )
  ) {
    const urlParts = trimmedUrl
      .split("?")[0]
      .split("#")[0]
      .split("/")
      .filter(Boolean);

    /*
     * /folders/10
     *
     * =>
     *
     * [
     *   "folders",
     *   "10"
     * ]
     */
    const folderId =
      urlParts[1];

    if (!folderId) {
      return "/app/shared-with-me";
    }

    return `/app/shared/folders/${folderId}`;
  }

  /* =========================
     ROUTES ĐÃ ĐÚNG
  ========================= */

  /*
   * Những URL backend gửi đúng với FE
   * sẽ được giữ nguyên.
   *
   * Ví dụ:
   *
   * /app/upload
   * /app/shares
   * /app/shared-with-me
   * /app/notifications
   * /shared-upload/{token}
   */
  return trimmedUrl;
};