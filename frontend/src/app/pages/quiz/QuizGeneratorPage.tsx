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
} from "lucide-react";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

import { documentApi } from "../../services/documentApi";

import {
  generateQuizApi,
  getQuizzesApi,
  getQuizByIdApi,
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

type Question = {
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
};

type QuizHistoryItem = {
  id?: number;
  quizId?: number;

  title?: string;
  documentTitle?: string;
  topic?: string;

  score?: number;
  difficulty?: string;

  questionCount?: number;
  totalQuestions?: number;

  createdAt?: string;
  date?: string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const DISPLAY_LIMIT = 6;

const gradeColors: Record<string, string> = {
  A: "text-emerald-500",
  B: "text-blue-500",
  C: "text-amber-500",
  D: "text-orange-500",
  F: "text-red-500",
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export function QuizGeneratorPage() {
  /* =======================================================
     VIEW
  ======================================================= */

  const [view, setView] = useState<View>("setup");

  /* =======================================================
     QUIZ CONFIG
  ======================================================= */

  const [difficulty, setDifficulty] =
    useState("Intermediate");

  const [questionCount, setQuestionCount] =
    useState(10);

  /* =======================================================
     DOCUMENT
  ======================================================= */

  const [documents, setDocuments] =
    useState<any[]>([]);

  const [
    showAllDocuments,
    setShowAllDocuments,
  ] = useState(false);

  const [
    selectedDocumentId,
    setSelectedDocumentId,
  ] = useState<number | null>(null);

  const [
    selectedDocName,
    setSelectedDocName,
  ] = useState("");

  /* =======================================================
     QUIZ
  ======================================================= */

  const [questions, setQuestions] =
    useState<Question[]>([]);

  const [currentQ, setCurrentQ] =
    useState(0);

  const [score, setScore] =
    useState(0);

  const [answers, setAnswers] =
    useState<(number | null)[]>([]);

  const [
    selectedAnswer,
    setSelectedAnswer,
  ] = useState<number | null>(null);

  const [
    isGenerating,
    setIsGenerating,
  ] = useState(false);

  /* =======================================================
     HISTORY
  ======================================================= */

  const [
    quizHistoryData,
    setQuizHistoryData,
  ] = useState<QuizHistoryItem[]>([]);

  const [
    isLoadingHistory,
    setIsLoadingHistory,
  ] = useState(false);

  /* =======================================================
     SHARE
  ======================================================= */

  const {
    createAndCopyPublicLink,
    loadingDocumentId,
  } = useCreatePublicLink();

  /* =======================================================
     COMPUTED VALUES
  ======================================================= */

  const visibleDocuments =
    showAllDocuments
      ? documents
      : documents.slice(
          0,
          DISPLAY_LIMIT,
        );

  const currentQuestion =
    questions[currentQ];

  const pct =
    questions.length > 0
      ? Math.round(
          (score /
            questions.length) *
            100,
        )
      : 0;

  const grade =
    pct >= 90
      ? "A"
      : pct >= 80
        ? "B"
        : pct >= 70
          ? "C"
          : pct >= 60
            ? "D"
            : "F";

  /* =======================================================
     DOCUMENT HELPERS
  ======================================================= */

  const getProcessStatus = (
    doc: any,
  ): string => {
    return String(
      doc?.processStatus ||
        doc?.aiStatus ||
        "",
    ).toUpperCase();
  };

  const isDocumentProcessed = (
    doc: any,
  ): boolean => {
    /*
     * API này đã lấy AI-ready documents.
     * Tuy nhiên vẫn kiểm tra status để tránh chọn
     * nhầm document chưa xử lý.
     */
    const processStatus =
      getProcessStatus(doc);

    /*
     * Nếu API AI-ready không trả field status,
     * vẫn cho phép document được sử dụng.
     */
    if (!processStatus) {
      return true;
    }

    return (
      processStatus ===
      "PROCESSED"
    );
  };

  const getDocumentName = (
    doc: any,
  ): string => {
    return (
      doc?.name ||
      doc?.title ||
      doc?.fileName ||
      "Untitled"
    );
  };

  /* =======================================================
     FETCH DOCUMENTS
  ======================================================= */

  const fetchDocuments =
    async () => {
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

        const documentList =
          Array.isArray(data)
            ? data
            : [];

        setDocuments(
          documentList,
        );

        if (
          documentList.length ===
          0
        ) {
          setSelectedDocumentId(
            null,
          );

          setSelectedDocName(
            "",
          );

          return;
        }

        const firstProcessedDoc =
          documentList.find(
            (doc: any) =>
              isDocumentProcessed(
                doc,
              ),
          );

        const firstDoc =
          firstProcessedDoc ||
          documentList[0];

        setSelectedDocumentId(
          firstDoc.id,
        );

        setSelectedDocName(
          getDocumentName(
            firstDoc,
          ),
        );
      } catch (error: any) {
        console.error(
          "Cannot load AI-ready documents:",
          error,
        );

        toast.error(
          error?.response?.data
            ?.message ||
            error?.response?.data
              ?.error ||
            "Cannot load uploaded documents",
        );

        setDocuments([]);
        setSelectedDocumentId(
          null,
        );
        setSelectedDocName("");
      }
    };

  /* =======================================================
     LOAD DOCUMENTS
  ======================================================= */

  useEffect(() => {
    fetchDocuments();
  }, []);

  /* =======================================================
     SELECT DOCUMENT
  ======================================================= */

  const handleSelectDocument = (
    doc: any,
  ) => {
    if (
      !isDocumentProcessed(doc)
    ) {
      toast.error(
        "This document is not processed yet. Please wait until AI Status is PROCESSED.",
      );

      return;
    }

    setSelectedDocumentId(
      doc.id,
    );

    setSelectedDocName(
      getDocumentName(doc),
    );
  };

  /* =======================================================
     NORMALIZE QUESTIONS
  ======================================================= */

  const normalizeQuestions = (
    data: any,
  ): Question[] => {
    if (!data) {
      return [];
    }

    const rawQuestions =
      data?.questions ||
      data?.items ||
      data?.quizQuestions ||
      data?.questionResponses ||
      [];

    if (
      !Array.isArray(
        rawQuestions,
      )
    ) {
      return [];
    }

    return rawQuestions
      .map(
        (question: any) => {
          const rawOptions =
            question?.options ||
            question?.answers ||
            question?.quizOptions ||
            question?.optionResponses ||
            [];

          const optionTexts =
            Array.isArray(
              rawOptions,
            )
              ? rawOptions.map(
                  (
                    option: any,
                  ) => {
                    if (
                      typeof option ===
                      "string"
                    ) {
                      return option;
                    }

                    return (
                      option?.optionContent ||
                      option?.optionText ||
                      option?.content ||
                      option?.text ||
                      option?.answerText ||
                      ""
                    );
                  },
                )
              : [];

          const correctIndex =
            Array.isArray(
              rawOptions,
            )
              ? rawOptions.findIndex(
                  (
                    option: any,
                  ) =>
                    option?.isCorrect ===
                      true ||
                    option?.correct ===
                      true,
                )
              : -1;

          /*
           * Một số API có thể trả trực tiếp index đáp án đúng.
           */
          const directCorrectIndex =
            Number.isInteger(
              question?.correct,
            )
              ? question.correct
              : Number.isInteger(
                    question?.correctIndex,
                  )
                ? question.correctIndex
                : Number.isInteger(
                      question?.correctAnswerIndex,
                    )
                  ? question.correctAnswerIndex
                  : -1;

          return {
            question:
              question?.questionText ||
              question?.question ||
              question?.content ||
              question?.text ||
              "",

            options:
              optionTexts,

            correct:
              correctIndex >= 0
                ? correctIndex
                : directCorrectIndex >=
                    0
                  ? directCorrectIndex
                  : 0,

            explanation:
              question?.explanation ||
              question?.reason ||
              "",
          };
        },
      )
      .filter(
        (question) =>
          question.question.trim()
            .length > 0 &&
          question.options.length >
            0,
      );
  };

  /* =======================================================
     HISTORY
  ======================================================= */

  const fetchQuizHistory =
    async () => {
      const userId =
        getCurrentUserId();

      if (!userId) {
        toast.error(
          "Please login again.",
        );

        return;
      }

      setIsLoadingHistory(
        true,
      );

      try {
        const response =
          await getQuizzesApi(
            userId,
          );

        const data =
          Array.isArray(
            response.data,
          )
            ? response.data
            : response.data
                ?.content || [];

        setQuizHistoryData(
          data,
        );
      } catch (error: any) {
        console.error(
          "Load quiz history failed:",
          error,
        );

        toast.error(
          error?.response?.data
            ?.message ||
            error?.response?.data
              ?.error ||
            "Cannot load quiz history",
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
    newView: View,
  ) => {
    setView(newView);

    if (
      newView === "history"
    ) {
      fetchQuizHistory();
    }
  };

  /* =======================================================
     VIEW HISTORY DETAIL
  ======================================================= */

  const handleViewQuizDetail =
    async (
      quizId: number,
    ) => {
      const userId =
        getCurrentUserId();

      if (!userId) {
        toast.error(
          "Please login again.",
        );

        return;
      }

      try {
        const response =
          await getQuizByIdApi(
            quizId,
            userId,
          );

        const generatedQuestions =
          normalizeQuestions(
            response.data,
          );

        if (
          generatedQuestions.length ===
          0
        ) {
          toast.error(
            "No questions found.",
          );

          return;
        }

        setQuestions(
          generatedQuestions,
        );

        setCurrentQ(0);

        /*
         * History API hiện chưa lấy lại đáp án
         * user đã chọn, nên reset score và answers.
         */
        setScore(0);

        setAnswers(
          new Array(
            generatedQuestions.length,
          ).fill(null),
        );

        setSelectedAnswer(
          null,
        );

        setView("review");
      } catch (error: any) {
        console.error(
          "Load quiz detail failed:",
          error,
        );

        toast.error(
          error?.response?.data
            ?.message ||
            error?.response?.data
              ?.error ||
            "Cannot load quiz detail",
        );
      }
    };

  /* =======================================================
     GENERATE QUIZ
  ======================================================= */

  const handleStartQuiz =
    async () => {
      const userId =
        getCurrentUserId();

      if (!userId) {
        toast.error(
          "Please login again.",
        );

        return;
      }

      if (
        !selectedDocumentId
      ) {
        toast.error(
          "Please select a document first.",
        );

        return;
      }

      const selectedDoc =
        documents.find(
          (doc: any) =>
            doc.id ===
            selectedDocumentId,
        );

      if (
        selectedDoc &&
        !isDocumentProcessed(
          selectedDoc,
        )
      ) {
        toast.error(
          "This document is not processed yet. Please wait until AI Status is PROCESSED.",
        );

        return;
      }

      const difficultyMap: Record<
        string,
        string
      > = {
        Easy: "EASY",
        Intermediate:
          "MEDIUM",
        Hard: "HARD",
      };

      setIsGenerating(true);

      try {
        const response =
          await generateQuizApi({
            userId,

            documentId:
              selectedDocumentId,

            questionCount,

            difficulty:
              difficultyMap[
                difficulty
              ],

            quizType:
              "MULTIPLE_CHOICE",
          });

        const generatedQuestions =
          normalizeQuestions(
            response.data,
          );

        if (
          generatedQuestions.length ===
          0
        ) {
          toast.error(
            "No questions returned from API.",
          );

          return;
        }

        setQuestions(
          generatedQuestions,
        );

        setCurrentQ(0);
        setScore(0);

        setAnswers(
          new Array(
            generatedQuestions.length,
          ).fill(null),
        );

        setSelectedAnswer(
          null,
        );

        setView("quiz");

        toast.success(
          "Quiz generated successfully!",
        );
      } catch (error: any) {
        console.error(
          "Generate quiz failed:",
          error,
        );

        toast.error(
          error?.response?.data
            ?.message ||
            error?.response?.data
              ?.error ||
            "Generate quiz failed",
        );
      } finally {
        setIsGenerating(
          false,
        );
      }
    };

  /* =======================================================
     ANSWER
  ======================================================= */

  const handleAnswer = (
    answerIndex: number,
  ) => {
    if (
      !questions[currentQ]
    ) {
      return;
    }

    /*
     * Không cho chọn lại khi đã click đáp án.
     */
    if (
      selectedAnswer !== null
    ) {
      return;
    }

    setSelectedAnswer(
      answerIndex,
    );

    setAnswers(
      (previousAnswers) => {
        const updatedAnswers =
          [
            ...previousAnswers,
          ];

        updatedAnswers[
          currentQ
        ] = answerIndex;

        return updatedAnswers;
      },
    );

    if (
      answerIndex ===
      questions[currentQ]
        .correct
    ) {
      setScore(
        (previousScore) =>
          previousScore + 1,
      );
    }

    setTimeout(() => {
      const isLastQuestion =
        currentQ >=
        questions.length - 1;

      if (isLastQuestion) {
        setView("result");
        return;
      }

      setCurrentQ(
        (previousQuestion) =>
          previousQuestion + 1,
      );

      setSelectedAnswer(
        null,
      );
    }, 1000);
  };

  /* =======================================================
     RETAKE

     Làm lại đúng bộ câu hỏi hiện tại.
     KHÔNG gọi generateQuizApi.
     KHÔNG tốn thêm token AI.
  ======================================================= */

  const handleRetakeQuiz = () => {
    if (
      questions.length === 0
    ) {
      toast.error(
        "No quiz available to retake.",
      );

      return;
    }

    setCurrentQ(0);
    setScore(0);

    setAnswers(
      new Array(
        questions.length,
      ).fill(null),
    );

    setSelectedAnswer(
      null,
    );

    setView("quiz");
  };

  /* =======================================================
     QUIT CURRENT QUIZ
  ======================================================= */

  const handleQuitQuiz = () => {
    setView("setup");

    setQuestions([]);
    setCurrentQ(0);
    setScore(0);
    setAnswers([]);

    setSelectedAnswer(
      null,
    );
  };

  /* =======================================================
     BACK TO QUIZ PAGE

     Quay về configuration.
     Không gọi API.
  ======================================================= */

  const handleBackToQuiz = () => {
    setView("setup");

    setQuestions([]);
    setCurrentQ(0);
    setScore(0);
    setAnswers([]);

    setSelectedAnswer(
      null,
    );
  };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="space-y-8">
      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Quiz Generator
          </h1>

          <p className="text-slate-500 dark:text-slate-400">
            AI-powered quizzes
            from your study
            materials
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(
            [
              "setup",
              "history",
            ] as View[]
          ).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() =>
                handleChangeView(
                  item,
                )
              }
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                view === item
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              }`}
            >
              {item === "setup"
                ? "Create Quiz"
                : "History"}
            </button>
          ))}
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
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">
                  Quiz Configuration
                </h2>

                {/* =========================================
                    DOCUMENT
                ========================================= */}

                <div className="mb-5">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                    Source Document
                  </label>

                  {documents.length ===
                  0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No AI-ready
                      documents found.
                    </p>
                  ) : (
                    <>
                      {visibleDocuments.map(
                        (doc: any) => {
                          const docName =
                            getDocumentName(
                              doc,
                            );

                          const processStatus =
                            getProcessStatus(
                              doc,
                            );

                          const isProcessed =
                            isDocumentProcessed(
                              doc,
                            );

                          const isSelected =
                            selectedDocumentId ===
                            doc.id;

                          return (
                            <label
                              key={
                                doc.id
                              }
                              className={`flex items-center gap-3 p-3.5 border-2 rounded-2xl mb-2 transition-all ${
                                isProcessed
                                  ? "cursor-pointer"
                                  : "cursor-not-allowed opacity-60"
                              } ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50/30 dark:bg-blue-500/10"
                                  : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              <input
                                type="radio"
                                checked={
                                  isSelected
                                }
                                onChange={() =>
                                  handleSelectDocument(
                                    doc,
                                  )
                                }
                                disabled={
                                  !isProcessed
                                }
                                className="sr-only"
                              />

                              <FileText className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />

                              <span className="min-w-0 flex-1 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                {
                                  docName
                                }
                              </span>

                              {processStatus && (
                                <span
                                  className={`shrink-0 text-[11px] font-bold ${
                                    isProcessed
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-amber-600 dark:text-amber-400"
                                  }`}
                                >
                                  {
                                    processStatus
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
                                    doc.id,
                                  );
                                }}
                                disabled={
                                  loadingDocumentId ===
                                  doc.id
                                }
                                className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                                title="Share document"
                                aria-label={`Share ${docName}`}
                              >
                                <Share2
                                  className={`h-4 w-4 ${
                                    loadingDocumentId ===
                                    doc.id
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
                                previous,
                              ) =>
                                !previous,
                            )
                          }
                          className="w-full mt-3 py-3 rounded-2xl border border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/30 transition"
                        >
                          {showAllDocuments
                            ? "Thu gọn"
                            : `Xem thêm (${documents.length - DISPLAY_LIMIT})`}
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* =========================================
                    DIFFICULTY
                ========================================= */}

                <div className="mb-5">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                    Difficulty
                    Level
                  </label>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      "Easy",
                      "Intermediate",
                      "Hard",
                    ].map(
                      (item) => (
                        <button
                          key={
                            item
                          }
                          type="button"
                          onClick={() =>
                            setDifficulty(
                              item,
                            )
                          }
                          className={`py-3 rounded-2xl font-bold text-sm transition-all border-2 ${
                            difficulty ===
                            item
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300"
                              : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300"
                          }`}
                        >
                          {
                            item
                          }
                        </button>
                      ),
                    )}
                  </div>
                </div>

                {/* =========================================
                    NUMBER OF QUESTIONS
                ========================================= */}

                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Number of
                      Questions
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

                {/* =========================================
                    START
                ========================================= */}

                <button
                  type="button"
                  onClick={
                    handleStartQuiz
                  }
                  disabled={
                    isGenerating ||
                    !selectedDocumentId
                  }
                  className="w-full py-4 bg-blue-600 text-white font-extrabold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 text-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Sparkles className="w-5 h-5" />

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
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-8">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Question{" "}
                      {currentQ +
                        1}{" "}
                      of{" "}
                      {
                        questions.length
                      }
                    </span>

                    <div className="bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 w-48 max-w-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            ((currentQ +
                              1) /
                              questions.length) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <Clock className="w-4 h-4 text-slate-500" />

                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {
                        difficulty
                      }
                    </span>
                  </div>
                </div>

                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-6 leading-relaxed">
                  {
                    currentQuestion.question
                  }
                </h2>

                <div className="space-y-3">
                  {currentQuestion.options.map(
                    (
                      option,
                      index,
                    ) => {
                      const isCorrect =
                        index ===
                        currentQuestion.correct;

                      const isSelected =
                        selectedAnswer ===
                        index;

                      const showResult =
                        selectedAnswer !==
                        null;

                      return (
                        <button
                          key={
                            index
                          }
                          type="button"
                          onClick={() =>
                            handleAnswer(
                              index,
                            )
                          }
                          disabled={
                            selectedAnswer !==
                            null
                          }
                          className={`w-full flex items-center gap-4 p-4 border-2 rounded-2xl text-left font-semibold text-sm transition-all ${
                            showResult
                              ? isCorrect
                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : isSelected
                                  ? "border-red-400 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300"
                                  : "border-slate-200 dark:border-slate-700 text-slate-500"
                              : "border-slate-200 dark:border-slate-700 hover:border-blue-400 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 bg-slate-50 dark:bg-slate-800">
                            {showResult &&
                            isCorrect ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : showResult &&
                              isSelected ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              String.fromCharCode(
                                65 +
                                  index,
                              )
                            )}
                          </div>

                          <span>
                            {
                              option
                            }
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>

                {selectedAnswer !==
                  null && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: 10,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    className="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800"
                  >
                    <p className="text-sm font-bold mb-1">
                      {selectedAnswer ===
                      currentQuestion.correct
                        ? "✓ Correct!"
                        : "✗ Incorrect"}
                    </p>

                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {currentQuestion.explanation ||
                        "No explanation provided."}
                    </p>
                  </motion.div>
                )}
              </div>

              <div className="flex justify-center mt-5">
                <button
                  type="button"
                  onClick={
                    handleQuitQuiz
                  }
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-semibold"
                >
                  <RotateCcw className="w-4 h-4" />

                  Quit Quiz
                </button>
              </div>
            </motion.div>
          )}

        {/* =================================================
            RESULT
        ================================================= */}

        {view === "result" && (
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
            className="max-w-2xl mx-auto space-y-5"
          >
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-8 text-center">
              <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-3" />

              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">
                Quiz Complete!
              </h2>

              <p className="text-slate-500 dark:text-slate-400 mb-8">
                {
                  selectedDocName
                }
              </p>

              {/* SCORE */}

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div>
                  <div
                    className={`text-5xl md:text-6xl font-extrabold ${gradeColors[grade]}`}
                  >
                    {grade}
                  </div>

                  <p className="text-sm text-slate-500">
                    Grade
                  </p>
                </div>

                <div>
                  <div className="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white">
                    {pct}%
                  </div>

                  <p className="text-sm text-slate-500">
                    Score
                  </p>
                </div>

                <div>
                  <div className="text-5xl md:text-6xl font-extrabold text-blue-600">
                    {score}/
                    {
                      questions.length
                    }
                  </div>

                  <p className="text-sm text-slate-500">
                    Correct
                  </p>
                </div>
              </div>

              {/* ===========================================
                  ACTION BUTTONS
              =========================================== */}

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={
                      handleRetakeQuiz
                    }
                    className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                  >
                    Retake Quiz
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setView(
                        "review",
                      )
                    }
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition"
                  >
                    Review Answers
                  </button>
                </div>

                <button
                  type="button"
                  onClick={
                    handleBackToQuiz
                  }
                  className="w-full py-3 flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  <ArrowLeft className="w-4 h-4" />

                  Back to Quiz
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* =================================================
            REVIEW
        ================================================= */}

        {view === "review" && (
          <motion.div
            key="review"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            className="max-w-2xl mx-auto space-y-4"
          >
            <button
              type="button"
              onClick={() =>
                handleChangeView(
                  "history",
                )
              }
              className="text-sm font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              ← Back to History
            </button>

            {questions.map(
              (
                question,
                index,
              ) => {
                const userAnswer =
                  answers[index];

                const hasUserAnswer =
                  userAnswer !==
                    null &&
                  userAnswer !==
                    undefined;

                const isUserCorrect =
                  hasUserAnswer &&
                  userAnswer ===
                    question.correct;

                return (
                  <div
                    key={index}
                    className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6"
                  >
                    <h3 className="font-bold text-slate-900 dark:text-white mb-4 leading-relaxed">
                      Question{" "}
                      {index +
                        1}
                      :{" "}
                      {
                        question.question
                      }
                    </h3>

                    <div className="space-y-2">
                      {question.options.map(
                        (
                          option,
                          optionIndex,
                        ) => {
                          const isCorrectOption =
                            optionIndex ===
                            question.correct;

                          const isUserOption =
                            optionIndex ===
                            userAnswer;

                          let optionClass =
                            "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300";

                          if (
                            isCorrectOption
                          ) {
                            optionClass =
                              "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
                          } else if (
                            hasUserAnswer &&
                            isUserOption
                          ) {
                            optionClass =
                              "border-red-400 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300";
                          }

                          return (
                            <div
                              key={
                                optionIndex
                              }
                              className={`p-3 border rounded-xl text-sm font-medium ${optionClass}`}
                            >
                              {String.fromCharCode(
                                65 +
                                  optionIndex,
                              )}
                              .{" "}
                              {
                                option
                              }
                            </div>
                          );
                        },
                      )}
                    </div>

                    {hasUserAnswer && (
                      <p
                        className={`mt-4 text-sm font-bold ${
                          isUserCorrect
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {isUserCorrect
                          ? "✓ Your answer is correct."
                          : "✗ Your answer is incorrect."}
                      </p>
                    )}

                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-3">
                      <span className="font-bold">
                        Correct
                        answer:
                      </span>{" "}

                      {question
                        .options[
                        question.correct
                      ] ||
                        "N/A"}
                    </p>

                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                      <span className="font-bold">
                        Explanation:
                      </span>{" "}

                      {question.explanation ||
                        "No explanation provided."}
                    </p>
                  </div>
                );
              },
            )}
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
            {isLoadingHistory ? (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-slate-500 dark:text-slate-400">
                  Loading quiz
                  history...
                </p>
              </div>
            ) : quizHistoryData.length ===
              0 ? (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-slate-500 dark:text-slate-400">
                  No quiz history
                  found.
                </p>
              </div>
            ) : (
              quizHistoryData.map(
                (
                  quiz,
                  index,
                ) => {
                  const quizId =
                    quiz.quizId ??
                    quiz.id;

                  const title =
                    quiz.title ||
                    quiz.documentTitle ||
                    quiz.topic ||
                    "Untitled Quiz";

                  const totalQuestions =
                    quiz.questionCount ??
                    quiz.totalQuestions ??
                    0;

                  return (
                    <button
                      key={
                        quizId ??
                        index
                      }
                      type="button"
                      disabled={
                        quizId ===
                        undefined
                      }
                      onClick={() => {
                        if (
                          quizId !==
                          undefined
                        ) {
                          handleViewQuizDetail(
                            quizId,
                          );
                        }
                      }}
                      className="w-full text-left bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition disabled:opacity-60"
                    >
                      <p className="font-bold text-slate-900 dark:text-white">
                        {title}
                      </p>

                      <p className="text-sm text-slate-500 mt-1">
                        {quiz.score !==
                        undefined
                          ? `${quiz.score}% · `
                          : ""}

                        {quiz.difficulty ||
                          "N/A"}

                        {" · "}

                        {
                          totalQuestions
                        }{" "}
                        questions
                      </p>

                      <p className="text-xs text-slate-400 mt-1">
                        {quiz.createdAt ||
                          quiz.date ||
                          ""}
                      </p>
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