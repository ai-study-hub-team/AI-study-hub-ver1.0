import { apiClient as api } from "./apiClient";

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

export const documentNoteApi = {
  createNote: (payload: CreateDocumentNotePayload) =>
    api.post<DocumentNoteResponse>("/api/document-notes", payload),

  getNoteById: (noteId: number, userId: number) =>
    api.get<DocumentNoteResponse>(`/api/document-notes/${noteId}`, {
      params: { userId },
    }),

  deleteNote: (noteId: number, userId: number) =>
    api.delete(`/api/document-notes/${noteId}`, {
      params: { userId },
    }),

  updateNote: (noteId: number, payload: UpdateDocumentNotePayload) =>
    api.patch<DocumentNoteResponse>(
      `/api/document-notes/${noteId}`,
      payload,
    ),

  getNotesByDocumentId: (documentId: number, userId: number) =>
    api.get<DocumentNoteResponse[]>(
      `/api/document-notes/document/${documentId}`,
      {
        params: { userId },
      },
    ),
};