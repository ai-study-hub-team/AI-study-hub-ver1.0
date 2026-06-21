import {
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Sparkles,
  RotateCcw,
  Medal,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

import { documentApi } from "../../services/documentApi";
import {
  generateQuizApi,
  getQuizzesApi,
  getQuizByIdApi,
} from "../../services/aiApi";
import { getCurrentUserId } from "../../services/apiClient";

type View = "setup" | "quiz" | "result" | "history" | "leaderboard" | "review";

type Question = {
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
};

const DISPLAY_LIMIT = 6;

const leaderboardData = [
  { rank: 1, name: "James O'Brien", score: 2840, quizzes: 47, badge: "gold" },
  { rank: 2, name: "Emma Rodriguez", score: 2610, quizzes: 41, badge: "silver" },
  { rank: 3, name: "Alex Johnson", score: 2450, quizzes: 38, badge: "bronze" },
];

const performanceData = [
  { subject: "Psychology", score: 82 },
  { subject: "Physics", score: 65 },
  { subject: "Math", score: 90 },
  { subject: "History", score: 74 },
];

const BadgeIcon = ({ badge }: { badge: string | null }) => {
  const colors: Record<string, string> = {
    gold: "text-amber-500",
    silver: "text-slate-400",
    bronze: "text-amber-700",
  };

  return <Medal className={`w-5 h-5 ${colors[badge || "gold"]}`} />;
};

export function QuizGeneratorPage() {
  const [view, setView] = useState<View>("setup");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [questionCount, setQuestionCount] = useState(10);

  const [documents, setDocuments] = useState<any[]>([]);
  const [showAllDocuments, setShowAllDocuments] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(
    null,
  );
  const [selectedDocName, setSelectedDocName] = useState("");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [quizHistoryData, setQuizHistoryData] = useState<any[]>([]);

  const visibleDocuments = showAllDocuments
    ? documents
    : documents.slice(0, DISPLAY_LIMIT);

  const hiddenDocumentCount = Math.max(documents.length - DISPLAY_LIMIT, 0);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const getProcessStatus = (doc: any) => {
    return doc?.processStatus || doc?.aiStatus || "";
  };

  const isDocumentProcessed = (doc: any) => {
    const processStatus = getProcessStatus(doc);

    if (!processStatus) return true;

    return processStatus === "PROCESSED";
  };

  const fetchDocuments = async () => {
    try {
      const userId = getCurrentUserId();

      if (!userId) {
        toast.error("Please login again.");
        return;
      }

      const data = await documentApi.getAllDocumentsForSelect(userId);
      setDocuments(data);

      if (data.length > 0) {
        const firstProcessedDoc = data.find((doc: any) =>
          isDocumentProcessed(doc),
        );
        const firstDoc = firstProcessedDoc || data[0];

        setSelectedDocumentId(firstDoc.id);
        setSelectedDocName(
          firstDoc.name || firstDoc.title || firstDoc.fileName || "Untitled",
        );
      }
    } catch (error: any) {
      console.error("Cannot load uploaded documents:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot load uploaded documents",
      );
    }
  };

  const fetchQuizHistory = async () => {
    const userId = getCurrentUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    try {
      const res = await getQuizzesApi(userId);

      const data = Array.isArray(res.data) ? res.data : res.data?.content || [];

      setQuizHistoryData(data);
    } catch (error: any) {
      console.error("Load quiz history failed:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot load quiz history",
      );
    }
  };

  const normalizeQuestions = (data: any): Question[] => {
    const rawQuestions =
      data.questions ||
      data.items ||
      data.quizQuestions ||
      data.questionResponses ||
      [];

    return rawQuestions.map((q: any) => {
      const rawOptions =
        q.options ||
        q.answers ||
        q.quizOptions ||
        q.optionResponses ||
        [];

      const optionTexts = rawOptions.map((opt: any) => {
        if (typeof opt === "string") return opt;

        return (
          opt.optionContent ||
          opt.optionText ||
          opt.content ||
          opt.text ||
          opt.answerText ||
          ""
        );
      });

      const correctIndex = rawOptions.findIndex(
        (opt: any) => opt.isCorrect === true || opt.correct === true,
      );

      return {
        question: q.questionText || q.question || q.content || q.text || "",
        options: optionTexts,
        correct: correctIndex >= 0 ? correctIndex : 0,
        explanation: q.explanation || q.reason || "",
      };
    });
  };

  const handleViewQuizDetail = async (quizId: number) => {
    const userId = getCurrentUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    try {
      const res = await getQuizByIdApi(quizId, userId);

      const generatedQuestions = normalizeQuestions(res.data);

      if (!generatedQuestions.length) {
        toast.error("No questions found");
        return;
      }

      setQuestions(generatedQuestions);
      setCurrentQ(0);
      setScore(0);
      setAnswers(new Array(generatedQuestions.length).fill(null));
      setSelectedAnswer(null);
      setView("review");
    } catch (error: any) {
      console.error("Load quiz detail failed:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot load quiz detail",
      );
    }
  };

  const handleChangeView = (v: View) => {
    setView(v);

    if (v === "history") {
      fetchQuizHistory();
    }
  };

  const handleSelectDocument = (doc: any) => {
    if (!isDocumentProcessed(doc)) {
      toast.error(
        "This document is not processed yet. Please wait until AI Status is PROCESSED.",
      );
      return;
    }

    setSelectedDocumentId(doc.id);
    setSelectedDocName(doc.name || doc.title || doc.fileName || "Untitled");
  };

  const handleStartQuiz = async () => {
    const userId = getCurrentUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    if (!selectedDocumentId) {
      toast.error("Please select a document first");
      return;
    }

    const selectedDoc = documents.find((doc) => doc.id === selectedDocumentId);

    if (selectedDoc && !isDocumentProcessed(selectedDoc)) {
      toast.error(
        "This document is not processed yet. Please wait until AI Status is PROCESSED.",
      );
      return;
    }

    setIsGenerating(true);

    const difficultyMap: Record<string, string> = {
      Easy: "EASY",
      Intermediate: "MEDIUM",
      Hard: "HARD",
    };

    try {
      const res = await generateQuizApi({
        userId,
        documentId: selectedDocumentId,
        questionCount,
        difficulty: difficultyMap[difficulty],
        quizType: "MULTIPLE_CHOICE",
      });

      const generatedQuestions = normalizeQuestions(res.data);

      if (!generatedQuestions.length) {
        toast.error("No questions returned from API");
        return;
      }

      setQuestions(generatedQuestions);
      setCurrentQ(0);
      setScore(0);
      setAnswers(new Array(generatedQuestions.length).fill(null));
      setSelectedAnswer(null);
      setView("quiz");

      toast.success("Quiz generated successfully!");
    } catch (error: any) {
      console.error("Generate quiz failed:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Generate quiz failed",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswer = (idx: number) => {
    if (!questions[currentQ] || selectedAnswer !== null) return;

    setSelectedAnswer(idx);

    setAnswers((prev) => {
      const updated = [...prev];
      updated[currentQ] = idx;
      return updated;
    });

    if (idx === questions[currentQ].correct) {
      setScore((prev) => prev + 1);
    }

    setTimeout(() => {
      if (currentQ < questions.length - 1) {
        setCurrentQ((prev) => prev + 1);
        setSelectedAnswer(null);
      } else {
        setView("result");
      }
    }, 1000);
  };

  const pct =
    questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  const grade =
    pct >= 90 ? "A" : pct >= 80 ? "B" : pct >= 70 ? "C" : pct >= 60 ? "D" : "F";

  const gradeColors: Record<string, string> = {
    A: "text-emerald-500",
    B: "text-blue-500",
    C: "text-amber-500",
    D: "text-orange-500",
    F: "text-red-500",
  };

  const currentQuestion = questions[currentQ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Quiz Generator
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            AI-powered quizzes from your study materials
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(["setup", "history", "leaderboard"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => handleChangeView(v)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                view === v
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              }`}
            >
              {v === "setup" ? "Create Quiz" : v}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === "setup" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">
                  Quiz Configuration
                </h2>

                <div className="mb-5">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                    Source Document
                  </label>

                  {documents.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No uploaded documents found.
                    </p>
                  ) : (
                    <>
                      {visibleDocuments.map((doc) => {
                        const docName =
                          doc.name || doc.title || doc.fileName || "Untitled";

                        const processStatus = getProcessStatus(doc);
                        const isProcessed = isDocumentProcessed(doc);

                        return (
                          <label
                            key={doc.id}
                            className={`flex items-center gap-3 p-3.5 border-2 rounded-2xl mb-2 transition-all ${
                              isProcessed
                                ? "cursor-pointer"
                                : "cursor-not-allowed opacity-60"
                            } ${
                              selectedDocumentId === doc.id
                                ? "border-blue-500 bg-blue-50/30 dark:bg-blue-500/10"
                                : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            <input
                              type="radio"
                              checked={selectedDocumentId === doc.id}
                              onChange={() => handleSelectDocument(doc)}
                              className="sr-only"
                            />

                            <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />

                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                              {docName}
                            </span>

                            {processStatus && (
                              <span
                                className={`ml-auto text-[11px] font-bold ${
                                  isProcessed
                                    ? "text-emerald-600"
                                    : "text-amber-600"
                                }`}
                              >
                                {processStatus}
                              </span>
                            )}
                          </label>
                        );
                      })}

                      {documents.length > DISPLAY_LIMIT && (
                        <button
                          type="button"
                          onClick={() => setShowAllDocuments(!showAllDocuments)}
                          className="w-full mt-3 py-3 rounded-2xl border border-dashed border-blue-300 text-blue-600 font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/30 transition"
                        >
                          {showAllDocuments
                            ? "Thu gọn"
                            : `Xem thêm ${hiddenDocumentCount} file`}
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                    Difficulty Level
                  </label>

                  <div className="grid grid-cols-3 gap-3">
                    {["Easy", "Intermediate", "Hard"].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDifficulty(d)}
                        className={`py-3 rounded-2xl font-bold text-sm transition-all border-2 ${
                          difficulty === d
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300"
                            : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Number of Questions
                    </label>
                    <span className="text-sm font-extrabold text-blue-600">
                      {questionCount}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={5}
                    max={25}
                    step={5}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <button
                  onClick={handleStartQuiz}
                  disabled={isGenerating || !selectedDocumentId}
                  className="w-full py-4 bg-blue-600 text-white font-extrabold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-70"
                >
                  <Sparkles className="w-5 h-5" />
                  {isGenerating ? "Generating..." : "Generate & Start Quiz"}
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Your Performance
                </h3>

                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={performanceData} barSize={16}>
                    <XAxis
                      dataKey="subject"
                      tick={{ fontSize: 10, fill: "#94A3B8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip />
                    <Bar dataKey="score" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-5 text-white">
                <Trophy className="w-8 h-8 mb-3 opacity-80" />
                <p className="text-sm opacity-70 font-medium">Your streak</p>
                <p className="text-4xl font-extrabold">🔥 7 days</p>
              </div>
            </div>
          </motion.div>
        )}

        {view === "quiz" && currentQuestion && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Question {currentQ + 1} of {questions.length}
                  </span>

                  <div className="bg-slate-50 dark:bg-slate-800 h-2 rounded-full mt-2 w-48">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${((currentQ + 1) / questions.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {difficulty}
                  </span>
                </div>
              </div>

              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-6 leading-relaxed">
                {currentQuestion.question}
              </h2>

              <div className="space-y-3">
                {currentQuestion.options.map((opt, i) => {
                  const isCorrect = i === currentQuestion.correct;
                  const isSelected = selectedAnswer === i;
                  const showResult = selectedAnswer !== null;

                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(i)}
                      disabled={selectedAnswer !== null}
                      className={`w-full flex items-center gap-4 p-4 border-2 rounded-2xl text-left font-semibold text-sm transition-all ${
                        showResult
                          ? isCorrect
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : isSelected
                              ? "border-red-400 bg-red-50 text-red-600"
                              : "border-slate-200 text-slate-500"
                          : "border-slate-200 hover:border-blue-400 text-slate-700"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 bg-slate-50">
                        {showResult && isCorrect ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : showResult && isSelected ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          String.fromCharCode(65 + i)
                        )}
                      </div>

                      {opt}
                    </button>
                  );
                })}
              </div>

              {selectedAnswer !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800"
                >
                  <p className="text-sm font-bold mb-1">
                    {selectedAnswer === currentQuestion.correct
                      ? "✓ Correct!"
                      : "✗ Incorrect"}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {currentQuestion.explanation || "No explanation provided."}
                  </p>
                </motion.div>
              )}
            </div>

            <div className="flex justify-center mt-5">
              <button
                onClick={() => setView("setup")}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-semibold"
              >
                <RotateCcw className="w-4 h-4" />
                Quit Quiz
              </button>
            </div>
          </motion.div>
        )}

        {view === "result" && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto space-y-5"
          >
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-8 text-center">
              <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-3" />

              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">
                Quiz Complete!
              </h2>

              <p className="text-slate-500 dark:text-slate-400 mb-8">
                {selectedDocName}
              </p>

              <div className="flex items-center justify-center gap-8 mb-8">
                <div>
                  <div
                    className={`text-6xl font-extrabold ${gradeColors[grade]}`}
                  >
                    {grade}
                  </div>
                  <p className="text-sm text-slate-500">Grade</p>
                </div>

                <div>
                  <div className="text-6xl font-extrabold text-slate-900 dark:text-white">
                    {pct}%
                  </div>
                  <p className="text-sm text-slate-500">Score</p>
                </div>

                <div>
                  <div className="text-6xl font-extrabold text-blue-600">
                    {score}/{questions.length}
                  </div>
                  <p className="text-sm text-slate-500">Correct</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleStartQuiz}
                  className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold rounded-2xl"
                >
                  Retake Quiz
                </button>

                <button
                  onClick={() => setView("review")}
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-2xl"
                >
                  Review Answers
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {view === "review" && (
          <motion.div
            key="review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-2xl mx-auto space-y-4"
          >
            <button
              onClick={() => setView("history")}
              className="text-sm font-semibold text-slate-500"
            >
              ← Back to History
            </button>

            {questions.map((q, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6"
              >
                <h3 className="font-bold text-slate-900 dark:text-white mb-3">
                  Question {i + 1}: {q.question}
                </h3>

                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  Correct answer: {q.options[q.correct]}
                </p>

                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                  Explanation: {q.explanation || "No explanation provided."}
                </p>
              </div>
            ))}
          </motion.div>
        )}

        {view === "history" && (
          <motion.div
            key="history"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-5"
          >
            {quizHistoryData.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-slate-500 dark:text-slate-400">
                  No quiz history found.
                </p>
              </div>
            ) : (
              quizHistoryData.map((q) => (
                <button
                  key={q.quizId || q.id}
                  onClick={() => handleViewQuizDetail(q.quizId || q.id)}
                  className="w-full text-left bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition"
                >
                  <p className="font-bold text-slate-900 dark:text-white">
                    {q.title || q.documentTitle || q.topic || "Untitled Quiz"}
                  </p>

                  <p className="text-sm text-slate-500">
                    {q.score !== undefined ? `${q.score}% · ` : ""}
                    {q.difficulty || "N/A"} ·{" "}
                    {q.questionCount || q.totalQuestions || 0} questions
                  </p>

                  <p className="text-xs text-slate-400 mt-1">
                    {q.createdAt || q.date || ""}
                  </p>
                </button>
              ))
            )}
          </motion.div>
        )}

        {view === "leaderboard" && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-xl mx-auto"
          >
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <Trophy className="w-10 h-10 text-amber-400 mx-auto mb-2" />

              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white text-center mb-6">
                Leaderboard
              </h2>

              {leaderboardData.map((entry) => (
                <div
                  key={entry.rank}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-3"
                >
                  <BadgeIcon badge={entry.badge} />

                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {entry.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {entry.quizzes} quizzes completed
                    </p>
                  </div>

                  <p className="font-extrabold text-slate-900 dark:text-white">
                    {entry.score}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
