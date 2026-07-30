import { apiClient } from "./apiClient";

/* =========================================================
   SUMMARY
========================================================= */

export type SummaryType =
  | "SHORT"
  | "DETAILED"
  | "BULLET_POINTS";

/**
 * POST /api/summaries/generate
 *
 * Backend lấy user hiện tại từ JWT.
 * FE không gửi userId.
 */
export const generateSummaryApi = (
  documentId: number,
  summaryType: SummaryType = "SHORT",
) => {
  return apiClient.post("/api/summaries/generate", {
    documentId,
    summaryType,
  });
};

/**
 * GET /api/summaries/document/{documentId}
 */
export const getSummaryByDocumentApi = (
  documentId: number,
) => {
  return apiClient.get(
    `/api/summaries/document/${documentId}`,
  );
};

/**
 * GET /api/summaries
 */
export const getSummariesApi = () => {
  return apiClient.get("/api/summaries");
};

/* =========================================================
   QUIZ TYPES
========================================================= */

export type QuizDifficulty =
  | "EASY"
  | "MEDIUM"
  | "HARD";

export type QuizType = "MULTIPLE_CHOICE";

/**
 * Option khi lấy đề.
 *
 * Không có:
 * - isCorrect
 * - explanation
 */
export interface QuizOption {
  optionId: number;
  optionText: string;
  optionOrder: number;
}

/**
 * Question khi lấy đề.
 *
 * Không có đáp án đúng trước khi submit.
 */
export interface QuizQuestion {
  questionId: number;
  questionText: string;
  questionOrder: number;
  options: QuizOption[];
}

/**
 * Response đề quiz.
 */
export interface QuizResponse {
  quizId: number;
  documentId: number;
  documentTitle: string;
  title: string;
  difficulty: QuizDifficulty;
  quizType: QuizType;
  questionCount: number;
  questions: QuizQuestion[];
  createdAt: string;
}

/* =========================================================
   QUIZ GENERATE
========================================================= */

export interface GenerateQuizRequest {
  documentId: number;
  questionCount: number;
  difficulty: QuizDifficulty;
  quizType: QuizType;
}

/**
 * POST /api/quizzes/generate
 *
 * Backend xác định user bằng JWT.
 */
export const generateQuizApi = (
  data: GenerateQuizRequest,
) => {
  return apiClient.post<QuizResponse>(
    "/api/quizzes/generate",
    data,
  );
};

/* =========================================================
   QUIZ LIST
========================================================= */

/**
 * GET /api/quizzes
 *
 * Lấy quiz của user hiện tại.
 */
export const getQuizzesApi = () => {
  return apiClient.get<QuizResponse[]>(
    "/api/quizzes",
  );
};

/**
 * GET /api/quizzes/{quizId}
 *
 * Lấy đề để user làm bài.
 *
 * API này KHÔNG trả:
 * - đáp án đúng
 * - isCorrect
 * - explanation
 */
export const getQuizByIdApi = (
  quizId: number,
) => {
  return apiClient.get<QuizResponse>(
    `/api/quizzes/${quizId}`,
  );
};

/**
 * GET /api/quizzes/document/{documentId}
 *
 * Lấy danh sách quiz của một document.
 */
export const getQuizzesByDocumentApi = (
  documentId: number,
) => {
  return apiClient.get<QuizResponse[]>(
    `/api/quizzes/document/${documentId}`,
  );
};

/* =========================================================
   QUIZ ATTEMPT
========================================================= */

export type QuizAttemptStatus =
  | "IN_PROGRESS"
  | "SUBMITTED";

export interface QuizAttempt {
  attemptId: number;
  quizId: number;

  status: QuizAttemptStatus;

  correctCount?: number | null;
  totalQuestions?: number | null;
  score?: number | null;

  startedAt: string;
  submittedAt?: string | null;
}

/**
 * POST /api/quizzes/{quizId}/attempts
 *
 * Tạo một lần làm bài mới.
 */
export const startQuizAttemptApi = (
  quizId: number,
) => {
  return apiClient.post<QuizAttempt>(
    `/api/quizzes/${quizId}/attempts`,
  );
};

/* =========================================================
   QUIZ SUBMIT
========================================================= */

/**
 * Một đáp án FE gửi lên khi submit.
 */
export interface QuizSubmitAnswer {
  questionId: number;
  selectedOptionId: number;
}

/**
 * Kết quả từng câu sau khi Backend chấm.
 */
export interface QuizAnswerResult {
  questionId: number;

  selectedOptionId: number;
  correctOptionId: number;

  correct: boolean;
  explanation: string;
}

/**
 * Kết quả toàn bộ lần làm bài.
 */
export interface QuizAttemptResult {
  attemptId: number;
  quizId: number;

  status: "SUBMITTED";

  correctCount: number;
  totalQuestions: number;
  score: number;

  startedAt: string;
  submittedAt: string;

  answers: QuizAnswerResult[];
}

/**
 * POST /api/quizzes/attempts/{attemptId}/submit
 *
 * Backend chịu trách nhiệm:
 * - kiểm tra đáp án
 * - chấm điểm
 * - trả correctOptionId
 * - trả explanation
 */
export const submitQuizAttemptApi = (
  attemptId: number,
  answers: QuizSubmitAnswer[],
) => {
  return apiClient.post<QuizAttemptResult>(
    `/api/quizzes/attempts/${attemptId}/submit`,
    {
      answers,
    },
  );
};

/* =========================================================
   QUIZ ATTEMPT RESULT
========================================================= */

/**
 * GET /api/quizzes/attempts/{attemptId}
 *
 * Xem lại một attempt đã submit.
 */
export const getQuizAttemptResultApi = (
  attemptId: number,
) => {
  return apiClient.get<QuizAttemptResult>(
    `/api/quizzes/attempts/${attemptId}`,
  );
};

/* =========================================================
   QUIZ ATTEMPT HISTORY
========================================================= */

/**
 * GET /api/quizzes/{quizId}/attempts
 *
 * Lấy lịch sử các lần làm của quiz.
 */
export const getQuizAttemptHistoryApi = (
  quizId: number,
) => {
  return apiClient.get<QuizAttempt[]>(
    `/api/quizzes/${quizId}/attempts`,
  );
};