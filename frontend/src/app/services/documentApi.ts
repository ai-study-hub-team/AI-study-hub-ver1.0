import { apiClient as api, getCurrentUserId } from "./apiClient";
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
import { filterMyDocuments } from "../utils/documentOwnership";

export interface GetDocumentsParams {
  userId?: number;
  page?: number;
  size?: number;
  keyword?: string;
  categoryId?: number;
  folderId?: number | null;
  rootOnly?: boolean;
  processStatus?: ProcessStatus;
  fileType?: string;
  tag?: string;
  fromDate?: string;
  toDate?: string;
}


export interface GetAiReadyDocumentsParams {
  page?: number;
  size?: number;
  keyword?: string;
  categoryId?: number;
  fileType?: string;
  tag?: string;
  fromDate?: string;
  toDate?: string;
}

export interface UploadDocumentPayload {
  file: File;
  title: string;
  userId: number;
  folderId?: number | null;
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
  folderId?: number | null;
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
  folderId?: number | null;
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

type BackendDocumentResponse = DocumentResponse & {
  // Spring/Jackson may serialize a primitive boolean field named isTrashed as "trashed".
  trashed?: boolean;
};

type DocumentWithFolderMeta = DocumentResponse & {
  folderId?: number | null;
  folderName?: string | null;
  folder?: string | { id?: number; name?: string | null } | null;
  parentFolderName?: string | null;
};

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

const getDocumentFolderName = (document: DocumentResponse): string => {
  const item = document as DocumentWithFolderMeta;

  if (typeof item.folderName === "string" && item.folderName.trim()) {
    return item.folderName.trim();
  }

  if (typeof item.folder === "string" && item.folder.trim()) {
    return item.folder.trim();
  }

  if (
    typeof item.folder === "object" &&
    item.folder !== null &&
    typeof item.folder.name === "string" &&
    item.folder.name.trim()
  ) {
    return item.folder.name.trim();
  }

  if (
    typeof item.parentFolderName === "string" &&
    item.parentFolderName.trim()
  ) {
    return item.parentFolderName.trim();
  }

  return "Root";
};

const mapDocumentResponse = (
  document: DocumentResponse,
): DocumentListItemResponse => {
  const backendDocument = document as BackendDocumentResponse;

  return {
    ...document,
    id: document.id,
    name: document.title || document.originalName || document.fileName,
    type: document.fileType,
    documentStatus: mapDocumentStatus(document.status),
    aiStatus: mapAiStatus(document.processStatus),
    uploadedAt: document.createdAt,
    folder: getDocumentFolderName(document),
    // Normalize both possible backend JSON property names.
    isTrashed:
      typeof document.isTrashed === "boolean"
        ? document.isTrashed
        : backendDocument.trashed === true,
  };
};

const mapPageDocumentResponse = (
  page: PageDocumentResponse,
): PageDocumentResponse => ({
  ...page,
  content: (page.content ?? []).map(mapDocumentResponse),
});

const buildDocumentListParams = (params?: GetDocumentsParams) => {
  const { userId, folderId, rootOnly, ...rest } = params ?? {};

  const queryParams: Record<string, unknown> = {
    page: rest.page ?? 0,
    size: rest.size ?? 10,
  };

  if (rest.keyword) queryParams.keyword = rest.keyword;
  if (rest.categoryId !== undefined) queryParams.categoryId = rest.categoryId;
  if (rest.processStatus) queryParams.processStatus = rest.processStatus;
  if (rest.fileType) queryParams.fileType = rest.fileType;
  if (rest.tag) queryParams.tag = rest.tag;
  if (rest.fromDate) queryParams.fromDate = rest.fromDate;
  if (rest.toDate) queryParams.toDate = rest.toDate;

  if (typeof folderId === "number") {
    queryParams.folderId = folderId;
  }

  if (rootOnly === true) {
    queryParams.rootOnly = true;
  }

  return queryParams;
};

export const documentApi = {
  // GET /api/documents/search-filter
  getDocuments(params?: GetDocumentsParams) {
    const queryParams = buildDocumentListParams(params);

    return api
      .get<PageDocumentResponse>("/api/documents/search-filter", {
        params: queryParams,
      })
      .then((response) => ({
        ...response,
        data: mapPageDocumentResponse(response.data),
      }));
  },

  /**
   * Giữ lại hàm này để các page cũ không bị lỗi TypeScript.
   * Không gửi userId vào GET /api/documents vì backend đang lỗi khi có userId.
   */
  getDocumentsByUserId(_userId: number, params?: GetDocumentsParams) {
    return this.getDocuments(params);
  },

  // GET /api/documents/ai-ready
  getAiReadyDocuments(params?: GetAiReadyDocumentsParams) {
    return api
      .get<PageDocumentResponse>("/api/documents/ai-ready", {
        params: {
          page: params?.page ?? 0,
          size: params?.size ?? 100,
          keyword: params?.keyword || undefined,
          categoryId: params?.categoryId,
          fileType: params?.fileType || undefined,
          tag: params?.tag || undefined,
          fromDate: params?.fromDate || undefined,
          toDate: params?.toDate || undefined,
        },
      })
      .then((response) => ({
        ...response,
        data: mapPageDocumentResponse(response.data),
      }));
  },

  // Used by AI document selectors.
  getAiReadyDocumentsForSelect(userId?: number) {
    const currentUserId = userId ?? getCurrentUserId();

    return this.getAiReadyDocuments({ page: 0, size: 100 }).then((response) =>
      filterMyDocuments(response.data.content ?? [], currentUserId),
    );
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
    const currentResponse = await api.get<DocumentResponse>(
      `/api/documents/${id}`,
    );

    const currentDocument = currentResponse.data;

    const updatePayload: UpdateDocumentPayload = {
      title: payload.title ?? currentDocument.title,
      description: payload.description ?? currentDocument.description ?? "",
      tags: payload.tags ?? currentDocument.tags ?? "",
      userId: payload.userId ?? currentDocument.userId,
      folderId:
        payload.folderId !== undefined
          ? payload.folderId
          : (currentDocument as DocumentWithFolderMeta).folderId,
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

  // DELETE /api/documents/{id} - move to trash
  deleteDocument(id: number) {
    return api
      .delete<DocumentResponse>(`/api/documents/${id}`)
      .then((response) => ({
        ...response,
        data: mapDocumentResponse(response.data),
      }));
  },

  // Explicit alias for the current trash workflow.
  moveDocumentToTrash(id: number) {
    return this.deleteDocument(id);
  },

  // GET /api/documents/trash
  getTrashDocuments() {
    return api
      .get<DocumentResponse[]>("/api/documents/trash")
      .then((response) => ({
        ...response,
        data: (response.data ?? []).map(mapDocumentResponse),
      }));
  },

  // POST /api/documents/{id}/restore
  restoreDocument(id: number) {
    return api
      .post<DocumentResponse>(`/api/documents/${id}/restore`)
      .then((response) => ({
        ...response,
        data: mapDocumentResponse(response.data),
      }));
  },

  // DELETE /api/documents/{id}/permanent - returns 204 No Content
  permanentlyDeleteDocument(id: number) {
    return api.delete<void>(`/api/documents/${id}/permanent`);
  },

  // POST /api/documents/upload
  uploadDocument(payload: UploadDocumentPayload) {
    const formData = new FormData();
    formData.append("file", payload.file);

    const params: Record<string, unknown> = {
      title: payload.title,
      userId: payload.userId,
    };

    if (payload.description) params.description = payload.description;
    if (payload.documentType) params.documentType = payload.documentType;
    if (payload.visibility) params.visibility = payload.visibility;
    if (payload.folderId !== undefined && payload.folderId !== null) {
      params.folderId = payload.folderId;
    }
    if (payload.categoryId !== undefined) {
      params.categoryId = payload.categoryId;
    }

    return api
      .post<DocumentResponse>("/api/documents/upload", formData, {
        params,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((response) => ({
        ...response,
        data: mapDocumentResponse(response.data),
      }));
  },

  // PATCH /api/documents/{id}/folder
  moveDocumentToFolder(
    id: number,
    payload: {
      userId: number;
      folderId: number | null;
    },
  ) {
    return api
      .patch<DocumentResponse>(`/api/documents/${id}/folder`, payload)
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
    const { userId, ...safeParams } = params;

    return api
      .get<PageDocumentResponse>("/api/documents/search", {
        params: safeParams,
      })
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

  // Used by dropdowns and selectors.
  getAllDocumentsForSelect(_userId?: number) {
    const currentUserId = _userId ?? getCurrentUserId();

    return api
      .get<PageDocumentResponse>("/api/documents/search-filter", {
        params: {
          page: 0,
          size: 100,
        },
      })
      .then((response) =>
        filterMyDocuments(response.data.content ?? [], currentUserId).map(
          mapDocumentResponse,
        ),
      );
  },
};