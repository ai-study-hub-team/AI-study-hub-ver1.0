import { apiClient } from "./apiClient";

export type SharePermission = "VIEW" | "EDIT" | "COMMENT" | string;

export interface ShareDocumentRequest {
  emails: string[];
  permission: SharePermission;
  expiresAt?: string;
}

export interface ShareDocumentResponse {
  message: string;
  sharedEmails: string[];
  notRegisteredEmails: string[];
  alreadySharedEmails: string[];
}

export interface SharedUserResponse {
  userId: number;
  fullName: string;
  email: string;
  permission: string;
  status: string;
  createdAt: string;
  expiresAt?: string;
}

export interface DocumentShareResponse {
  id?: number;
  shareId?: number;
  userId?: number;
  email?: string;
  fullName?: string;
  permission?: string;
  status?: string;
  createdAt?: string;
  expiresAt?: string;
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

  getSharedUsers: (documentId: number) =>
    apiClient.get<SharedUserResponse[]>(
      `/api/documents/${documentId}/shares/users`,
    ),

  shareDocumentToUsers: (documentId: number, data: ShareDocumentRequest) =>
    apiClient.post<ShareDocumentResponse>(
      `/api/documents/${documentId}/shares/users`,
      data,
    ),

  revokeShareByShareId: (documentId: number, shareId: number) =>
    apiClient.patch<void>(
      `/api/documents/${documentId}/shares/${shareId}/revoke`,
    ),

  deleteSharedUser: (documentId: number, userId: number) =>
    apiClient.delete<void>(
      `/api/documents/${documentId}/shares/users/${userId}`,
    ),
};