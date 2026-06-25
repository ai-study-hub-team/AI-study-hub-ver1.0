import { apiClient } from "./apiClient";

export const generateSummaryApi = (userId: number, documentId: number) => {
  return apiClient.post("/api/summaries/generate", {
    userId,
    documentId,
    summaryType: "SHORT",
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