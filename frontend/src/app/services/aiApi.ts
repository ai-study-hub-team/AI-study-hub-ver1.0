import axios from "axios";

const API_BASE = "http://localhost:8080/api";

export const generateSummaryApi = (userId: number, documentId: number) => {
  return axios.post(`${API_BASE}/summaries/generate`, {
    userId,
    documentId,
    summaryType: "SHORT",
  });
};

export const getSummaryByDocumentApi = (documentId: number) => {
  return axios.get(`${API_BASE}/summaries/document/${documentId}`);
};

export const getSummariesApi = (userId: number) => {
  return axios.get(`${API_BASE}/summaries`, {
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
  return axios.post(`${API_BASE}/quizzes/generate`, data);
};

export const getQuizzesApi = (userId: number) => {
  return axios.get(`${API_BASE}/quizzes`, {
    params: { userId },
  });
};

export const getQuizByIdApi = (quizId: number, userId: number) => {
  return axios.get(`${API_BASE}/quizzes/${quizId}`, {
    params: { userId },
  });
};