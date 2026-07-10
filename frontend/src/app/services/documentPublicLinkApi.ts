import { apiClient } from "./apiClient";

export interface CreatePublicLinkRequest {
  allowDownload: boolean;
  expiresAt?: string;
}

export interface PublicLinkResponse {
  publicUrl: string;
  token: string;
  allowDownload: boolean;
  isActive: boolean;
  expiresAt?: string;
}

export const documentPublicLinkApi = {
  createPublicLink: (documentId: number, data: CreatePublicLinkRequest) =>
    apiClient.post<PublicLinkResponse>(
      `/api/documents/${documentId}/shares/public-link`,
      data,
    ),

  disablePublicLink: (documentId: number) =>
    apiClient.patch<void>(
      `/api/documents/${documentId}/shares/public-link/disable`,
    ),
};