import { apiClient } from "./apiClient";

export type SharePermission = "VIEW" | "DOWNLOAD";

export interface ShareDocumentRequest {
  emails: string[];
  permission: SharePermission;
  expiresAt?: string | null;
}

export interface ShareDocumentResponse {
  message: string;
  sharedEmails: string[];
  alreadySharedEmails: string[];
  notFoundEmails: string[];

  // Backward-compatible alias for older backend builds, if any.
  notRegisteredEmails?: string[];
}

export interface DocumentShareResponse {
  shareId: number;
  userId: number;
  fullName: string;
  email: string;
  permission: SharePermission | string;
  status: string;
  sharedAt?: string;
  createdAt?: string;
  expiresAt?: string | null;
}

export const documentShareApi = {
  getDocumentShares: (documentId: number) =>
    apiClient.get<DocumentShareResponse[]>(
      `/api/documents/${documentId}/shares`,
    ),

  shareDocument: (documentId: number, data: ShareDocumentRequest) =>
    apiClient.post<ShareDocumentResponse>(
      `/api/documents/${documentId}/shares`,
      data,
    ),

  revokeDocumentShare: (documentId: number, targetUserId: number) =>
    apiClient.delete<void>(
      `/api/documents/${documentId}/shares/${targetUserId}`,
    ),

  // Legacy method names kept so existing imports do not break.
  getSharedUsers: (documentId: number) =>
    documentShareApi.getDocumentShares(documentId),

  shareDocumentToUsers: (documentId: number, data: ShareDocumentRequest) =>
    documentShareApi.shareDocument(documentId, data),

  deleteSharedUser: (documentId: number, userId: number) =>
    documentShareApi.revokeDocumentShare(documentId, userId),
};
