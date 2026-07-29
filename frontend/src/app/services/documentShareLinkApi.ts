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
  remainingUploads?: number | null;
  maxUploadsPerUser?: number | null;
  maxFileSizeBytes?: number | null;
  maxTotalBytes?: number | null;
  activeStoredBytes?: number | null;
  remainingTotalBytes?: number | null;
  allowedFileTypes?: string | null;
  allowedFileTypesList?: string[];
  accessPolicy?: "PRIVATE_ALLOWLIST" | "ANY_AUTHENTICATED_USER" | string;
  allowedUserIds?: number[];
  allowedUserEmails?: string[];
  defaultFolderId?: number | null;
  defaultFolderName?: string | null;
  token?: string | null;
  shareUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDocumentShareLinkRequest {
  title: string;
  description?: string;
  expiresAt?: string;
  maxUploads: number;
  maxUploadsPerUser: number;
  maxFileSizeBytes: number;
  maxTotalBytes: number;
  allowedFileTypes: string;
  accessPolicy: "PRIVATE_ALLOWLIST" | "ANY_AUTHENTICATED_USER";
  allowedUserEmails: string[];
  defaultFolderId?: number | null;
}

export interface UpdateDocumentShareLinkAllowlistRequest {
  userEmailsToAdd: string[];
  userEmailsToRemove: string[];
}

export const documentShareLinkApi = {
  getDocumentShareLinks: () =>
    apiClient.get<DocumentShareLinkResponse[]>("/api/document-share-links"),

  createDocumentShareLink: (data: CreateDocumentShareLinkRequest) =>
    apiClient.post<DocumentShareLinkResponse>(
      "/api/document-share-links",
      data,
    ),

  disableDocumentShareLink: (id: number) =>
    apiClient.patch<DocumentShareLinkResponse>(
      `/api/document-share-links/${id}/disable`,
      null,
    ),

  updateDocumentShareLinkAllowlist: (
    id: number,
    data: UpdateDocumentShareLinkAllowlistRequest,
  ) =>
    apiClient.patch<DocumentShareLinkResponse>(
      `/api/document-share-links/${id}/allowlist`,
      data,
    ),
};
