import axios from "axios";
import type {
  AiStatus,
  DocumentStatus,
} from "../constants/documentStatus";
import type {
  DocumentListItemResponse,
  DocumentResponse,
  PageDocumentResponse,
  ProcessStatus,
} from "../types/documents/types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
});

export interface GetDocumentsParams {
  page?: number;
  size?: number;
  keyword?: string;
  categoryId?: number;
  processStatus?: ProcessStatus;
  fileType?: string;
  tag?: string;
  fromDate?: string;
  toDate?: string;
}

export interface UploadDocumentPayload {
  file: File;
  title: string;
  userId: number;
  description?: string;
  documentType?: string;
  visibility?: string;
  categoryId?: number;
}

const mapDocumentStatus = (status: string | undefined): DocumentStatus => {
  if (status === "DELETED") return "DELETED";
  if (status === "UPLOAD_FAILED") return "UPLOAD_FAILED";
  if (status === "UPLOADING") return "UPLOADING";
  return "UPLOADED";
};

const mapAiStatus = (status: string | undefined): AiStatus => {
  if (status === "PROCESSED" || status === "READY") return "READY";
  if (status === "PROCESSING") return "PROCESSING";
  if (status === "FAILED") return "FAILED";
  return "PENDING";
};

const mapDocumentResponse = (document: DocumentResponse): DocumentListItemResponse => ({
  ...document,
  id: document.id,
  name: document.title || document.originalName || document.fileName,
  type: document.fileType,
  documentStatus: mapDocumentStatus(document.status),
  aiStatus: mapAiStatus(document.processStatus),
  uploadedAt: document.createdAt,
  folder: document.categoryName || "Uncategorized",
});

const mapPageDocumentResponse = (page: PageDocumentResponse): PageDocumentResponse => ({
  ...page,
  content: (page.content ?? []).map(mapDocumentResponse),
});

export const documentApi = {
  getDocuments(params?: GetDocumentsParams) {
    return api
      .get<PageDocumentResponse>("/api/documents", { params })
      .then((response) => ({
        ...response,
        data: mapPageDocumentResponse(response.data),
      }));
  },

  uploadDocument(payload: UploadDocumentPayload) {
    const formData = new FormData();
    formData.append("file", payload.file);

    return api.post<DocumentResponse>("/api/documents/upload", formData, {
      params: {
        title: payload.title,
        description: payload.description,
        documentType: payload.documentType,
        visibility: payload.visibility,
        userId: payload.userId,
        categoryId: payload.categoryId,
      },
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  reprocessDocument(id: number) {
    return api.post<DocumentResponse>(`/api/documents/${id}/reprocess`);
  },

  deleteDocument(id: number) {
    return api.delete(`/api/documents/${id}`);
  },
};
