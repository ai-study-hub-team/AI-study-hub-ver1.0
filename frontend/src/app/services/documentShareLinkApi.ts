import { apiClient } from "./apiClient";

export type DocumentShareLinkStatus = "ACTIVE" | "DISABLED" | "EXPIRED" | string;

export interface DocumentShareLinkResponse {
  id: number;
  ownerUserId: number;
  title: string;
  description?: string | null;
  status: DocumentShareLinkStatus;
  expiresAt?: string | null;
  maxUploads?: number | null;
  currentUploads?: number | null;
  defaultFolderId?: number | null;
  defaultFolderName?: string | null;
  token?: string | null;
  shareUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDocumentShareLinkRequest {
  userId: number;
  title: string;
  description?: string;
  expiresAt?: string;
  maxUploads?: number;
  defaultFolderId?: number;
}

export const documentShareLinkApi = {
  getDocumentShareLinks: (userId: number) =>
    apiClient.get<DocumentShareLinkResponse[]>("/api/document-share-links", {
      params: {
        userId,
      },
    }),

  createDocumentShareLink: (data: CreateDocumentShareLinkRequest) =>
    apiClient.post<DocumentShareLinkResponse>(
      "/api/document-share-links",
      data,
    ),

  disableDocumentShareLink: (id: number, userId: number) =>
    apiClient.patch<DocumentShareLinkResponse>(
      `/api/document-share-links/${id}/disable`,
      null,
      {
        params: {
          userId,
        },
      },
    ),
};
