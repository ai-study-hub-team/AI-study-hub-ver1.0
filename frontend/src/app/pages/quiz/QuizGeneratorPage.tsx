import {
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Sparkles,
  RotateCcw,
  Share2,
  ArrowLeft,
  ArrowRight,
  History,
  Loader2,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  motion,
  AnimatePresence,
} from "motion/react";

import { toast } from "sonner";

import { documentApi } from "../../services/documentApi";

import {
  generateQuizApi,
  getQuizzesApi,
  getQuizByIdApi,
  startQuizAttemptApi,
  submitQuizAttemptApi,
  getQuizAttemptHistoryApi,
  getQuizAttemptResultApi,
  type QuizDifficulty,
  type QuizResponse,
  type QuizQuestion,
  type QuizAttempt,
  type QuizAttemptResult,
  type QuizSubmitAnswer,
} from "../../services/aiApi";

import { getCurrentUserId } from "../../services/apiClient";
import { useCreatePublicLink } from "../../hooks/useCreatePublicLink";

/* =========================================================
   TYPES
========================================================= */

type View =
  | "setup"
  | "quiz"
  | "result"
  | "history"
  | "review";

type SelectedAnswers =
  Record<number, number>;

type DocumentItem = {
  id: number;

  name?: string;
  title?: string;
  fileName?: string;

  processStatus?: string;
  aiStatus?: string;

  [key: string]: unknown;
};

type HistoryItem = {
  quiz: QuizResponse;
  attempt: QuizAttempt;
};

/* =========================================================
   CONSTANTS
========================================================= */

const DISPLAY_LIMIT = 6;

const gradeColors: Record<
  string,
  string
> = {
  A: "text-emerald-500",
  B: "text-blue-500",
  C: "text-amber-500",
  D: "text-orange-500",
  F: "text-red-500",
};

const difficultyOptions: {
  value: QuizDifficulty;
  label: string;
}[] = [
  {
    value: "EASY",
    label: "Easy",
  },
  {
    value: "MEDIUM",
    label: "Intermediate",
  },
  {
    value: "HARD",
    label: "Hard",
  },
];

/* =========================================================
   HELPERS
========================================================= */

