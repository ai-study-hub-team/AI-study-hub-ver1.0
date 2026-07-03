import { apiClient } from "./apiClient";

export interface PublicDocumentResponse {
  documentId: number;
  title: string;
  description?: string;
  fileUrl: string;
  allowDownload: boolean;

  // FE dùng thêm mấy field này nếu BE có trả về
  fileName?: string;
  originalName?: string;
  contentType?: string;
}

export interface PublicDocumentShareLinkResponse {
  title: string | null;
  description: string | null;
  allowUpload: boolean;
  reason: string | null;
  expiresAt?: string;
}

export interface SubmitPublicDocumentParams {
  token: string;
  file: File;
  title?: string;
  description?: string;
  uploaderName?: string;
  uploaderEmail?: string;
  uploaderUserId?: number;
}

export interface PublicDocumentSubmissionResponse {
  id: number;
  shareLinkId: number;
  shareLinkTitle: string;
  ownerUserId: number;
  uploaderUserId?: number;
  uploaderName: string;
  uploaderEmail: string;
  originalFileName: string;
  fileType: string;
  fileSize: number;
  title: string;
  description: string;
  status: string;
  approvedDocumentId?: number;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: number;
  rejectReason?: string;
}

export const publicShareApi = {
  getPublicDocument: (token: string) =>
    apiClient.get<PublicDocumentResponse>(`/api/public/documents/${token}`),

  getPublicDocumentShareLink: (token: string) =>
    apiClient.get<PublicDocumentShareLinkResponse>(
      `/api/public/document-share-links/${token}`,
    ),

  submitPublicDocumentShareLink: ({
    token,
    file,
    title,
    description,
    uploaderName,
    uploaderEmail,
    uploaderUserId,
  }: SubmitPublicDocumentParams) => {
    const formData = new FormData();
    formData.append("file", file);

    if (title) formData.append("title", title);
    if (description) formData.append("description", description);
    if (uploaderName) formData.append("uploaderName", uploaderName);
    if (uploaderEmail) formData.append("uploaderEmail", uploaderEmail);
    if (uploaderUserId !== undefined) {
      formData.append("uploaderUserId", String(uploaderUserId));
    }

    return apiClient.post<PublicDocumentSubmissionResponse>(
      `/api/public/document-share-links/${token}/submissions`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
  },
};