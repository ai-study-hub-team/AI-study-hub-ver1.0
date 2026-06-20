import axios from "axios";

const API_BASE_URL = "http://localhost:8080/api";

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
    axios.post<DocumentNoteResponse>(`${API_BASE_URL}/document-notes`, payload),

  getNoteById: (noteId: number, userId: number) =>
    axios.get<DocumentNoteResponse>(
      `${API_BASE_URL}/document-notes/${noteId}`,
      {
        params: { userId },
      },
    ),

  deleteNote: (noteId: number, userId: number) =>
    axios.delete(`${API_BASE_URL}/document-notes/${noteId}`, {
      params: { userId },
    }),

  updateNote: (noteId: number, payload: UpdateDocumentNotePayload) =>
    axios.patch<DocumentNoteResponse>(
      `${API_BASE_URL}/document-notes/${noteId}`,
      payload,
    ),

  getNotesByDocumentId: (documentId: number, userId: number) =>
    axios.get<DocumentNoteResponse[]>(
      `${API_BASE_URL}/document-notes/document/${documentId}`,
      {
        params: { userId },
      },
    ),
};