import {
  Puzzle, Trophy, Clock, CheckCircle2, XCircle,
  FileText, Sparkles, BrainCircuit, RotateCcw,
  Medal, Target, BookOpen, TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { documentApi } from "../../services/documentApi";

type View = "setup" | "quiz" | "result" | "history" | "bank" | "leaderboard" | "review";

const mockQuestions = [
  {
    question: "Which part of the neuron receives signals from other neurons?",
    options: ["Axon", "Dendrite", "Myelin Sheath", "Soma"],
    correct: 1,
    explanation: "Dendrites receive signals from other neurons.",
  },
  {
    question: "What is the primary excitatory neurotransmitter in the central nervous system?",
    options: ["GABA", "Dopamine", "Glutamate", "Serotonin"],
    correct: 2,
    explanation: "Glutamate is the most abundant excitatory neurotransmitter in the CNS.",
  },
  {
    question: "The gap between two communicating neurons is called the:",
    options: ["Synapse", "Node of Ranvier", "Axon Hillock", "Vesicle"],
    correct: 0,
    explanation: "The synapse is the junction between two neurons.",
  },
];

const quizHistory = [
  { id: 1, topic: "Intro to Psychology", score: 85, time: "8 min", date: "Jun 5, 2024", difficulty: "Intermediate" },
  { id: 2, topic: "Advanced Thermodynamics", score: 60, time: "12 min", date: "Jun 4, 2024", difficulty: "Hard" },
  { id: 3, topic: "Calculus III", score: 90, time: "7 min", date: "Jun 3, 2024", difficulty: "Easy" },
];

const leaderboardData = [
  { rank: 1, name: "James O'Brien", score: 2840, quizzes: 47, badge: "gold" },
  { rank: 2, name: "Emma Rodriguez", score: 2610, quizzes: 41, badge: "silver" },
  { rank: 3, name: "Alex Johnson", score: 2450, quizzes: 38, badge: "bronze" },
];

const questionBank = [
  { id: 1, topic: "Psychology", question: "What is classical conditioning?", difficulty: "Easy" },
  { id: 2, topic: "Physics", question: "State Newton's second law of motion", difficulty: "Intermediate" },
  { id: 3, topic: "Math", question: "What is the derivative of ln(x)?", difficulty: "Intermediate" },
];

const performanceData = [
  { subject: "Psychology", score: 82 },
  { subject: "Physics", score: 65 },
  { subject: "Math", score: 90 },
  { subject: "History", score: 74 },
  { subject: "Chemistry", score: 58 },
];

const BadgeIcon = ({ badge }: { badge: string | null }) => {
  if (!badge) return <span className="text-sm text-slate-500 font-bold">#</span>;
  const colors: Record<string, string> = {
    gold: "text-amber-500",
    silver: "text-slate-400",
    bronze: "text-amber-700",
  };
  return <Medal className={`w-5 h-5 ${colors[badge]}`} />;
};

export function QuizGeneratorPage() {
  const [view, setView] = useState<View>("setup");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [questionCount, setQuestionCount] = useState(10);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [selectedDocName, setSelectedDocName] = useState("");
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const data = await documentApi.getAllDocumentsForSelect();
        setDocuments(data);

        if (data.length > 0) {
          setSelectedDocumentId(data[0].id);
          setSelectedDocName(data[0].name || data[0].title || data[0].fileName);
        }
      } catch (error) {
        console.error("Cannot load uploaded documents", error);
        toast.error("Cannot load uploaded documents");
      }
    };

    fetchDocuments();
  }, []);

  const handleSelectDocument = (doc: any) => {
    setSelectedDocumentId(doc.id);
    setSelectedDocName(doc.name || doc.title || doc.fileName);
  };

  const handleStartQuiz = () => {
    if (!selectedDocumentId) {
      toast.error("Please select a document first");
      return;
    }

    console.log("Generate quiz from document:", {
      documentId: selectedDocumentId,
      difficulty,
      questionCount,
    });

    setView("quiz");
    setCurrentQ(0);
    setScore(0);
    setAnswers([]);
    setSelectedAnswer(null);
  };

  const handleAnswer = (idx: number) => {
    setSelectedAnswer(idx);
    setAnswers((prev) => [...prev, idx]);

    if (idx === mockQuestions[currentQ].correct) {
      setScore((prev) => prev + 1);
    }

    setTimeout(() => {
      if (currentQ < mockQuestions.length - 1) {
        setCurrentQ((prev) => prev + 1);
        setSelectedAnswer(null);
      } else {
        setView("result");
      }
    }, 1000);
  };

  const pct = Math.round((score / mockQuestions.length) * 100);
  const grade = pct >= 90 ? "A" : pct >= 80 ? "B" : pct >= 70 ? "C" : pct >= 60 ? "D" : "F";
  const gradeColors: Record<string, string> = {
    A: "text-emerald-500",
    B: "text-blue-500",
    C: "text-amber-500",
    D: "text-orange-500",
    F: "text-red-500",
  };

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
          {(["setup", "history", "bank", "leaderboard"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                view === v
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              }`}
            >
              {v === "setup" ? "Create Quiz" : v === "bank" ? "Question Bank" : v}
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
                    documents.map((doc) => {
                      const docName = doc.name || doc.title || doc.fileName || "Untitled document";

                      return (
                        <label
                          key={doc.id}
                          className={`flex items-center gap-3 p-3.5 border-2 rounded-2xl mb-2 cursor-pointer transition-all ${
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

                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              selectedDocumentId === doc.id
                                ? "border-blue-500 bg-blue-600"
                                : "border-slate-300 dark:border-slate-600"
                            }`}
                          >
                            {selectedDocumentId === doc.id && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>

                          <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                            {docName}
                          </span>
                        </label>
                      );
                    })
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

                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span>5</span>
                    <span>10</span>
                    <span>15</span>
                    <span>20</span>
                    <span>25</span>
                  </div>
                </div>

                <button
                  onClick={handleStartQuiz}
                  className="w-full py-4 bg-blue-600 text-white font-extrabold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 text-lg"
                >
                  <Sparkles className="w-5 h-5" />
                  Generate & Start Quiz
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
                <p className="text-sm opacity-70 mt-2">
                  Keep going to maintain your streak!
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {view === "quiz" && (
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
                    Question {currentQ + 1} of {mockQuestions.length}
                  </span>
                  <div className="bg-slate-50 dark:bg-slate-800 h-2 rounded-full mt-2 w-48">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${((currentQ + 1) / mockQuestions.length) * 100}%`,
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
                {mockQuestions[currentQ].question}
              </h2>

              <div className="space-y-3">
                {mockQuestions[currentQ].options.map((opt, i) => {
                  const isCorrect = i === mockQuestions[currentQ].correct;
                  const isSelected = selectedAnswer === i;
                  const showResult = selectedAnswer !== null;

                  return (
                    <button
                      key={i}
                      onClick={() => selectedAnswer === null && handleAnswer(i)}
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
                    {selectedAnswer === mockQuestions[currentQ].correct
                      ? "✓ Correct!"
                      : "✗ Incorrect"}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {mockQuestions[currentQ].explanation}
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
                  <div className={`text-6xl font-extrabold ${gradeColors[grade]}`}>
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
                    {score}/{mockQuestions.length}
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
          <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-4">
            <button onClick={() => setView("result")} className="text-sm font-semibold text-slate-500">
              ← Back to Results
            </button>

            {mockQuestions.map((q, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="font-bold text-slate-900 dark:text-white mb-3">
                  Question {i + 1}: {q.question}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Explanation: {q.explanation}
                </p>
              </div>
            ))}
          </motion.div>
        )}

        {view === "history" && (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {quizHistory.map((q) => (
              <div key={q.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <p className="font-bold text-slate-900 dark:text-white">{q.topic}</p>
                <p className="text-sm text-slate-500">
                  {q.score}% · {q.difficulty} · {q.time} · {q.date}
                </p>
              </div>
            ))}
          </motion.div>
        )}

        {view === "bank" && (
          <motion.div key="bank" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Question Bank
            </h2>

            {questionBank.map((q) => (
              <div key={q.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-2xl">
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  {q.question}
                </p>
                <p className="text-xs text-slate-500">
                  {q.topic} · {q.difficulty}
                </p>
              </div>
            ))}
          </motion.div>
        )}

        {view === "leaderboard" && (
          <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <Trophy className="w-10 h-10 text-amber-400 mx-auto mb-2" />
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white text-center mb-6">
                Leaderboard
              </h2>

              {leaderboardData.map((entry) => (
                <div key={entry.rank} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-3">
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