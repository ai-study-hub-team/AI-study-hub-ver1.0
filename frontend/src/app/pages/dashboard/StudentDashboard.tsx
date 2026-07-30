import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  ChevronRight,
  Clock,
  FileSearch,
  FileText,
  HardDrive,
  MessageSquare,
  Plus,
  Puzzle,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { getQuizzesApi, getSummariesApi } from "../../services/aiApi";
import { apiClient, getCurrentUserId } from "../../services/apiClient";
import { subscriptionApi, type SubscriptionResponse } from "../../services/subscriptionApi";
import { userApi, type UserResponse } from "../../services/userApi";
import { filterMyDocuments } from "../../utils/documentOwnership";

type DocumentItem = {
  id?: number;
  userId?: number;
  ownerId?: number;
  user?: { id?: number };
  title?: string;
  originalName?: string;
  fileName?: string;
  fileType?: string;
  createdAt?: string;
  updatedAt?: string;
  fileSize?: number;
  processStatus?: string;
};

type ChatSession = { id?: number; createdAt?: string };

type ListPayload<T> = T[] | { data?: T[]; content?: T[] };

const normalizeList = <T,>(payload: ListPayload<T> | null | undefined): T[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
};

const getFirstName = (fullName?: string | null) => {
  const firstName = fullName?.trim().split(/\s+/)[0];
  return firstName || "User";
};

const getDocumentTypeLabel = (fileType?: string) => {
  if (!fileType) return "FILE";
  const value = fileType.toLowerCase();
  if (value.includes("pdf")) return "PDF";
  if (value.includes("word") || value.includes("document")) return "DOCX";
  if (value.includes("presentation") || value.includes("powerpoint")) return "PPTX";
  if (value.includes("sheet") || value.includes("excel")) return "XLSX";
  if (value.includes("image")) return "IMAGE";
  if (value.includes("video")) return "VIDEO";
  if (value.includes("audio")) return "AUDIO";
  return "FILE";
};

const formatBytes = (bytes = 0) => {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const statStyles = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
  purple: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
};

