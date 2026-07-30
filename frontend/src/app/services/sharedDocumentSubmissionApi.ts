import { apiClient } from "./apiClient";

export type SharedDocumentSubmissionStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | string;

export interface SharedDocumentSubmissionResponse {
  id: number;
  shareLinkId?: number | null;
  shareLinkTitle?: string | null;
  ownerUserId?: number | null;
  uploaderUserId?: number | null;
  title?: string | null;
  description?: string | null;
  status: SharedDocumentSubmissionStatus;

  originalFileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;

  uploaderName?: string | null;
  uploaderEmail?: string | null;

  submittedAt?: string | null;
  createdAt?: string | null;

  approvedDocumentId?: number | null;
  reviewedAt?: string | null;
  reviewedBy?: number | null;
  rejectReason?: string | null;
  deleteAfter?: string | null;
  quotaReleasedAt?: string | null;
}

export interface GetSubmissionsParams {
  status?: string;
}

export interface ApproveSubmissionPayload {
  title: string;
  description?: string;
  categoryId?: number;
  folderId?: number | null;
  visibility: string;
  documentType: string;
}

export interface RejectSubmissionPayload {
  reason: string;
}

export const sharedDocumentSubmissionApi = {
  getSubmissions: (params: GetSubmissionsParams) => {
    return apiClient.get<SharedDocumentSubmissionResponse[]>(
      "/api/shared-document-submissions",
      { params },
    );
  },

  getSubmission: (id: number) => {
    return apiClient.get<SharedDocumentSubmissionResponse>(
      `/api/shared-document-submissions/${id}`,
    );
  },

  approveSubmission: (id: number, payload: ApproveSubmissionPayload) => {
    return apiClient.post(
      `/api/shared-document-submissions/${id}/approve`,
      payload,
    );
  },

  rejectSubmission: (id: number, payload: RejectSubmissionPayload) => {
    return apiClient.post<SharedDocumentSubmissionResponse>(
      `/api/shared-document-submissions/${id}/reject`,
      payload,
    );
  },
  viewSubmissionFile: async (id: number): Promise<Blob> => {
    const response = await apiClient.get(`/api/shared-document-submissions/${id}/preview`, {
      responseType: "blob",
    });
    return response.data;
  },

  downloadSubmissionFile: async (id: number): Promise<Blob> => {
    const response = await apiClient.get(`/api/shared-document-submissions/${id}/download`, {
      responseType: "blob",
    });
    return response.data;
  },

};
