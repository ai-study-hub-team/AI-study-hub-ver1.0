import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Database,
  FileText,
  RefreshCcw,
  ShieldAlert,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import {
  adminAnalyticsApi,
  type AdminActiveUserItem,
  type RevenueReportResponse,
  type StorageReportResponse,
} from "../../services/adminAnalyticsApi";
import {
  adminDocumentReportApi,
  type DocumentReportResponse,
} from "../../services/adminDocumentReportApi";

const formatBytes = (bytes = 0) => {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatMoney = (value = 0, currency = "VND") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

const formatDateTime = (value?: string | null) => {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function AdminDashboard() {
  const navigate = useNavigate();
  const [activeUsers, setActiveUsers] = useState<AdminActiveUserItem[]>([]);
  const [revenue, setRevenue] = useState<RevenueReportResponse | null>(null);
  const [storage, setStorage] = useState<StorageReportResponse | null>(null);
  const [pendingReports, setPendingReports] = useState<DocumentReportResponse[]>([]);
  const [pendingReportTotal, setPendingReportTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const [usersResponse, revenueResponse, storageResponse, reportsResponse] =
        await Promise.all([
          adminAnalyticsApi.getActiveUsers(),
          adminAnalyticsApi.getRevenue({ period: "WEEK" }),
          adminAnalyticsApi.getStorage(),
          adminDocumentReportApi.getReports({
            status: "PENDING",
            page: 0,
            size: 5,
          }),
        ]);

      setActiveUsers(usersResponse.data ?? []);
      setRevenue(revenueResponse.data);
      setStorage(storageResponse.data);
      setPendingReports(reportsResponse.data?.content ?? []);
      setPendingReportTotal(reportsResponse.data?.totalElements ?? 0);
    } catch (error) {
      console.error("Failed to load admin dashboard", error);
      toast.error("Unable to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const chartData = useMemo(
    () =>
      (revenue?.dailyRevenue ?? []).map((item) => ({
        date: new Date(`${item.date}T00:00:00`).toLocaleDateString("en-US", {
          weekday: "short",
        }),
        revenue: Number(item.totalRevenue ?? 0),
      })),
    [revenue],
  );

  const stats = [
    {
      label: "Active Users",
      value: activeUsers.length.toLocaleString("en-US"),
      helper: "Currently active accounts",
      icon: Users,
    },
    {
      label: "Stored Documents",
      value: (storage?.documentCount ?? 0).toLocaleString("en-US"),
      helper: `${storage?.userCount ?? 0} users with stored files`,
      icon: FileText,
    },
    {
      label: "Storage Used",
      value: formatBytes(storage?.totalStorageBytes ?? 0),
      helper: "Across all users",
      icon: Database,
    },
    {
      label: "Weekly Revenue",
      value: formatMoney(
        Number(revenue?.totalRevenue ?? 0),
        revenue?.currency ?? "VND",
      ),
      helper: `${revenue?.successfulTransactionCount ?? 0} successful payments`,
      icon: Activity,
    },
    {
      label: "Pending Reports",
      value: pendingReportTotal.toLocaleString("en-US"),
      helper: "Requires administrator review",
      icon: ShieldAlert,
    },
  ];

  const quickActions = [
    { label: "Manage Users", path: "/admin/users", icon: Users },
    { label: "Review Reports", path: "/admin/reports", icon: ShieldAlert },
    { label: "Manage Documents", path: "/admin/documents", icon: FileText },
    { label: "View Analytics", path: "/admin/analytics", icon: BarChart3 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Monitor users, content, storage, reports, and revenue.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <stat.icon className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {stat.label}
            </p>
            <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? "..." : stat.value}
            </h3>
            <p className="mt-2 text-xs text-slate-400">{stat.helper}</p>
          </motion.div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-700 dark:bg-slate-900 xl:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Weekly Revenue
              </h3>
              <p className="text-sm text-slate-500">
                Successful payment revenue by day
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/admin/analytics")}
              className="text-sm font-bold text-blue-600 hover:underline"
            >
              View analytics
            </button>
          </div>

          <div className="h-72">
            {chartData.length === 0 && !loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No revenue data available for this week.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) =>
                      formatMoney(Number(value), revenue?.currency ?? "VND")
                    }
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#2563eb"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Quick Actions
          </h3>
          <p className="mb-5 text-sm text-slate-500">Common administration tasks</p>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => navigate(action.path)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <action.icon className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Active Users
              </h3>
              <p className="text-sm text-slate-500">Latest active accounts</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/admin/users")}
              className="text-sm font-bold text-blue-600 hover:underline"
            >
              View all
            </button>
          </div>

          <div className="space-y-4">
            {activeUsers.slice(0, 6).map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 dark:border-slate-800"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900 dark:text-white">
                    {user.fullName || "Unnamed user"}
                  </p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  {user.status}
                </span>
              </div>
            ))}
            {!loading && activeUsers.length === 0 && (
              <p className="text-sm text-slate-500">No active users found.</p>
            )}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Reports Requiring Review
              </h3>
              <p className="text-sm text-slate-500">Newest pending document reports</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/admin/reports")}
              className="text-sm font-bold text-blue-600 hover:underline"
            >
              Review all
            </button>
          </div>

          <div className="space-y-4">
            {pendingReports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => navigate("/admin/reports")}
                className="flex w-full items-start gap-3 border-b border-slate-100 pb-4 text-left last:border-0 dark:border-slate-800"
              >
                <div className="mt-0.5 rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900 dark:text-white">
                    {report.documentTitle || "Untitled document"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {report.reason.replace(/_/g, " ")} • {formatDateTime(report.createdAt)}
                  </p>
                </div>
              </button>
            ))}
            {!loading && pendingReports.length === 0 && (
              <p className="text-sm text-slate-500">No pending reports.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
