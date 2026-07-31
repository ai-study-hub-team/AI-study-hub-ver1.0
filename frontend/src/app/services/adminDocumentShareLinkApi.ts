import { apiClient } from "./apiClient";

export type AdminShareLinkStatus = "ACTIVE" | "DISABLED" | "EXPIRED" | "REVOKED";

export interface AdminDocumentShareLinkResponse {
  id: number;
  title?: string | null;
  status: AdminShareLinkStatus;
  accessPolicy?: string | null;
  ownerUserId: number;
  ownerName?: string | null;
  ownerEmail?: string | null;
  expiresAt?: string | null;
  maxUploads?: number | null;
  currentUploads: number;
  maxUploadsPerUser?: number | null;
  maxFileSizeBytes?: number | null;
  maxTotalBytes?: number | null;
  activeStoredBytes: number;
  allowedFileTypes?: string | null;
  createdAt?: string | null;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const adminDocumentShareLinkApi = {
  getLinks: (params: { page: number; size: number; status?: string; keyword?: string }) =>
    apiClient.get<PageResponse<AdminDocumentShareLinkResponse>>(
      "/api/admin/document-share-links",
      { params },
    ),
  disableLink: (id: number) =>
    apiClient.patch<AdminDocumentShareLinkResponse>(
      `/api/admin/document-share-links/${id}/disable`,
      null,
    ),
  deleteLink: (id: number) =>
    apiClient.delete(`/api/admin/document-share-links/${id}`),
};
