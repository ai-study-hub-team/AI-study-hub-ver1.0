import { apiClient } from "./apiClient";

export type SummaryType = "SHORT" | "DETAILED" | "BULLET_POINTS";

export const generateSummaryApi = (
  userId: number,
  documentId: number,
  summaryType: SummaryType = "SHORT"
) => {
  return apiClient.post("/api/summaries/generate", {
    userId,
    documentId,
    summaryType,
  });
};

export const getSummaryByDocumentApi = (
  documentId: number,
  userId: number
) => {
  return apiClient.get(`/api/summaries/document/${documentId}`, {
    params: { userId },
  });
};

export const getSummariesApi = (userId: number) => {
  return apiClient.get("/api/summaries", {
    params: { userId },
  });
};

export const generateQuizApi = (data: {
  userId: number;
  documentId: number;
  questionCount: number;
  difficulty: string;
  quizType: string;
}) => {
  return apiClient.post("/api/quizzes/generate", data);
};

export const getQuizzesApi = (userId: number) => {
  return apiClient.get("/api/quizzes", {
    params: { userId },
  });
};

export const getQuizByIdApi = (quizId: number, userId: number) => {
  return apiClient.get(`/api/quizzes/${quizId}`, {
    params: { userId },
  });
};