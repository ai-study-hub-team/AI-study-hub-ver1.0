import { apiClient } from "./apiClient";

export type SharedDocumentSubmissionStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | string;

export interface SharedDocumentSubmissionResponse {
  id: number;
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
  rejectReason?: string | null;
}

export interface GetSubmissionsParams {
  userId: number;
  status?: string;
}

export interface ApproveSubmissionPayload {
  userId: number;
  title: string;
  description?: string;
  categoryId?: number;
  folderId?: number | null;
  visibility: string;
  documentType: string;
}

export interface RejectSubmissionPayload {
  userId: number;
  reason: string;
}

export const sharedDocumentSubmissionApi = {
  getSubmissions: (params: GetSubmissionsParams) => {
    return apiClient.get("/api/shared-document-submissions", {
      params,
    });
  },

  getSubmission: (id: number, userId: number) => {
    return apiClient.get<SharedDocumentSubmissionResponse>(
      `/api/shared-document-submissions/${id}`,
      {
        params: { userId },
      },
    );
  },

  approveSubmission: (id: number, payload: ApproveSubmissionPayload) => {
    return apiClient.post(
      `/api/shared-document-submissions/${id}/approve`,
      payload,
    );
  },

  rejectSubmission: (id: number, payload: RejectSubmissionPayload) => {
    return apiClient.post(
      `/api/shared-document-submissions/${id}/reject`,
      payload,
    );
  },
};