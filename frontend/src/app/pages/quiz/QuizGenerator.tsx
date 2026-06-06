import {
  Puzzle, Play, History, Trophy, Clock, CheckCircle2, XCircle,
  FileText, Sparkles, ArrowRight, BrainCircuit, RotateCcw,
  Star, Medal, ChevronRight, Target, BookOpen, TrendingUp,
  Users, Award, ChevronDown, ChevronUp
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type View = "setup" | "quiz" | "result" | "history" | "bank" | "leaderboard" | "review";

const mockQuestions = [
  {
    question: "Which part of the neuron receives signals from other neurons?",
    options: ["Axon", "Dendrite", "Myelin Sheath", "Soma"],
    correct: 1,
    explanation: "Dendrites are the branching extensions of a neuron that receive signals from other neurons and transmit them to the cell body.",
  },
  {
    question: "What is the primary excitatory neurotransmitter in the central nervous system?",
    options: ["GABA", "Dopamine", "Glutamate", "Serotonin"],
    correct: 2,
    explanation: "Glutamate is the most abundant excitatory neurotransmitter in the CNS, playing a key role in synaptic plasticity.",
  },
  {
    question: "The gap between two communicating neurons is called the:",
    options: ["Synapse", "Node of Ranvier", "Axon Hillock", "Vesicle"],
    correct: 0,
    explanation: "The synapse is the junction between two neurons where neurotransmitters are released from the presynaptic neuron.",
  },
];

const quizHistory = [
  { id: 1, topic: "Intro to Psychology", score: 85, total: 10, time: "8 min", date: "Jun 5, 2024", difficulty: "Intermediate" },
  { id: 2, topic: "Advanced Thermodynamics", score: 60, total: 10, time: "12 min", date: "Jun 4, 2024", difficulty: "Hard" },
  { id: 3, topic: "Calculus III", score: 90, total: 10, time: "7 min", date: "Jun 3, 2024", difficulty: "Easy" },
  { id: 4, topic: "Modern European History", score: 70, total: 10, time: "11 min", date: "Jun 1, 2024", difficulty: "Intermediate" },
];

const leaderboardData = [
  { rank: 1, name: "James O'Brien", score: 2840, quizzes: 47, badge: "gold" },
  { rank: 2, name: "Emma Rodriguez", score: 2610, quizzes: 41, badge: "silver" },
  { rank: 3, name: "Alex Johnson", score: 2450, quizzes: 38, badge: "bronze" },
  { rank: 4, name: "Priya Patel", score: 2200, quizzes: 35, badge: null },
  { rank: 5, name: "Sarah Chen", score: 1980, quizzes: 29, badge: null },
];

const questionBank = [
  { id: 1, topic: "Psychology", question: "What is classical conditioning?", difficulty: "Easy" },
  { id: 2, topic: "Physics", question: "State Newton's second law of motion", difficulty: "Intermediate" },
  { id: 3, topic: "Math", question: "What is the derivative of ln(x)?", difficulty: "Intermediate" },
  { id: 4, topic: "History", question: "When did World War II begin?", difficulty: "Easy" },
  { id: 5, topic: "Chemistry", question: "What is the oxidation state of oxygen in water?", difficulty: "Hard" },
];

const performanceData = [
  { subject: "Psychology", score: 82 },
  { subject: "Physics", score: 65 },
  { subject: "Math", score: 90 },
  { subject: "History", score: 74 },
  { subject: "Chemistry", score: 58 },
];

const BadgeIcon = ({ badge }: { badge: string | null }) => {
  if (!badge) return <span className="text-sm text-slate-400 font-bold">#</span>;
  const colors: Record<string, string> = { gold: "text-amber-500", silver: "text-slate-400", bronze: "text-amber-700" };
  return <Medal className={`w-5 h-5 ${colors[badge]}`} />;
};

export function QuizGenerator() {
  const [view, setView] = useState<View>("setup");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [questionCount, setQuestionCount] = useState(10);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedDoc, setSelectedDoc] = useState("Intro to Psychology Notes.pdf");
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [timer, setTimer] = useState(0);

  const handleStartQuiz = () => {
    setView("quiz");
    setCurrentQ(0);
    setScore(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setTimer(0);
  };

  const handleAnswer = (idx: number) => {
    setSelectedAnswer(idx);
    const newAnswers = [...answers, idx];
    setAnswers(newAnswers);
    const isCorrect = idx === mockQuestions[currentQ].correct;
    if (isCorrect) setScore((prev) => prev + 1);

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
  const gradeColors: Record<string, string> = { A: "text-emerald-500", B: "text-blue-500", C: "text-amber-500", D: "text-orange-500", F: "text-red-500" };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Quiz Generator</h1>
          <p className="text-slate-500">AI-powered quizzes from your study materials</p>
        </div>
        <div className="flex items-center gap-2">
          {(["setup", "history", "bank", "leaderboard"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${view === v ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              {v === "setup" ? "Create Quiz" : v === "bank" ? "Question Bank" : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Setup */}
        {view === "setup" && (
          <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-5">Quiz Configuration</h2>

                <div className="mb-5">
                  <label className="block text-sm font-bold text-slate-700 mb-3">Source Document</label>
                  {["Intro to Psychology Notes.pdf", "Advanced Thermodynamics.pdf", "Calculus III Problem Set.pdf"].map((doc) => (
                    <label key={doc} className={`flex items-center gap-3 p-3.5 border-2 rounded-2xl mb-2 cursor-pointer transition-all ${selectedDoc === doc ? "border-blue-500 bg-blue-50/30" : "border-slate-100 hover:border-slate-200"}`}>
                      <input type="radio" checked={selectedDoc === doc} onChange={() => setSelectedDoc(doc)} className="sr-only" />
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedDoc === doc ? "border-blue-500 bg-blue-600" : "border-slate-300"}`}>
                        {selectedDoc === doc && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-800 truncate">{doc}</span>
                    </label>
                  ))}
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-bold text-slate-700 mb-3">Difficulty Level</label>
                  <div className="grid grid-cols-3 gap-3">
                    {["Easy", "Intermediate", "Hard"].map((d) => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`py-3 rounded-2xl font-bold text-sm transition-all border-2 ${
                          difficulty === d
                            ? d === "Easy" ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : d === "Intermediate" ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-red-500 bg-red-50 text-red-700"
                            : "border-slate-100 text-slate-500 hover:border-slate-200"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-bold text-slate-700">Number of Questions</label>
                    <span className="text-sm font-extrabold text-blue-600">{questionCount}</span>
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
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>5</span><span>10</span><span>15</span><span>20</span><span>25</span>
                  </div>
                </div>

                <button
                  onClick={handleStartQuiz}
                  className="w-full py-4 bg-blue-600 text-white font-extrabold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 text-lg"
                >
                  <Sparkles className="w-5 h-5" /> Generate & Start Quiz
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-600" /> Your Performance</h3>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={performanceData} barSize={16}>
                    <XAxis dataKey="subject" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "11px" }} />
                    <Bar dataKey="score" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-5 text-white">
                <Trophy className="w-8 h-8 mb-3 opacity-80" />
                <p className="text-sm opacity-70 font-medium">Your streak</p>
                <p className="text-4xl font-extrabold">🔥 7 days</p>
                <p className="text-sm opacity-70 mt-2">Keep going to maintain your streak!</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Quiz */}
        {view === "quiz" && (
          <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question {currentQ + 1} of {mockQuestions.length}</span>
                  <div className="w-full bg-slate-100 h-2 rounded-full mt-2 w-48">
                    <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${((currentQ + 1) / mockQuestions.length) * 100}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-bold text-slate-700">{difficulty}</span>
                </div>
              </div>

              <h2 className="text-xl font-extrabold text-slate-900 mb-6 leading-relaxed">{mockQuestions[currentQ].question}</h2>

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
                          ? isCorrect ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : isSelected ? "border-red-400 bg-red-50 text-red-600"
                            : "border-slate-100 text-slate-400"
                          : "border-slate-100 hover:border-blue-400 hover:bg-blue-50/30 text-slate-800 cursor-pointer"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 ${
                        showResult
                          ? isCorrect ? "bg-emerald-500 text-white" : isSelected ? "bg-red-500 text-white" : "bg-slate-100 text-slate-400"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {showResult && isCorrect ? <CheckCircle2 className="w-4 h-4" /> : showResult && isSelected ? <XCircle className="w-4 h-4" /> : String.fromCharCode(65 + i)}
                      </div>
                      {opt}
                    </button>
                  );
                })}
              </div>

              {selectedAnswer !== null && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-5 p-4 rounded-2xl ${selectedAnswer === mockQuestions[currentQ].correct ? "bg-emerald-50 border border-emerald-100" : "bg-red-50 border border-red-100"}`}>
                  <p className={`text-sm font-bold mb-1 ${selectedAnswer === mockQuestions[currentQ].correct ? "text-emerald-700" : "text-red-700"}`}>
                    {selectedAnswer === mockQuestions[currentQ].correct ? "✓ Correct!" : "✗ Incorrect"}
                  </p>
                  <p className="text-sm text-slate-600">{mockQuestions[currentQ].explanation}</p>
                </motion.div>
              )}
            </div>

            <div className="flex justify-center mt-5">
              <button onClick={() => setView("setup")} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm font-semibold transition-colors">
                <RotateCcw className="w-4 h-4" /> Quit Quiz
              </button>
            </div>
          </motion.div>
        )}

        {/* Results */}
        {view === "result" && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto space-y-5">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 text-center">
              <div className="mb-6">
                <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                <h2 className="text-3xl font-extrabold text-slate-900 mb-1">Quiz Complete!</h2>
                <p className="text-slate-500">{selectedDoc}</p>
              </div>

              <div className="flex items-center justify-center gap-8 mb-8">
                <div>
                  <div className={`text-6xl font-extrabold ${gradeColors[grade]}`}>{grade}</div>
                  <p className="text-sm text-slate-400 font-medium">Grade</p>
                </div>
                <div>
                  <div className="text-6xl font-extrabold text-slate-900">{pct}%</div>
                  <p className="text-sm text-slate-400 font-medium">Score</p>
                </div>
                <div>
                  <div className="text-6xl font-extrabold text-blue-600">{score}/{mockQuestions.length}</div>
                  <p className="text-sm text-slate-400 font-medium">Correct</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: "Correct", value: score, color: "emerald" },
                  { label: "Incorrect", value: mockQuestions.length - score, color: "red" },
                  { label: "Difficulty", value: difficulty, color: "blue" },
                ].map((s) => (
                  <div key={s.label} className={`bg-${s.color}-50 p-3 rounded-2xl`}>
                    <p className={`text-xl font-extrabold text-${s.color}-600`}>{s.value}</p>
                    <p className="text-xs text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={handleStartQuiz} className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Retake Quiz
                </button>
                <button onClick={() => setView("review")} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                  <BookOpen className="w-4 h-4" /> Review Answers
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Review Answers */}
        {view === "review" && (
          <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-4">
            <button onClick={() => setView("result")} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-semibold">
              ← Back to Results
            </button>
            {mockQuestions.map((q, i) => {
              const userAnswer = answers[i] ?? null;
              const isCorrect = userAnswer === q.correct;
              return (
                <div key={i} className={`bg-white rounded-[2rem] border-2 shadow-sm p-6 ${isCorrect ? "border-emerald-100" : "border-red-100"}`}>
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? "bg-emerald-100" : "bg-red-100"}`}>
                      {isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 mb-1">Question {i + 1}</p>
                      <h3 className="font-bold text-slate-900">{q.question}</h3>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    {q.options.map((opt, j) => (
                      <div key={j} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${
                        j === q.correct ? "bg-emerald-50 text-emerald-700" : j === userAnswer && !isCorrect ? "bg-red-50 text-red-600" : "text-slate-500"
                      }`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-extrabold ${j === q.correct ? "border-emerald-500 bg-emerald-500 text-white" : j === userAnswer ? "border-red-400 bg-red-400 text-white" : "border-slate-200 text-slate-400"}`}>
                          {j === q.correct ? "✓" : j === userAnswer ? "✗" : String.fromCharCode(65 + j)}
                        </div>
                        {opt}
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600">
                    <span className="font-bold text-slate-700">Explanation: </span>{q.explanation}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* History */}
        {view === "history" && (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { label: "Total Quizzes", value: quizHistory.length, icon: Puzzle },
                { label: "Avg Score", value: `${Math.round(quizHistory.reduce((s, q) => s + q.score, 0) / quizHistory.length)}%`, icon: Target },
                { label: "Best Score", value: `${Math.max(...quizHistory.map(q => q.score))}%`, icon: Trophy },
              ].map((s, i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <s.icon className="w-6 h-6 text-blue-600 mb-2" />
                  <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
                  <p className="text-sm text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-3">
              {quizHistory.map((q) => (
                <div key={q.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-blue-50/30 transition-colors">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-lg ${q.score >= 80 ? "bg-emerald-100 text-emerald-600" : q.score >= 60 ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"}`}>
                    {q.score}%
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{q.topic}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span>{q.difficulty}</span><span>·</span><span>{q.time}</span><span>·</span><span>{q.date}</span>
                    </div>
                  </div>
                  <button onClick={() => setView("setup")} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Question Bank */}
        {view === "bank" && (
          <motion.div key="bank" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Question Bank</h2>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-sm font-bold rounded-xl">{questionBank.length} questions</span>
            </div>
            {questionBank.map((q) => (
              <div key={q.id} className="flex items-center gap-4 p-4 border border-slate-100 rounded-2xl hover:border-slate-200 hover:bg-slate-50 transition-colors">
                <div className={`px-2 py-1 rounded-lg text-xs font-bold ${q.difficulty === "Easy" ? "bg-emerald-50 text-emerald-600" : q.difficulty === "Intermediate" ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"}`}>
                  {q.difficulty}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 text-sm">{q.question}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{q.topic}</p>
                </div>
                <button onClick={() => toast.success("Added to quiz")} className="text-xs font-bold text-blue-600 hover:underline whitespace-nowrap">Add to Quiz</button>
              </div>
            ))}
          </motion.div>
        )}

        {/* Leaderboard */}
        {view === "leaderboard" && (
          <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
              <div className="text-center mb-6">
                <Trophy className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                <h2 className="text-xl font-extrabold text-slate-900">Leaderboard</h2>
                <p className="text-sm text-slate-500">Top performers this month</p>
              </div>
              <div className="space-y-3">
                {leaderboardData.map((entry) => {
                  const isMe = entry.name === "Alex Johnson";
                  return (
                    <div key={entry.rank} className={`flex items-center gap-4 p-4 rounded-2xl ${isMe ? "bg-blue-50 border-2 border-blue-200" : "border border-slate-100 hover:bg-slate-50"} transition-colors`}>
                      <div className="w-8 h-8 flex items-center justify-center">
                        {entry.badge ? <BadgeIcon badge={entry.badge} /> : <span className="text-sm font-bold text-slate-400">#{entry.rank}</span>}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-extrabold text-sm ${isMe ? "text-blue-700" : "text-slate-900"}`}>{entry.name}</p>
                          {isMe && <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">You</span>}
                        </div>
                        <p className="text-xs text-slate-400">{entry.quizzes} quizzes completed</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold text-slate-900">{entry.score.toLocaleString()}</p>
                        <p className="text-xs text-slate-400">points</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