const getErrorMessage = (
  error: any,
  fallback: string,
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

const getDocumentName = (
  document?: DocumentItem | null,
) => {
  if (!document) {
    return "Untitled";
  }

  return (
    document.name ||
    document.title ||
    document.fileName ||
    "Untitled"
  );
};

const getProcessStatus = (
  document?: DocumentItem | null,
) => {
  return String(
    document?.processStatus ||
      document?.aiStatus ||
      "",
  ).toUpperCase();
};

const isDocumentProcessed = (
  document?: DocumentItem | null,
) => {
  const status =
    getProcessStatus(document);

  /*
   * API AI-ready đôi lúc không trả status.
   * Trường hợp này vẫn cho sử dụng.
   */
  if (!status) {
    return true;
  }

  return status === "PROCESSED";
};

const formatDate = (
  value?: string | null,
) => {
  if (!value) {
    return "N/A";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString();
};

const getGrade = (
  score: number,
) => {
  if (score >= 90) {
    return "A";
  }

  if (score >= 80) {
    return "B";
  }

  if (score >= 70) {
    return "C";
  }

  if (score >= 60) {
    return "D";
  }

  return "F";
};

/*
 * Backend đã trả questionOrder / optionOrder.
 * Sắp xếp lại để FE luôn hiển thị đúng thứ tự.
 */
const normalizeQuiz = (
  quiz: QuizResponse,
): QuizResponse => {
  return {
    ...quiz,

    questions: [
      ...(quiz.questions || []),
    ]
      .sort(
        (a, b) =>
          a.questionOrder -
          b.questionOrder,
      )
      .map(
        (question) => ({
          ...question,

          options: [
            ...(question.options ||
              []),
          ].sort(
            (a, b) =>
              a.optionOrder -
              b.optionOrder,
          ),
        }),
      ),
  };
};

/* =========================================================
   COMPONENT
========================================================= */

export function QuizGeneratorPage() {
  /* =======================================================
     VIEW
  ======================================================= */

  const [view, setView] =
    useState<View>("setup");

  /* =======================================================
     CONFIG
  ======================================================= */

  const [
    difficulty,
    setDifficulty,
  ] =
    useState<QuizDifficulty>(
      "MEDIUM",
    );

  const [
    questionCount,
    setQuestionCount,
  ] = useState(10);

  /* =======================================================
     DOCUMENTS
  ======================================================= */

  const [
    documents,
    setDocuments,
  ] =
    useState<DocumentItem[]>(
      [],
    );

  const [
    showAllDocuments,
    setShowAllDocuments,
  ] = useState(false);

  const [
    selectedDocumentId,
    setSelectedDocumentId,
  ] =
    useState<number | null>(
      null,
    );

  const [
    selectedDocName,
    setSelectedDocName,
  ] = useState("");

  /* =======================================================
     CURRENT QUIZ
  ======================================================= */

  const [
    currentQuiz,
    setCurrentQuiz,
  ] =
    useState<QuizResponse | null>(
      null,
    );

  const [
    currentQuestionIndex,
    setCurrentQuestionIndex,
  ] = useState(0);

  /* =======================================================
     ATTEMPT
  ======================================================= */

  const [
    currentAttemptId,
    setCurrentAttemptId,
  ] =
    useState<number | null>(
      null,
    );

  const [
    selectedAnswers,
    setSelectedAnswers,
  ] =
    useState<SelectedAnswers>(
      {},
    );

  const [
    quizResult,
    setQuizResult,
  ] =
    useState<QuizAttemptResult | null>(
      null,
    );

  /* =======================================================
     HISTORY

     CHỈ KHAI BÁO 1 LẦN.
  ======================================================= */

  const [
    historyData,
    setHistoryData,
  ] =
    useState<HistoryItem[]>(
      [],
    );

  /* =======================================================
     LOADING
  ======================================================= */

  const [
    isGenerating,
    setIsGenerating,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    isLoadingHistory,
    setIsLoadingHistory,
  ] = useState(false);

  const [
    isLoadingReview,
    setIsLoadingReview,
  ] = useState(false);

  const [
    isRetaking,
    setIsRetaking,
  ] = useState(false);

  /* =======================================================
     SHARE
  ======================================================= */

  const {
    createAndCopyPublicLink,
    loadingDocumentId,
  } = useCreatePublicLink();

  /* =======================================================
     COMPUTED
  ======================================================= */

  const visibleDocuments =
    showAllDocuments
      ? documents
      : documents.slice(
          0,
          DISPLAY_LIMIT,
        );

  const questions =
    currentQuiz?.questions ??
    [];

  const currentQuestion:
    | QuizQuestion
    | undefined =
    questions[
      currentQuestionIndex
    ];

  const currentSelectedOptionId =
    currentQuestion
      ? selectedAnswers[
          currentQuestion
            .questionId
        ] ?? null
      : null;

  const answeredCount =
    useMemo(() => {
      return questions.filter(
        (question) =>
          selectedAnswers[
            question.questionId
          ] !== undefined,
      ).length;
    }, [
      questions,
      selectedAnswers,
    ]);

  /*
   * Chỉ tồn tại sau submit.
   */
  const answerResultMap =
    useMemo(() => {
      const map = new Map<
        number,
        QuizAttemptResult["answers"][number]
      >();

      if (!quizResult) {
        return map;
      }

      quizResult.answers.forEach(
        (answer) => {
          map.set(
            answer.questionId,
            answer,
          );
        },
      );

      return map;
    }, [quizResult]);

  const grade =
    getGrade(
      quizResult?.score ?? 0,
    );

  /* =======================================================
     LOAD DOCUMENTS
  ======================================================= */

  const fetchDocuments =
    async () => {
      /*
       * Document API hiện tại vẫn cần userId.
       *
       * Chỉ Quiz API đã chuyển ownership sang JWT.
       */
      const userId =
        getCurrentUserId();

      if (!userId) {
        toast.error(
          "Please login again.",
        );

        return;
      }

      try {
        const data =
          await documentApi.getAiReadyDocumentsForSelect(
            userId,
          );

        const list =
          Array.isArray(data)
            ? (data as DocumentItem[])
            : [];

        setDocuments(list);

        if (
          list.length === 0
        ) {
          setSelectedDocumentId(
            null,
          );

          setSelectedDocName(
            "",
          );

          return;
        }

        const processed =
          list.find(
            (document) =>
              isDocumentProcessed(
                document,
              ),
          );

        const first =
          processed ?? list[0];

        setSelectedDocumentId(
          Number(first.id),
        );

        setSelectedDocName(
          getDocumentName(
            first,
          ),
        );
      } catch (error: any) {
        console.error(
          "Cannot load AI-ready documents:",
          error,
        );

        toast.error(
          getErrorMessage(
            error,
            "Cannot load uploaded documents",
          ),
        );

        setDocuments([]);

        setSelectedDocumentId(
          null,
        );

        setSelectedDocName(
          "",
        );
      }
    };

  useEffect(() => {
    void fetchDocuments();
  }, []);

  /* =======================================================
     SELECT DOCUMENT
  ======================================================= */

  const handleSelectDocument = (
    document: DocumentItem,
  ) => {
    if (
      !isDocumentProcessed(
        document,
      )
    ) {
      toast.error(
        "This document is not processed yet. Please wait until AI Status is PROCESSED.",
      );

      return;
    }

    setSelectedDocumentId(
      Number(document.id),
    );

    setSelectedDocName(
      getDocumentName(
        document,
      ),
    );
  };

  /* =======================================================
     START QUIZ

     Flow:

     POST generate
          ↓
     lấy quizId
          ↓
     GET quiz/{quizId}
          ↓
     POST quiz/{quizId}/attempts
          ↓
     lấy attemptId
  ======================================================= */

  const handleStartQuiz =
    async () => {
      if (
        selectedDocumentId ===
        null
      ) {
        toast.error(
          "Please select a document first.",
        );

        return;
      }

      const selectedDocument =
        documents.find(
          (document) =>
            Number(
              document.id,
            ) ===
            selectedDocumentId,
        );

      if (
        selectedDocument &&
        !isDocumentProcessed(
          selectedDocument,
        )
      ) {
        toast.error(
          "This document is not processed yet.",
        );

        return;
      }

      setIsGenerating(true);

      try {
        /*
         * KHÔNG gửi userId.
         */
        const generateResponse =
          await generateQuizApi({
            documentId:
              selectedDocumentId,

            questionCount,

            difficulty,

            quizType:
              "MULTIPLE_CHOICE",
          });

        const generatedQuizId =
          Number(
            generateResponse.data
              ?.quizId,
          );

        if (
          !Number.isFinite(
            generatedQuizId,
          )
        ) {
          throw new Error(
            "Backend did not return quizId.",
          );
        }

        /*
         * Lấy đề sạch.
         *
         * Backend không trả:
         * - isCorrect
         * - correctOptionId
         * - explanation
         */
        const quizResponse =
          await getQuizByIdApi(
            generatedQuizId,
          );

        const quiz =
          normalizeQuiz(
            quizResponse.data,
          );

        if (
          quiz.questions.length ===
          0
        ) {
          throw new Error(
            "Quiz does not contain any questions.",
          );
        }

        /*
         * Tạo lần làm bài.
         */
        const attemptResponse =
          await startQuizAttemptApi(
            generatedQuizId,
          );

        const newAttemptId =
          Number(
            attemptResponse.data
              ?.attemptId,
          );

        if (
          !Number.isFinite(
            newAttemptId,
          )
        ) {
          throw new Error(
            "Backend did not return attemptId.",
          );
        }

        setCurrentQuiz(
          quiz,
        );

        setCurrentAttemptId(
          newAttemptId,
        );

        setCurrentQuestionIndex(
          0,
        );

        setSelectedAnswers(
          {},
        );

        setQuizResult(
          null,
        );

        setSelectedDocName(
          quiz.documentTitle ||
            getDocumentName(
              selectedDocument,
            ),
        );

        setView("quiz");

        toast.success(
          "Quiz generated successfully!",
        );
      } catch (error: any) {
        console.error(
          "Generate/start quiz failed:",
          error,
        );

        toast.error(
          getErrorMessage(
            error,
            "Generate quiz failed",
          ),
        );
      } finally {
        setIsGenerating(
          false,
        );
      }
    };

  /* =======================================================
     SELECT ANSWER

     key   = questionId
     value = optionId

     Chưa submit => có thể đổi đáp án.
  ======================================================= */

  const handleAnswer = (
    questionId: number,
    optionId: number,
  ) => {
    /*
     * Đã submit thì tuyệt đối
     * không cho chỉnh.
     */
    if (quizResult) {
      return;
    }

    setSelectedAnswers(
      (current) => ({
        ...current,

        [questionId]:
          optionId,
      }),
    );
  };

  /* =======================================================
     RESET CURRENT ANSWER
  ======================================================= */

  const handleResetCurrentAnswer =
    () => {
      if (
        !currentQuestion ||
        quizResult
      ) {
        return;
      }

      setSelectedAnswers(
        (current) => {
          const next = {
            ...current,
          };

          delete next[
            currentQuestion
              .questionId
          ];

          return next;
        },
      );
    };

  /* =======================================================
     QUESTION NAVIGATION
  ======================================================= */

  const goToQuestion = (
    index: number,
  ) => {
    if (
      index < 0 ||
      index >=
        questions.length
    ) {
      return;
    }

    setCurrentQuestionIndex(
      index,
    );
  };

  const handlePreviousQuestion =
    () => {
      goToQuestion(
        currentQuestionIndex -
          1,
      );
    };

  const handleNextQuestion =
    () => {
      /*
       * Câu cuối → submit.
       */
      if (
        currentQuestionIndex ===
        questions.length - 1
      ) {
        void handleSubmitQuiz();

        return;
      }

      goToQuestion(
        currentQuestionIndex +
          1,
      );
    };

  /* =======================================================
     SUBMIT

     BACKEND chấm điểm.

     FE không:
     - calculateScore()
     - dùng isCorrect
     - biết đáp án đúng trước submit
  ======================================================= */

  const handleSubmitQuiz =
    async () => {
      if (
        !currentQuiz ||
        currentAttemptId === null
      ) {
        toast.error(
          "Quiz attempt was not initialized.",
        );

        return;
      }

      /*
       * Chặn submit lần 2.
       */
      if (quizResult) {
        toast.error(
          "This attempt has already been submitted.",
        );

        return;
      }

      /*
       * Hiện tại bắt user
       * trả lời đủ câu.
       */
      if (
        answeredCount !==
        questions.length
      ) {
        const missing =
          questions.length -
          answeredCount;

        toast.error(
          `${missing} question${
            missing === 1
              ? " is"
              : "s are"
          } unanswered.`,
        );

        return;
      }

      const submitAnswers:
        QuizSubmitAnswer[] =
        questions.map(
          (question) => ({
            questionId:
              question.questionId,

            selectedOptionId:
              selectedAnswers[
                question
                  .questionId
              ]!,
          }),
        );

      setIsSubmitting(true);

      try {
        const response =
          await submitQuizAttemptApi(
            currentAttemptId,
            submitAnswers,
          );

        setQuizResult(
          response.data,
        );

        setView(
          "result",
        );

        toast.success(
          "Quiz submitted successfully!",
        );
      } catch (error: any) {
        console.error(
          "Submit quiz failed:",
          error,
        );

        toast.error(
          getErrorMessage(
            error,
            "Cannot submit quiz",
          ),
        );
      } finally {
        setIsSubmitting(
          false,
        );
      }
    };

  /* =======================================================
     RETAKE

     Không generate AI lại.

     Chỉ tạo attempt mới.
  ======================================================= */

  const handleRetakeQuiz =
    async () => {
      if (!currentQuiz) {
        toast.error(
          "No quiz available to retake.",
        );

        return;
      }

      setIsRetaking(true);

      try {
        const response =
          await startQuizAttemptApi(
            currentQuiz.quizId,
          );

        const newAttemptId =
          Number(
            response.data
              ?.attemptId,
          );

        if (
          !Number.isFinite(
            newAttemptId,
          )
        ) {
          throw new Error(
            "Backend did not return attemptId.",
          );
        }

        setCurrentAttemptId(
          newAttemptId,
        );

        setSelectedAnswers(
          {},
        );

        setQuizResult(
          null,
        );

        setCurrentQuestionIndex(
          0,
        );

        setView("quiz");

        toast.success(
          "New attempt started.",
        );
      } catch (error: any) {
        console.error(
          "Start new attempt failed:",
          error,
        );

        toast.error(
          getErrorMessage(
            error,
            "Cannot start a new attempt",
          ),
        );
      } finally {
        setIsRetaking(
          false,
        );
      }
    };

  /* =======================================================
     HISTORY

     GET /api/quizzes

     Sau đó:
     GET /api/quizzes/{quizId}/attempts
  ======================================================= */

  const fetchQuizHistory =
    async () => {
      setIsLoadingHistory(
        true,
      );

      try {
        /*
         * KHÔNG gửi userId.
         */
        const response =
          await getQuizzesApi();

        const quizzes =
          Array.isArray(
            response.data,
          )
            ? response.data
            : [];

        const groups:
          HistoryItem[][] =
          await Promise.all(
            quizzes.map(
              async (
                quiz,
              ): Promise<
                HistoryItem[]
              > => {
                try {
                  const attemptsResponse =
                    await getQuizAttemptHistoryApi(
                      quiz.quizId,
                    );

                  const attempts =
                    Array.isArray(
                      attemptsResponse.data,
                    )
                      ? attemptsResponse.data
                      : [];

                  return attempts.map(
                    (
                      attempt,
                    ): HistoryItem => ({
                      quiz,
                      attempt,
                    }),
                  );
                } catch (
                  error
                ) {
                  console.error(
                    `Cannot load attempts of quiz ${quiz.quizId}:`,
                    error,
                  );

                  return [];
                }
              },
            ),
          );

        const history:
          HistoryItem[] =
          groups
            .flat()
            .sort(
              (a, b) => {
                const dateA =
                  a.attempt
                    .submittedAt ||
                  a.attempt
                    .startedAt;

                const dateB =
                  b.attempt
                    .submittedAt ||
                  b.attempt
                    .startedAt;

                return (
                  new Date(
                    dateB,
                  ).getTime() -
                  new Date(
                    dateA,
                  ).getTime()
                );
              },
            );

        /*
         * historyData là HistoryItem[]
         * KHÔNG phải boolean.
         */
        setHistoryData(
          history,
        );
      } catch (error: any) {
        console.error(
          "Load quiz history failed:",
          error,
        );

        toast.error(
          getErrorMessage(
            error,
            "Cannot load quiz history",
          ),
        );

        setHistoryData(
          [],
        );
      } finally {
        setIsLoadingHistory(
          false,
        );
      }
    };

  /* =======================================================
     CHANGE VIEW
  ======================================================= */

  const handleChangeView = (
    nextView: View,
  ) => {
    setView(nextView);

    if (
      nextView === "history"
    ) {
      void fetchQuizHistory();
    }
  };

  /* =======================================================
     OPEN HISTORY ATTEMPT

     Chỉ SUBMITTED attempt mới có:
     - score
     - correctOptionId
     - correct
     - explanation
  ======================================================= */

  const handleViewAttempt =
    async (
      item: HistoryItem,
    ) => {
      if (
        item.attempt.status !==
        "SUBMITTED"
      ) {
        toast.error(
          "This attempt has not been submitted yet.",
        );

        return;
      }

      setIsLoadingReview(
        true,
      );

      try {
        const [
          quizResponse,
          resultResponse,
        ] = await Promise.all([
          getQuizByIdApi(
            item.quiz.quizId,
          ),

          getQuizAttemptResultApi(
            item.attempt
              .attemptId,
          ),
        ]);

        const quiz =
          normalizeQuiz(
            quizResponse.data,
          );

        const result =
          resultResponse.data;

        const answers:
          SelectedAnswers = {};

        result.answers.forEach(
          (answer) => {
            answers[
              answer.questionId
            ] =
              answer.selectedOptionId;
          },
        );

        setCurrentQuiz(
          quiz,
        );

        setCurrentAttemptId(
          result.attemptId,
        );

        setSelectedAnswers(
          answers,
        );

        setQuizResult(
          result,
        );

        setSelectedDocName(
          quiz.documentTitle ||
            "Quiz",
        );

        setCurrentQuestionIndex(
          0,
        );

        setView("review");
      } catch (error: any) {
        console.error(
          "Load quiz review failed:",
          error,
        );

        toast.error(
          getErrorMessage(
            error,
            "Cannot load quiz result",
          ),
        );
      } finally {
        setIsLoadingReview(
          false,
        );
      }
    };

  /* =======================================================
     RESET CURRENT QUIZ STATE
  ======================================================= */

  const resetCurrentQuizState =
    () => {
      setCurrentQuiz(null);

      setCurrentAttemptId(
        null,
      );

      setCurrentQuestionIndex(
        0,
      );

      setSelectedAnswers(
        {},
      );

      setQuizResult(
        null,
      );
    };

  /* =======================================================
     QUIT
  ======================================================= */

  const handleQuitQuiz =
    () => {
      /*
       * Nếu attempt chưa submit,
       * backend vẫn giữ IN_PROGRESS
       * vì hiện chưa có cancel API.
       */
      resetCurrentQuizState();

      setView("setup");
    };

  /* =======================================================
     BACK TO SETUP
  ======================================================= */

  const handleBackToQuiz =
    () => {
      resetCurrentQuizState();

      setView("setup");
    };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="space-y-8">
      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Quiz Generator
          </h1>

          <p className="text-slate-500 dark:text-slate-400">
            AI-powered quizzes from your study materials
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              handleChangeView(
                "setup",
              )
            }
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              view === "setup"
                ? "bg-blue-600 text-white"
                : "border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            }`}
          >
            Create Quiz
          </button>

          <button
            type="button"
            onClick={() =>
              handleChangeView(
                "history",
              )
            }
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
              view === "history"
                ? "bg-blue-600 text-white"
                : "border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            }`}
          >
            <History className="h-4 w-4" />

            History
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* =================================================
            SETUP
        ================================================= */}

        {view === "setup" && (
          <motion.div
            key="setup"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className="grid grid-cols-1 gap-6 lg:grid-cols-3"
          >
            <div className="space-y-5 lg:col-span-2">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h2 className="mb-5 text-lg font-bold text-slate-900 dark:text-white">
                  Quiz Configuration
                </h2>

                {/* DOCUMENT */}

                <div className="mb-5">
                  <label className="mb-3 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Source Document
                  </label>

                  {documents.length ===
                  0 ? (
                    <p className="text-sm text-slate-500">
                      No AI-ready documents found.
                    </p>
                  ) : (
                    <>
                      {visibleDocuments.map(
                        (document) => {
                          const documentName =
                            getDocumentName(
                              document,
                            );

                          const status =
                            getProcessStatus(
                              document,
                            );

                          const processed =
                            isDocumentProcessed(
                              document,
                            );

                          const selected =
                            selectedDocumentId ===
                            Number(
                              document.id,
                            );

                          return (
                            <label
                              key={
                                document.id
                              }
                              className={`mb-2 flex items-center gap-3 rounded-2xl border-2 p-3.5 transition ${
                                processed
                                  ? "cursor-pointer"
                                  : "cursor-not-allowed opacity-60"
                              } ${
                                selected
                                  ? "border-blue-500 bg-blue-50/30 dark:bg-blue-500/10"
                                  : "border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                              }`}
                            >
                              <input
                                type="radio"
                                checked={
                                  selected
                                }
                                disabled={
                                  !processed
                                }
                                onChange={() =>
                                  handleSelectDocument(
                                    document,
                                  )
                                }
                                className="sr-only"
                              />

                              <FileText className="h-4 w-4 shrink-0 text-slate-500" />

                              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                                {
                                  documentName
                                }
                              </span>

                              {status && (
                                <span
                                  className={`shrink-0 text-[11px] font-bold ${
                                    processed
                                      ? "text-emerald-600"
                                      : "text-amber-600"
                                  }`}
                                >
                                  {
                                    status
                                  }
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={(
                                  event,
                                ) => {
                                  event.preventDefault();
                                  event.stopPropagation();

                                  createAndCopyPublicLink(
                                    Number(
                                      document.id,
                                    ),
                                  );
                                }}
                                disabled={
                                  loadingDocumentId ===
                                  Number(
                                    document.id,
                                  )
                                }
                                className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-blue-600 disabled:opacity-60 dark:hover:bg-slate-800"
                                title="Share document"
                                aria-label={`Share ${documentName}`}
                              >
                                <Share2
                                  className={`h-4 w-4 ${
                                    loadingDocumentId ===
                                    Number(
                                      document.id,
                                    )
                                      ? "animate-pulse"
                                      : ""
                                  }`}
                                />
                              </button>
                            </label>
                          );
                        },
                      )}

                      {documents.length >
                        DISPLAY_LIMIT && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowAllDocuments(
                              (
                                current,
                              ) =>
                                !current,
                            )
                          }
                          className="mt-3 w-full rounded-2xl border border-dashed border-blue-300 py-3 font-semibold text-blue-600 transition hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
                        >
                          {showAllDocuments
                            ? "Thu gọn"
                            : `Xem thêm `}
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* DIFFICULTY */}

                <div className="mb-5">
                  <label className="mb-3 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Difficulty Level
                  </label>

                  <div className="grid grid-cols-3 gap-3">
                    {difficultyOptions.map(
                      (option) => (
                        <button
                          key={
                            option.value
                          }
                          type="button"
                          onClick={() =>
                            setDifficulty(
                              option.value,
                            )
                          }
                          className={`rounded-2xl border-2 py-3 text-sm font-bold transition ${
                            difficulty ===
                            option.value
                              ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                              : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
                          }`}
                        >
                          {
                            option.label
                          }
                        </button>
                      ),
                    )}
                  </div>
                </div>

                {/* NUMBER QUESTIONS */}

                <div className="mb-6">
                  <div className="mb-2 flex justify-between">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Number of Questions
                    </label>

                    <span className="text-sm font-extrabold text-blue-600">
                      {
                        questionCount
                      }
                    </span>
                  </div>

                  <input
                    type="range"
                    min={5}
                    max={25}
                    step={5}
                    value={
                      questionCount
                    }
                    onChange={(
                      event,
                    ) =>
                      setQuestionCount(
                        Number(
                          event
                            .target
                            .value,
                        ),
                      )
                    }
                    className="w-full accent-blue-600"
                  />
                </div>

                {/* START */}

                <button
                  type="button"
                  onClick={() =>
                    void handleStartQuiz()
                  }
                  disabled={
                    isGenerating ||
                    selectedDocumentId ===
                      null
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-lg font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGenerating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}

                  {isGenerating
                    ? "Generating..."
                    : "Generate & Start Quiz"}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* =================================================
            QUIZ
        ================================================= */}

        {view === "quiz" &&
          currentQuestion && (
            <motion.div
              key="quiz"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              className="mx-auto max-w-2xl"
            >
              <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                {/* HEADER */}

                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Question{" "}
                      {currentQuestionIndex +
                        1}{" "}
                      of{" "}
                      {
                        questions.length
                      }
                    </span>

                    <div className="mt-2 h-2 w-48 max-w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-blue-600 transition-all"
                        style={{
                          width: `${
                            ((currentQuestionIndex +
                              1) /
                              questions.length) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
                    <Clock className="h-4 w-4 text-slate-500" />

                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {difficultyOptions.find(
                        (option) =>
                          option.value ===
                          currentQuiz
                            ?.difficulty,
                      )?.label ||
                        currentQuiz
                          ?.difficulty}
                    </span>
                  </div>
                </div>

                {/* QUESTION */}

                <h2 className="mb-6 text-xl font-extrabold leading-relaxed text-slate-900 dark:text-white">
                  {
                    currentQuestion.questionText
                  }
                </h2>

                {/* OPTIONS */}

                <div className="space-y-3">
                  {currentQuestion.options.map(
                    (
                      option,
                      optionIndex,
                    ) => {
                      const selected =
                        currentSelectedOptionId ===
                        option.optionId;

                      return (
                        <button
                          key={
                            option.optionId
                          }
                          type="button"
                          onClick={() =>
                            handleAnswer(
                              currentQuestion.questionId,
                              option.optionId,
                            )
                          }
                          disabled={
                            isSubmitting
                          }
                          className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left text-sm font-semibold transition ${
                            selected
                              ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                              : "border-slate-200 text-slate-700 hover:border-blue-400 dark:border-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${
                              selected
                                ? "bg-blue-600 text-white"
                                : "bg-slate-50 dark:bg-slate-800"
                            }`}
                          >
                            {String.fromCharCode(
                              65 +
                                optionIndex,
                            )}
                          </div>

                          <span>
                            {
                              option.optionText
                            }
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>

                {/* STATUS */}

                <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {currentSelectedOptionId !==
                    null
                      ? "Answer selected. You can change your answer before submitting."
                      : "Select an answer."}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Answered{" "}
                    {answeredCount}/
                    {questions.length}
                  </p>
                </div>

                {/* CONTROLS */}

                <div className="mt-7 flex flex-col gap-3 border-t border-slate-200 pt-5 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={
                      handlePreviousQuestion
                    }
                    disabled={
                      currentQuestionIndex ===
                        0 ||
                      isSubmitting
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                  >
                    <ArrowLeft className="h-4 w-4" />

                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleResetCurrentAnswer
                    }
                    disabled={
                      currentSelectedOptionId ===
                        null ||
                      isSubmitting
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
                  >
                    <RotateCcw className="h-4 w-4" />

                    Reset Answer
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleNextQuestion
                    }
                    disabled={
                      isSubmitting
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />

                        Submitting...
                      </>
                    ) : currentQuestionIndex ===
                      questions.length -
                        1 ? (
                      <>
                        Submit Quiz

                        <CheckCircle2 className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Next

                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={
                    handleQuitQuiz
                  }
                  disabled={
                    isSubmitting
                  }
                  className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-40 dark:hover:text-slate-300"
                >
                  <RotateCcw className="h-4 w-4" />

                  Quit Quiz
                </button>
              </div>
            </motion.div>
          )}

        {/* =================================================
            RESULT
        ================================================= */}

        {view === "result" &&
          quizResult && (
            <motion.div
              key="result"
              initial={{
                opacity: 0,
                scale: 0.95,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              className="mx-auto max-w-2xl"
            >
              <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <Trophy className="mx-auto mb-3 h-12 w-12 text-amber-400" />

                <h2 className="mb-1 text-3xl font-extrabold text-slate-900 dark:text-white">
                  Quiz Complete!
                </h2>

                <p className="mb-8 text-slate-500">
                  {
                    selectedDocName
                  }
                </p>

                {/* SCORE */}

                <div className="mb-8 grid grid-cols-3 gap-4">
                  <div>
                    <div
                      className={`text-5xl font-extrabold md:text-6xl ${gradeColors[grade]}`}
                    >
                      {
                        grade
                      }
                    </div>

                    <p className="text-sm text-slate-500">
                      Grade
                    </p>
                  </div>

                  <div>
                    <div className="text-5xl font-extrabold text-slate-900 md:text-6xl dark:text-white">
                      {
                        quizResult.score
                      }
                      %
                    </div>

                    <p className="text-sm text-slate-500">
                      Score
                    </p>
                  </div>

                  <div>
                    <div className="text-5xl font-extrabold text-blue-600 md:text-6xl">
                      {
                        quizResult.correctCount
                      }
                      /
                      {
                        quizResult.totalQuestions
                      }
                    </div>

                    <p className="text-sm text-slate-500">
                      Correct
                    </p>
                  </div>
                </div>

                {/* TIME */}

                <div className="mb-6 rounded-2xl bg-slate-50 p-4 text-left dark:bg-slate-800">
                  <p className="text-sm text-slate-500">
                    Started:{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {formatDate(
                        quizResult.startedAt,
                      )}
                    </span>
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Submitted:{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {formatDate(
                        quizResult.submittedAt,
                      )}
                    </span>
                  </p>
                </div>

                {/* ACTIONS */}

                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() =>
                        void handleRetakeQuiz()
                      }
                      disabled={
                        isRetaking
                      }
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 font-bold text-slate-900 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {isRetaking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}

                      Retake Quiz
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setView(
                          "review",
                        )
                      }
                      className="flex-1 rounded-2xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-700"
                    >
                      Review Answers
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleBackToQuiz
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-3 font-bold text-slate-700 transition hover:bg-slate-100 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <ArrowLeft className="h-4 w-4" />

                    Back to Quiz
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        {/* =================================================
            REVIEW
        ================================================= */}

        {view === "review" &&
          currentQuiz &&
          quizResult && (
            <motion.div
              key="review"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              className="mx-auto max-w-2xl space-y-4"
            >
              <button
                type="button"
                onClick={() =>
                  handleChangeView(
                    "history",
                  )
                }
                className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />

                Back to History
              </button>

              {currentQuiz.questions.map(
                (
                  question,
                  questionIndex,
                ) => {
                  const result =
                    answerResultMap.get(
                      question.questionId,
                    );

                  const selectedOptionId =
                    result?.selectedOptionId;

                  const correctOptionId =
                    result?.correctOptionId;

                  const userCorrect =
                    result?.correct ===
                    true;

                  const selectedOption =
                    question.options.find(
                      (option) =>
                        option.optionId ===
                        selectedOptionId,
                    );

                  const correctOption =
                    question.options.find(
                      (option) =>
                        option.optionId ===
                        correctOptionId,
                    );

                  return (
                    <div
                      key={
                        question.questionId
                      }
                      className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      <h3 className="mb-4 font-bold leading-relaxed text-slate-900 dark:text-white">
                        Question{" "}
                        {questionIndex +
                          1}
                        :{" "}
                        {
                          question.questionText
                        }
                      </h3>

                      {/* OPTIONS */}

                      <div className="space-y-2">
                        {question.options.map(
                          (
                            option,
                            optionIndex,
                          ) => {
                            const isCorrect =
                              option.optionId ===
                              correctOptionId;

                            const isSelected =
                              option.optionId ===
                              selectedOptionId;

                            let optionClass =
                              "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300";

                            if (
                              isCorrect
                            ) {
                              optionClass =
                                "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
                            } else if (
                              isSelected
                            ) {
                              optionClass =
                                "border-red-400 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300";
                            }

                            return (
                              <div
                                key={
                                  option.optionId
                                }
                                className={`flex items-center gap-3 rounded-xl border p-3 text-sm font-medium ${optionClass}`}
                              >
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-extrabold">
                                  {isCorrect ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                  ) : isSelected ? (
                                    <XCircle className="h-4 w-4" />
                                  ) : (
                                    String.fromCharCode(
                                      65 +
                                        optionIndex,
                                    )
                                  )}
                                </div>

                                <span>
                                  {
                                    option.optionText
                                  }
                                </span>
                              </div>
                            );
                          },
                        )}
                      </div>

                      {/* RESULT */}

                      {result ? (
                        <>
                          <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                            <p
                              className={`text-sm font-bold ${
                                userCorrect
                                  ? "text-emerald-600"
                                  : "text-red-600"
                              }`}
                            >
                              {userCorrect
                                ? "✓ Your answer is correct."
                                : "✗ Your answer is incorrect."}
                            </p>

                            <p className="text-sm text-slate-700 dark:text-slate-300">
                              <span className="font-bold">
                                Your answer:
                              </span>{" "}
                              {selectedOption?.optionText ||
                                "N/A"}
                            </p>

                            {!userCorrect && (
                              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                                <span className="font-bold">
                                  Correct answer:
                                </span>{" "}
                                {correctOption?.optionText ||
                                  "N/A"}
                              </p>
                            )}
                          </div>

                          <div className="mt-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              <span className="font-bold text-slate-900 dark:text-white">
                                Explanation:
                              </span>{" "}
                              {result.explanation ||
                                "No explanation provided."}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="mt-4 rounded-2xl bg-amber-50 p-4 dark:bg-amber-500/10">
                          <p className="text-sm font-bold text-amber-600">
                            No answer result found.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                },
              )}

              {/* REVIEW ACTION */}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    void handleRetakeQuiz()
                  }
                  disabled={
                    isRetaking
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 py-3 font-bold text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300"
                >
                  {isRetaking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}

                  Retake Quiz
                </button>

                <button
                  type="button"
                  onClick={
                    handleBackToQuiz
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 font-bold text-white"
                >
                  <ArrowLeft className="h-4 w-4" />

                  Back to Quiz
                </button>
              </div>
            </motion.div>
          )}

        {/* =================================================
            HISTORY
        ================================================= */}

        {view === "history" && (
          <motion.div
            key="history"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            className="space-y-5"
          >
            {isLoadingHistory ||
            isLoadingReview ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-blue-600" />

                <p className="text-slate-500">
                  {isLoadingReview
                    ? "Loading quiz result..."
                    : "Loading quiz history..."}
                </p>
              </div>
            ) : historyData.length ===
              0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                <History className="mx-auto mb-3 h-8 w-8 text-slate-400" />

                <p className="text-slate-500">
                  No quiz attempt history found.
                </p>
              </div>
            ) : (
              historyData.map(
                (item) => {
                  const quiz =
                    item.quiz;

                  const attempt =
                    item.attempt;

                  const submitted =
                    attempt.status ===
                    "SUBMITTED";

                  return (
                    <button
                      key={
                        attempt.attemptId
                      }
                      type="button"
                      onClick={() =>
                        void handleViewAttempt(
                          item,
                        )
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-blue-500 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900 dark:text-white">
                            {quiz.title ||
                              quiz.documentTitle ||
                              "Untitled Quiz"}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {
                              quiz.difficulty
                            }

                            {" · "}

                            {
                              quiz.questionCount
                            }{" "}
                            questions
                          </p>
                        </div>

                        <div className="shrink-0 sm:text-right">
                          {submitted ? (
                            <>
                              <p className="font-extrabold text-blue-600">
                                {attempt.score ??
                                  0}
                                %
                              </p>

                              <p className="text-xs text-slate-500">
                                {attempt.correctCount ??
                                  0}
                                /
                                {attempt.totalQuestions ??
                                  quiz.questionCount}{" "}
                                correct
                              </p>
                            </>
                          ) : (
                            <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-600 dark:bg-amber-500/10">
                              IN PROGRESS
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-slate-800">
                        <p>
                          Started:{" "}
                          {formatDate(
                            attempt.startedAt,
                          )}
                        </p>

                        {attempt.submittedAt && (
                          <p className="mt-1">
                            Submitted:{" "}
                            {formatDate(
                              attempt.submittedAt,
                            )}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                },
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}