export function StudentDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [summaryCount, setSummaryCount] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      const userId = getCurrentUserId();
      if (!userId) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);

        const [profileResult, subscriptionResult, documentsResult] = await Promise.allSettled([
          userApi.getProfile(),
          subscriptionApi.getCurrentSubscription(),
          apiClient.get<ListPayload<DocumentItem>>("/api/documents/search-filter", {
            params: { page: 0, size: 100 },
          }),
        ]);

        if (profileResult.status === "fulfilled") setProfile(profileResult.value.data);
        if (subscriptionResult.status === "fulfilled") setSubscription(subscriptionResult.value.data);

        if (documentsResult.status === "fulfilled") {
          const allDocuments = normalizeList(documentsResult.value.data);
          setDocuments(filterMyDocuments(allDocuments, userId));
        }

        const [summariesResult, quizzesResult, chatsResult] = await Promise.allSettled([
          getSummariesApi(userId),
          getQuizzesApi(userId),
          apiClient.get<ListPayload<ChatSession>>("/api/chat/sessions", { params: { userId } }),
        ]);

        if (summariesResult.status === "fulfilled") {
          setSummaryCount(normalizeList(summariesResult.value.data).length);
        }
        if (quizzesResult.status === "fulfilled") {
          setQuizCount(normalizeList(quizzesResult.value.data).length);
        }
        if (chatsResult.status === "fulfilled") {
          setChatSessions(normalizeList(chatsResult.value.data));
        }
      } catch (error) {
        console.error("Failed to load user dashboard", error);
        toast.error("Unable to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    void loadDashboardData();
  }, [navigate]);

  const recentDocs = useMemo(
    () =>
      [...documents]
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt || 0).getTime() -
            new Date(a.updatedAt || a.createdAt || 0).getTime(),
        )
        .slice(0, 4),
    [documents],
  );

  const weeklyActivity = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      const uploads = documents.filter((doc) => doc.createdAt?.slice(0, 10) === key).length;
      return {
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        uploads,
      };
    });
  }, [documents]);

  const storageUsed = profile?.totalStorageUsedBytes ?? 0;
  const storageLimitMb = subscription?.plan?.storageLimitMb ?? 0;
  const storageLimitBytes = storageLimitMb * 1024 * 1024;
  const storagePercent = storageLimitBytes > 0
    ? Math.min(100, Math.round((storageUsed / storageLimitBytes) * 100))
    : 0;

  const stats = [
    { label: "Total Documents", value: documents.length, icon: FileText, color: "blue" as const, path: "/app/library" },
    { label: "AI Summaries", value: summaryCount, icon: FileSearch, color: "purple" as const, path: "/app/summary" },
    { label: "Quizzes Created", value: quizCount, icon: Puzzle, color: "amber" as const, path: "/app/quiz" },
    { label: "AI Chat Sessions", value: chatSessions.length, icon: MessageSquare, color: "emerald" as const, path: "/app/chat" },
  ];

  const quickActions = [
    { label: "Upload Document", description: "Add a new study file", icon: Upload, path: "/app/upload" },
    { label: "Generate Summary", description: "Create key study notes", icon: BrainCircuit, path: "/app/summary" },
    { label: "Create Quiz", description: "Test your knowledge", icon: Puzzle, path: "/app/quiz" },
    { label: "Ask AI Study Hub", description: "Start a study conversation", icon: MessageSquare, path: "/app/chat" },
  ];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-blue-600 p-8 text-white md:p-12">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-blue-200">
            {subscription?.plan?.name || "Free Plan"}
          </p>
          <h1 className="mb-4 text-3xl font-extrabold md:text-4xl">
            Welcome back, {getFirstName(profile?.fullName)}! 👋
          </h1>
          <p className="mb-8 text-lg leading-relaxed text-blue-100">
            Continue learning from your recent documents or start a new AI-powered study session.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate("/app/upload")}
              className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-blue-600 transition hover:bg-blue-50"
            >
              <Plus className="h-5 w-5" /> Upload Document
            </button>
            <button
              onClick={() => navigate("/app/library")}
              className="flex items-center gap-2 rounded-xl border border-blue-300 bg-blue-500/30 px-6 py-3 font-bold text-white transition hover:bg-blue-500/50"
            >
              <BookOpen className="h-5 w-5" /> Open Library
            </button>
          </div>
        </div>
        <Sparkles className="absolute -right-8 -top-8 hidden h-64 w-64 rotate-12 text-white opacity-15 lg:block" />
      </section>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.button
            type="button"
            key={stat.label}
            onClick={() => navigate(stat.path)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            whileHover={{ y: -3 }}
            className="group relative rounded-2xl border border-slate-100 bg-white p-6 text-left shadow-sm transition-colors hover:border-blue-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
          >
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${statStyles[stat.color]}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <p className="mb-1 text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {loading ? "..." : stat.value.toLocaleString("en-US")}
            </h3>
            <ArrowUpRight className="absolute right-5 top-5 h-4 w-4 text-slate-300 transition-colors group-hover:text-blue-600" />
          </motion.button>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Weekly Upload Activity</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Documents uploaded during the last seven days</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyActivity}>
                <defs>
                  <linearGradient id="uploadActivity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="uploads" stroke="#2563EB" strokeWidth={3} fill="url(#uploadActivity)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Plan & Storage</h3>
          <p className="mb-6 text-sm text-slate-500">Your current subscription usage</p>

          <div className="mb-6 rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/60">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <Zap className="h-5 w-5 text-amber-500" />
                {subscription?.plan?.name || "Free Plan"}
              </div>
              <button onClick={() => navigate("/app/subscription")} className="text-xs font-bold text-blue-600 hover:underline">
                Upgrade
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Daily token limit: {(subscription?.plan?.dailyTokenLimit ?? 0).toLocaleString("en-US")}
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                <HardDrive className="h-4 w-4" /> Storage
              </span>
              <span className="text-slate-500">
                {formatBytes(storageUsed)} / {storageLimitMb > 0 ? `${storageLimitMb} MB` : "No limit data"}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${storagePercent}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">{storagePercent}% used</p>
          </div>
        </section>
      </div>

      <section className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Quick Actions</h3>
            <p className="text-sm text-slate-500">Start your next study task</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="group flex items-start gap-4 rounded-2xl border border-slate-200 p-5 text-left transition hover:border-blue-200 hover:bg-blue-50/50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <action.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{action.label}</p>
                <p className="mt-1 text-xs text-slate-500">{action.description}</p>
              </div>
              <ChevronRight className="ml-auto mt-1 h-4 w-4 text-slate-400 group-hover:text-blue-600" />
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Continue Learning</h3>
            <p className="text-sm text-slate-500">Your most recently updated documents</p>
          </div>
          <button onClick={() => navigate("/app/library")} className="flex items-center gap-1 font-bold text-blue-600 hover:underline">
            View All <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {recentDocs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
            <FileText className="mx-auto mb-3 h-10 w-10 text-slate-400" />
            <p className="font-semibold text-slate-700 dark:text-slate-200">No documents yet</p>
            <p className="mb-4 text-sm text-slate-500">Upload your first document to begin studying.</p>
            <button onClick={() => navigate("/app/upload")} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700">
              Upload Document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {recentDocs.map((doc) => (
              <button
                key={doc.id ?? doc.title}
                onClick={() => doc.id && navigate(`/app/library/${doc.id}/preview`)}
                className="group rounded-2xl border border-transparent bg-slate-50 p-5 text-left transition hover:border-blue-200 hover:bg-white hover:shadow-sm dark:bg-slate-800/50 dark:hover:bg-slate-800"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-900">
                    <FileText className="h-6 w-6 text-blue-500" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-blue-500" />
                </div>
                <h4 className="mb-1 truncate font-bold text-slate-900 dark:text-slate-100">
                  {doc.title || doc.originalName || doc.fileName || "Untitled Document"}
                </h4>
                <p className="mb-4 text-xs text-slate-500">
                  {doc.updatedAt || doc.createdAt
                    ? new Date(doc.updatedAt || doc.createdAt || "").toLocaleDateString("en-US")
                    : "Unknown date"}
                </p>
                <div className="flex items-center justify-between">
                  <span className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                    {getDocumentTypeLabel(doc.fileType)}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                    <Clock className="h-3 w-3" /> {doc.processStatus || "READY"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
