import { apiClient as api } from "./apiClient";
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

export interface GetDocumentsParams {
  userId?: number;
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

export interface CreateDocumentPayload {
  title: string;
  description?: string;
  tags?: string;
  userId: number;
  categoryId?: number;
  originalName?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
}

export interface UpdateDocumentPayload {
  title?: string;
  description?: string;
  tags?: string;
  userId?: number;
  categoryId?: number | null;
  originalName?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
}

export interface SearchDocumentsParams {
  keyword: string;
  userId?: number;
  page?: number;
  size?: number;
}

export interface SemanticSearchParams {
  query: string;
  documentId?: number;
  topK?: number;
}

export interface SemanticSearchResult {
  documentId: number;
  documentTitle: string;
  chunkIndex: number;
  score: number;
  finalScore: number;
  chunkText: string;
  charStart: number;
  charEnd: number;
  textLength: number;
  originalFileName: string;
  warning?: string;
  source?: string;
}

export interface SemanticSearchResponse {
  query: string;
  documentId: number;
  topK: number;
  resultCount: number;
  results: SemanticSearchResult[];
  error?: string;
}

const mapDocumentStatus = (status: string | undefined): DocumentStatus => {
  if (status === "DELETED") return "DELETED";
  return "ACTIVE";
};

const mapAiStatus = (status: string | undefined): AiStatus => {
  if (status === "PROCESSING") return "PROCESSING";
  if (status === "PROCESSED") return "PROCESSED";
  if (status === "FAILED") return "FAILED";
  return "UPLOADED";
};

const mapDocumentResponse = (
  document: DocumentResponse
): DocumentListItemResponse => ({
  ...document,
  id: document.id,
  name: document.title || document.originalName || document.fileName,
  type: document.fileType,
  documentStatus: mapDocumentStatus(document.status),
  aiStatus: mapAiStatus(document.processStatus),
  uploadedAt: document.createdAt,
  folder: document.categoryName || "Uncategorized",
});

const mapPageDocumentResponse = (
  page: PageDocumentResponse
): PageDocumentResponse => ({
  ...page,
  content: (page.content ?? []).map(mapDocumentResponse),
});

export const documentApi = {
  // GET /api/documents
  getDocuments(params?: GetDocumentsParams) {
    return api
      .get<PageDocumentResponse>("/api/documents", { params })
      .then((response) => ({
        ...response,
        data: mapPageDocumentResponse(response.data),
      }));
  },

  getDocumentsByUserId(userId: number, params?: GetDocumentsParams) {
    return this.getDocuments({ ...params, userId });
  },

  // GET /api/documents/{id}
  getDocumentById(id: number) {
    return api
      .get<DocumentResponse>(`/api/documents/${id}`)
      .then((response) => ({
        ...response,
        data: mapDocumentResponse(response.data),
      }));
  },

  // POST /api/documents
  createDocument(payload: CreateDocumentPayload) {
    return api
      .post<DocumentResponse>("/api/documents", payload)
      .then((response) => ({
        ...response,
        data: mapDocumentResponse(response.data),
      }));
  },

  // PUT /api/documents/{id}
  async updateDocument(id: number, payload: UpdateDocumentPayload) {
    /**
     * Backend hiện tại bắt buộc userId khi update.
     * Nhưng nhiều màn hình FE chỉ gửi title/description/categoryId.
     * Vì vậy mình lấy document hiện tại trước, rồi merge lại payload.
     */
    const currentResponse = await api.get<DocumentResponse>(`/api/documents/${id}`);
    const currentDocument = currentResponse.data;

    const updatePayload: UpdateDocumentPayload = {
      title: payload.title ?? currentDocument.title,
      description: payload.description ?? currentDocument.description ?? "",
      tags: payload.tags ?? currentDocument.tags ?? "",
      userId: payload.userId ?? currentDocument.userId,
      categoryId:
        payload.categoryId !== undefined
          ? payload.categoryId
          : currentDocument.categoryId,
      originalName: payload.originalName ?? currentDocument.originalName,
      fileUrl: payload.fileUrl ?? currentDocument.fileUrl,
      fileType: payload.fileType ?? currentDocument.fileType,
      fileSize: payload.fileSize ?? currentDocument.fileSize,
    };

    return api
      .put<DocumentResponse>(`/api/documents/${id}`, updatePayload)
      .then((response) => ({
        ...response,
        data: mapDocumentResponse(response.data),
      }));
  },

  // DELETE /api/documents/{id}
  deleteDocument(id: number) {
    return api.delete(`/api/documents/${id}`);
  },

  // POST /api/documents/upload
  uploadDocument(payload: UploadDocumentPayload) {
    const formData = new FormData();
    formData.append("file", payload.file);

    return api
      .post<DocumentResponse>("/api/documents/upload", formData, {
        params: {
          title: payload.title,
          description: payload.description,
          documentType: payload.documentType,
          visibility: payload.visibility,
          userId: payload.userId,
          categoryId: payload.categoryId,
        },
      })
      .then((response) => ({
        ...response,
        data: mapDocumentResponse(response.data),
      }));
  },

  // POST /api/documents/{id}/reprocess
  reprocessDocument(id: number) {
    return api
      .post<DocumentResponse>(`/api/documents/${id}/reprocess`)
      .then((response) => ({
        ...response,
        data: mapDocumentResponse(response.data),
      }));
  },

  // GET /api/documents/{id}/file
  getDocumentFile(id: number) {
    return api.get(`/api/documents/${id}/file`, {
      responseType: "blob",
    });
  },

  // GET /api/documents/{id}/download
  downloadDocument(id: number) {
    return api.get(`/api/documents/${id}/download`, {
      responseType: "blob",
    });
  },

  // GET /api/documents/search
  searchDocuments(params: SearchDocumentsParams) {
    return api
      .get<PageDocumentResponse>("/api/documents/search", { params })
      .then((response) => ({
        ...response,
        data: mapPageDocumentResponse(response.data),
      }));
  },

  // GET /api/documents/semantic-search
  semanticSearchDocuments(params: SemanticSearchParams) {
    return api.get<SemanticSearchResponse>("/api/documents/semantic-search", {
      params,
    });
  },

  // Dùng cho dropdown/select
  getAllDocumentsForSelect(userId: number) {
    return api
      .get<PageDocumentResponse>("/api/documents", {
        params: {
          page: 0,
          size: 100,
          userId,
        },
      })
      .then((response) =>
        (response.data.content ?? []).map(mapDocumentResponse)
      );
  },
};