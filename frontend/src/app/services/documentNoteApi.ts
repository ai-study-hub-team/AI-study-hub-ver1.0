import { apiClient as api, getCurrentUserId } from "./apiClient";

export interface DocumentNoteResponse {
  id: number;
  userId: number;
  documentId: number;
  documentTitle: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentNotePayload {
  userId: number;
  documentId: number;
  title: string;
  content: string;
}

export interface UpdateDocumentNotePayload {
  userId: number;
  title: string;
  content: string;
}

const resolveUserId = (userId?: number | null) => {
  const resolvedUserId = userId ?? getCurrentUserId();

  if (!resolvedUserId) {
    throw new Error("Missing userId. Please login again.");
  }

  return resolvedUserId;
};

export const documentNoteApi = {
  createNote: (payload: CreateDocumentNotePayload) => {
    return api.post<DocumentNoteResponse>("/api/document-notes", payload);
  },

  getNoteById: (noteId: number, userId?: number | null) => {
    return api.get<DocumentNoteResponse>(`/api/document-notes/${noteId}`, {
      params: {
        userId: resolveUserId(userId),
      },
    });
  },

  deleteNote: (noteId: number, userId?: number | null) => {
    return api.delete(`/api/document-notes/${noteId}`, {
      params: {
        userId: resolveUserId(userId),
      },
    });
  },

  updateNote: (noteId: number, payload: UpdateDocumentNotePayload) => {
    return api.patch<DocumentNoteResponse>(
      `/api/document-notes/${noteId}`,
      payload,
    );
  },

  getNotesByDocumentId: (documentId: number, userId?: number | null) => {
    return api.get<DocumentNoteResponse[]>(
      `/api/document-notes/document/${documentId}`,
      {
        params: {
          userId: resolveUserId(userId),
        },
      },
    );
  },
};