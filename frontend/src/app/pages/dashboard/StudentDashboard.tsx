import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Clock,
  Sparkles,
  ArrowUpRight,
  MoreHorizontal,
  ChevronRight,
  Plus,
  BrainCircuit,
  Puzzle,
  FileSearch,
  MessageSquare,
} from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import axios from "axios";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

const API_BASE_URL = "http://localhost:8080/api";

const data = [
  { name: "Mon", hours: 0 },
  { name: "Tue", hours: 0 },
  { name: "Wed", hours: 0 },
  { name: "Thu", hours: 0 },
  { name: "Fri", hours: 0 },
  { name: "Sat", hours: 0 },
  { name: "Sun", hours: 0 },
];

type DocumentItem = {
  id?: number;
  title?: string;
  originalName?: string;
  fileName?: string;
  fileType?: string;
  createdAt?: string;
  fileSize?: number;
};

type ChatSession = {
  id?: number;
};

const statStyles = {
  blue: "bg-blue-50 text-blue-600",
  purple: "bg-purple-50 text-purple-600",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600",
};

export function StudentDashboard() {
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);

        const userId = 1;

        const documentsResponse = await axios.get(`${API_BASE_URL}/documents`, {
          params: { userId },
        });

        const documentsData = documentsResponse.data;

        if (Array.isArray(documentsData)) {
          setDocuments(documentsData);
          setTotalDocuments(documentsData.length);
        } else if (Array.isArray(documentsData?.data)) {
          setDocuments(documentsData.data);
          setTotalDocuments(documentsData.data.length);
        } else if (Array.isArray(documentsData?.content)) {
          setDocuments(documentsData.content);
          setTotalDocuments(
            documentsData.totalElements ?? documentsData.content.length,
          );
        } else {
          setDocuments([]);
          setTotalDocuments(0);
        }
      } catch (error) {
        console.error("Failed to load dashboard data", error);
        setDocuments([]);
        setChatSessions([]);
        setTotalDocuments(0);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const stats = [
    {
      label: "Total Documents",
      value: String(totalDocuments),
      icon: FileText,
      color: "blue" as const,
    },
    {
      label: "AI Summaries",
      value: "0",
      icon: FileSearch,
      color: "purple" as const,
    },
    {
      label: "Quizzes Taken",
      value: "0",
      icon: Puzzle,
      color: "amber" as const,
    },
    {
      label: "Study Streak",
      value: "0 Days",
      icon: Clock,
      color: "emerald" as const,
    },
  ];

  const recentDocs = useMemo(() => {
    return documents.slice(0, 4).map((doc) => ({
      id: doc.id,
      name:
        doc.title || doc.originalName || doc.fileName || "Untitled Document",
      date: doc.createdAt
        ? new Date(doc.createdAt).toLocaleDateString()
        : "Unknown date",
      size: doc.fileSize
        ? `${(doc.fileSize / 1024 / 1024).toFixed(1)} MB`
        : "Unknown size",
      type: doc.fileType || "FILE",
    }));
  }, [documents]);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden bg-blue-600 rounded-[2rem] p-8 md:p-12 text-white">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4">
            Good morning, Alex! 👋
          </h1>

          <p className="text-blue-100 text-lg mb-8 leading-relaxed">
            You have {totalDocuments} documents and {chatSessions.length} chat
            sessions.
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate("/app/upload")}
              className="px-6 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Upload Document
            </button>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-1/3 h-full hidden lg:flex items-center justify-center opacity-20">
          <Sparkles className="w-48 h-48 rotate-12" />
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <div
              className={`w-12 h-12 rounded-xl ${statStyles[stat.color]} flex items-center justify-center mb-4`}
            >
              <stat.icon className="w-6 h-6" />
            </div>

            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
              {stat.label}
            </p>

            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {loading ? "..." : stat.value}
            </h3>
          </motion.div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Study Activity
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Hours spent studying this week
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="#2563EB"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorHours)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Quick Actions
          </h3>

          <div className="space-y-4">
            <button
              onClick={() => navigate("/app/summary")}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 transition-all group"
            >
              <BrainCircuit className="w-5 h-5 text-blue-600" />
              <div className="text-left">
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  Summarize PDF
                </p>
                <p className="text-xs text-slate-500">
                  Get key points instantly
                </p>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto text-slate-400" />
            </button>

            <button
              onClick={() => navigate("/app/quiz")}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 transition-all group"
            >
              <Puzzle className="w-5 h-5 text-purple-600" />
              <div className="text-left">
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  Create Quiz
                </p>
                <p className="text-xs text-slate-500">Test your knowledge</p>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto text-slate-400" />
            </button>

            <button
              onClick={() => navigate("/app/chat")}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 transition-all group"
            >
              <MessageSquare className="w-5 h-5 text-amber-600" />
              <div className="text-left">
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  Ask AI Hub
                </p>
                <p className="text-xs text-slate-500">Get help with subjects</p>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto text-slate-400" />
            </button>
          </div>
        </section>
      </div>

      <section className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Recent Documents
          </h3>

          <button
            onClick={() => navigate("/app/documents")}
            className="text-blue-600 font-bold flex items-center gap-1 hover:underline"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {recentDocs.length === 0 ? (
          <p className="text-slate-500">No documents found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentDocs.map((doc) => (
              <div
                key={doc.id ?? doc.name}
                className="group p-5 bg-slate-50 rounded-2xl border border-transparent hover:border-blue-200 hover:bg-white dark:bg-slate-900 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl shadow-sm flex items-center justify-center">
                    <FileText className="w-6 h-6 text-slate-400" />
                  </div>

                  <button className="text-slate-400 hover:text-slate-600">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate mb-1">
                  {doc.name}
                </h4>

                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  {doc.date} • {doc.size}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    {doc.type}
                  </span>

                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
