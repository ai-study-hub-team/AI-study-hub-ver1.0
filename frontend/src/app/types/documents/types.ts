import type {
  AiStatus as UiAiStatus,
  DocumentStatus as UiDocumentStatus,
} from "../../constants/documentStatus";

export type ProcessStatus = "UPLOADED" | "PROCESSING" | "PROCESSED" | "FAILED";
export type BackendDocumentStatus = "ACTIVE" | "DELETED";

export interface DocumentResponse {
  id: number;
  title: string;
  description: string;
  tags: string;
  status: BackendDocumentStatus;
  processStatus: ProcessStatus;
  userId: number;
  categoryId: number;
  categoryName: string;
  cloudFileId: number;
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  storageProvider: string;
  createdAt: string;
  updatedAt: string;
  processedAt: string;
  processErrorMessage: string;
  chunkCount: number;
}

export interface DocumentListItemResponse extends DocumentResponse {
  name: string;
  type: string;
  documentStatus: UiDocumentStatus;
  aiStatus: UiAiStatus;
  uploadedAt: string;
  folder: string;
}

export interface PageDocumentResponse {
  content: DocumentListItemResponse[];
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  size: number;
}
