import { apiClient } from "./apiClient";

export type DocumentReportStatus = "PENDING" | "REVIEWING" | "RESOLVED" | "REJECTED";
export type DocumentReportReason = "COPYRIGHT" | "SPAM" | "INAPPROPRIATE_CONTENT" | "MISLEADING" | "OTHER";

export interface DocumentReportResponse {
  id: number;
  documentId: number;
  documentTitle: string;
  reporterId: number;
  reporterEmail: string;
  ownerId: number;
  ownerEmail: string;
  reason: DocumentReportReason;
  description?: string | null;
  status: DocumentReportStatus;
  adminNote?: string | null;
  handledById?: number | null;
  handledByEmail?: string | null;
  handledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface GetAdminReportsParams {
  status?: DocumentReportStatus;
  reason?: DocumentReportReason;
  page?: number;
  size?: number;
}

export interface UpdateReportStatusPayload {
  status: DocumentReportStatus;
  adminNote?: string;
  hideDocument?: boolean;
}

export const adminDocumentReportApi = {
  getReports: (params: GetAdminReportsParams = {}) =>
    apiClient.get<PageResponse<DocumentReportResponse>>("/api/admin/document-reports", { params }),
  getReport: (reportId: number) =>
    apiClient.get<DocumentReportResponse>(`/api/admin/document-reports/${reportId}`),
  updateStatus: (reportId: number, payload: UpdateReportStatusPayload) =>
    apiClient.patch<DocumentReportResponse>(`/api/admin/document-reports/${reportId}/status`, payload),
};
