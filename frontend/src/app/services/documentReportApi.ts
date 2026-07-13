import { apiClient } from "./apiClient";
import type { DocumentReportReason, DocumentReportResponse } from "./adminDocumentReportApi";

export interface ReportDocumentPayload {
  reason: DocumentReportReason;
  description?: string;
}

export const documentReportApi = {
  reportDocument: (documentId: number, payload: ReportDocumentPayload) =>
    apiClient.post<DocumentReportResponse>(`/api/documents/${documentId}/reports`, payload),
};
