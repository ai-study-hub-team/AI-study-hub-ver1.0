import { apiClient } from "./apiClient";

export interface DocumentChunkResponse {
  id: number;
  documentId: number;
  chunkIndex: number;

  chunkText?: string;
  content?: string;
  text?: string;
  chunkContent?: string;
  chunk?: string;
  previewText?: string;
  snippet?: string;
  matchedText?: string;

  documentTitle?: string;
  title?: string;
  documentName?: string;
  originalName?: string;
  fileName?: string;

  pageNumber?: number | null;
  createdAt?: string;
}


export interface ChunkResolveItemRequest {
  documentId: number;
  chunkIndex: number;
}

export interface ChunkResolveItemResponse extends ChunkResolveItemRequest {
  chunkText?: string | null;
  found: boolean;
}

export interface ChunkResolveBatchResponse {
  chunks: ChunkResolveItemResponse[];
}

export interface PageChunkResponse {
  content: DocumentChunkResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

export const documentChunkApi = {
  getDocumentChunks: async (
    documentId: number,
  ): Promise<DocumentChunkResponse[]> => {
    const response = await apiClient.get<DocumentChunkResponse[]>(
      `/api/documents/${documentId}/chunks`,
    );

    return response.data;
  },

  searchDocumentChunks: async (
    documentId: number,
    keyword: string,
  ): Promise<DocumentChunkResponse[]> => {
    const response = await apiClient.get<DocumentChunkResponse[]>(
      `/api/documents/${documentId}/chunks/search`,
      {
        params: {
          keyword,
        },
      },
    );

    return response.data;
  },

  countDocumentChunks: async (documentId: number): Promise<number> => {
    const response = await apiClient.get<number>(
      `/api/documents/${documentId}/chunks/count`,
    );

    return response.data;
  },

  searchAllChunks: async (
    keyword: string,
    page = 0,
    size = 10,
  ): Promise<PageChunkResponse | DocumentChunkResponse[]> => {
    const response = await apiClient.get<
      PageChunkResponse | DocumentChunkResponse[]
    >("/api/chunks/search", {
      params: {
        keyword,
        page,
        size,
      },
    });

    return response.data;
  },
  resolveChunks: async (chunks: ChunkResolveItemRequest[]): Promise<ChunkResolveBatchResponse> => {
    const response = await apiClient.post<ChunkResolveBatchResponse>(
      "/api/internal/chunks/resolve",
      { chunks },
    );

    return response.data;
  },
};