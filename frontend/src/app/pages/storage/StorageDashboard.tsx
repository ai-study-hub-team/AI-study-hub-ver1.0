import {
  AlertCircle,
  Bot,
  CheckCircle2,
  FileText,
  FolderTree,
  HardDrive,
  RefreshCw,
  Upload,
  Zap,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

import {
  userApi,
  type UserResponse,
} from "../../services/userApi";
import {
  subscriptionApi,
  type SubscriptionResponse,
} from "../../services/subscriptionApi";

type ApiError = {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
};

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = 1024 * 1024;
const BYTES_PER_GB = 1024 * 1024 * 1024;

const getErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  const apiError = error as ApiError;

  return (
    apiError.response?.data?.message ||
    apiError.response?.data?.error ||
    apiError.message ||
    fallbackMessage
  );
};

const toSafeNumber = (
  value: unknown,
): number => {
  const numberValue = Number(value);

  if (
    !Number.isFinite(numberValue) ||
    numberValue < 0
  ) {
    return 0;
  }

  return numberValue;
};

const calculatePercent = (
  used: number,
  total: number,
): number => {
  if (total <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round((used / total) * 100),
    ),
  );
};

const formatBytes = (
  bytes: number,
): string => {
  const safeBytes = toSafeNumber(bytes);

  if (safeBytes >= BYTES_PER_GB) {
    const value =
      safeBytes / BYTES_PER_GB;

    return `${value.toFixed(
      value >= 10 ? 1 : 2,
    )} GB`;
  }

  if (safeBytes >= BYTES_PER_MB) {
    const value =
      safeBytes / BYTES_PER_MB;

    return `${value.toFixed(
      value >= 10 ? 1 : 2,
    )} MB`;
  }

  if (safeBytes >= BYTES_PER_KB) {
    const value =
      safeBytes / BYTES_PER_KB;

    return `${value.toFixed(1)} KB`;
  }

  return `${Math.round(safeBytes)} B`;
};

const formatStorageLimit = (
  limitMb: number,
): string => {
  const safeLimitMb =
    toSafeNumber(limitMb);

  if (safeLimitMb >= 1024) {
    const limitGb =
      safeLimitMb / 1024;

    return `${Number.isInteger(limitGb)
      ? limitGb
      : limitGb.toFixed(1)} GB`;
  }

  return `${safeLimitMb.toLocaleString(
    "en-US",
  )} MB`;
};

const formatNumber = (
  value: number,
): string => {
  return Math.floor(
    toSafeNumber(value),
  ).toLocaleString("en-US");
};

const formatDate = (
  value?: string | null,
): string => {
  if (!value) {
    return "No expiration";
  }

  const normalizedValue = value.replace(
    /\.(\d{3})\d+/,
    ".$1",
  );

  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );
};

function UsageCircle({
  percent,
}: {
  percent: number;
}) {
  const safePercent = Math.min(
    100,
    Math.max(0, percent),
  );

  const chartData = [
    {
      value: safePercent,
    },
    {
      value: Math.max(
        0,
        100 - safePercent,
      ),
    },
  ];

  return (
    <div className="relative w-48 h-48">
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            strokeWidth={0}
          >
            <Cell fill="#2563EB" />
            <Cell fill="#E2E8F0" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
          {safePercent}%
        </span>

        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          used
        </span>
      </div>
    </div>
  );
}

function ProgressBar({
  percent,
}: {
  percent: number;
}) {
  const safePercent = Math.min(
    100,
    Math.max(0, percent),
  );

  return (
    <div className="w-full h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
      <div
        className="h-full rounded-full bg-blue-600 transition-all duration-500"
        style={{
          width: `${safePercent}%`,
        }}
      />
    </div>
  );
}

export function StorageDashboard() {
  const navigate = useNavigate();

  const [
    profile,
    setProfile,
  ] = useState<UserResponse | null>(null);

  const [
    subscription,
    setSubscription,
  ] =
    useState<SubscriptionResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [
    loadError,
    setLoadError,
  ] = useState("");

  const loadData = useCallback(
    async (
      showRefreshLoading = false,
    ): Promise<void> => {
      if (showRefreshLoading) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setLoadError("");

      try {
        /*
         * API 1:
         * GET /api/account/me
         *
         * Lấy:
         * - totalStorageUsedBytes
         * - documentCount
         * - categoryCount
         */
        const profileRequest =
          userApi.getProfile();

        /*
         * API 2:
         * GET /api/subscriptions/current
         *
         * Lấy:
         * - plan.code
         * - plan.storageLimitMb
         * - plan.dailyTokenLimit
         * - subscription status
         */
        const subscriptionRequest =
          subscriptionApi.getCurrentSubscription();

        const [
          profileResponse,
          subscriptionResponse,
        ] = await Promise.all([
          profileRequest,
          subscriptionRequest,
        ]);

        setProfile(
          profileResponse.data,
        );

        setSubscription(
          subscriptionResponse.data,
        );
      } catch (error) {
        console.error(
          "Load storage information failed:",
          error,
        );

        const errorMessage =
          getErrorMessage(
            error,
            "Cannot load storage information.",
          );

        setLoadError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const planCode =
    subscription?.plan?.code
      ?.trim()
      .toUpperCase() || "FREE";

  const isPro =
    planCode === "PRO";

  const planName =
    subscription?.plan?.name ||
    (isPro
      ? "Pro Plan"
      : "Free Plan");

  /*
   * Ưu tiên giới hạn backend trả về.
   *
   * Nếu database chưa có giá trị thì
   * mới dùng fallback:
   * FREE = 500 MB
   * PRO = 2 GB
   */
  const storageLimitMb = useMemo(() => {
    const apiLimit = toSafeNumber(
      subscription?.plan
        ?.storageLimitMb,
    );

    if (apiLimit > 0) {
      return apiLimit;
    }

    return isPro ? 2048 : 500;
  }, [
    subscription,
    isPro,
  ]);

  /*
   * Ưu tiên dailyTokenLimit từ API.
   *
   * Fallback:
   * FREE = 500 token/ngày
   * PRO = 3.000.000 token/ngày
   */
  const dailyTokenLimit =
    useMemo(() => {
      const apiLimit = toSafeNumber(
        subscription?.plan
          ?.dailyTokenLimit,
      );

      if (apiLimit > 0) {
        return apiLimit;
      }

      return isPro
        ? 3_000_000
        : 500;
    }, [
      subscription,
      isPro,
    ]);

  const usedStorageBytes =
    toSafeNumber(
      profile?.totalStorageUsedBytes,
    );

  const totalStorageBytes =
    storageLimitMb * BYTES_PER_MB;

  const remainingStorageBytes =
    Math.max(
      0,
      totalStorageBytes -
        usedStorageBytes,
    );

  const storagePercent =
    calculatePercent(
      usedStorageBytes,
      totalStorageBytes,
    );

  const documentCount =
    toSafeNumber(
      profile?.documentCount,
    );

  const categoryCount =
    toSafeNumber(
      profile?.categoryCount,
    );

  if (loading) {
    return (
      <div className="min-h-[420px] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading storage information...
        </div>
      </div>
    );
  }

  if (
    loadError &&
    !profile &&
    !subscription
  ) {
    return (
      <div className="max-w-3xl mx-auto mt-10">
        <div className="rounded-[2rem] border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500" />

          <h2 className="mt-4 text-xl font-extrabold text-red-700 dark:text-red-300">
            Cannot load storage information
          </h2>

          <p className="mt-2 text-sm text-red-600 dark:text-red-300">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadData()
            }
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Cloud Storage
          </h1>

          <p className="mt-1 text-slate-500 dark:text-slate-400">
            View your real storage usage
            and current plan limits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              void loadData(true)
            }
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-60"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                refreshing
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/app/upload")
            }
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
          >
            <Upload className="w-4 h-4" />
            Upload Files
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Storage quota */}
        <motion.section
          initial={{
            opacity: 0,
            y: 12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6 md:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <HardDrive className="w-5 h-5" />

                <span className="text-xs font-extrabold uppercase tracking-widest">
                  Storage quota
                </span>
              </div>

              <h2 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                {formatBytes(
                  usedStorageBytes,
                )}{" "}
                used
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Total limit:{" "}
                {formatStorageLimit(
                  storageLimitMb,
                )}
              </p>
            </div>

            <span
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold tracking-widest ${
                isPro
                  ? "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              {planCode}
            </span>
          </div>

          <div className="mt-7 flex flex-col sm:flex-row items-center gap-8">
            <UsageCircle
              percent={storagePercent}
            />

            <div className="flex-1 w-full space-y-5">
              <ProgressBar
                percent={storagePercent}
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-4">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Used
                  </p>

                  <p className="mt-1 font-extrabold text-slate-900 dark:text-white">
                    {formatBytes(
                      usedStorageBytes,
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 p-4">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                    Available
                  </p>

                  <p className="mt-1 font-extrabold text-emerald-700 dark:text-emerald-200">
                    {formatBytes(
                      remainingStorageBytes,
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Storage limit
                  </span>

                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {formatStorageLimit(
                      storageLimitMb,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* AI token limit */}
        <motion.section
          initial={{
            opacity: 0,
            y: 12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.05,
          }}
          className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6 md:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                <Bot className="w-5 h-5" />

                <span className="text-xs font-extrabold uppercase tracking-widest">
                  AI Chat
                </span>
              </div>

              <h2 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                Daily Token Limit
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Limit supplied by your
                current subscription API.
              </p>
            </div>

            <span
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold tracking-widest ${
                isPro
                  ? "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              {planCode}
            </span>
          </div>

          <div className="mt-8 rounded-[2rem] bg-gradient-to-br from-violet-600 to-indigo-700 p-7 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-white/70">
              Tokens per day
            </p>

            <p className="mt-2 text-4xl font-extrabold">
              {formatNumber(
                dailyTokenLimit,
              )}
            </p>

            <p className="mt-2 text-sm text-white/75">
              Available under the{" "}
              {planName}.
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />

              <div>
                <p className="text-sm font-extrabold text-amber-800 dark:text-amber-200">
                  Token usage is not
                  available
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-300">
                  Backend currently returns
                  the daily token limit, but
                  does not provide an API
                  for a normal user to view
                  tokens used today.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Used today
              </p>

              <p className="mt-1 font-extrabold text-slate-500 dark:text-slate-400">
                No API
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Remaining
              </p>

              <p className="mt-1 font-extrabold text-slate-500 dark:text-slate-400">
                No API
              </p>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Account information */}
      <section className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Account Usage
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Information returned by your
              profile and subscription APIs.
            </p>
          </div>

          <span
            className={`px-4 py-2 rounded-xl text-xs font-extrabold ${
              subscription?.status
                ?.toUpperCase() ===
              "ACTIVE"
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300"
            }`}
          >
            {subscription?.status ||
              "UNKNOWN"}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />

            <p className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">
              {formatNumber(
                documentCount,
              )}
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Documents
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <FolderTree className="w-5 h-5 text-violet-600 dark:text-violet-400" />

            <p className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">
              {formatNumber(
                categoryCount,
              )}
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Categories
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <HardDrive className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />

            <p className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">
              {formatStorageLimit(
                storageLimitMb,
              )}
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Storage limit
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <Bot className="w-5 h-5 text-amber-600 dark:text-amber-400" />

            <p className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">
              {formatNumber(
                dailyTokenLimit,
              )}
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              AI tokens/day
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
          <span>
            Plan:{" "}
            <strong className="text-slate-800 dark:text-slate-200">
              {planName}
            </strong>
          </span>

          <span>
            Started:{" "}
            <strong className="text-slate-800 dark:text-slate-200">
              {formatDate(
                subscription?.startDate,
              )}
            </strong>
          </span>

          <span>
            Expires:{" "}
            <strong className="text-slate-800 dark:text-slate-200">
              {formatDate(
                subscription?.endDate,
              )}
            </strong>
          </span>
        </div>
      </section>

      {!isPro && (
        <section className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2rem] p-7 md:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl shadow-blue-500/15">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/75">
              <Zap className="w-5 h-5" />
              Upgrade available
            </div>

            <h3 className="mt-2 text-2xl font-extrabold">
              Get more storage and AI
              tokens
            </h3>

            <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/85">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                2 GB storage
              </span>

              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                3,000,000 AI tokens/day
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/app/subscription",
              )
            }
            className="shrink-0 px-7 py-3.5 bg-white text-blue-700 font-extrabold rounded-2xl hover:bg-blue-50 transition shadow-lg"
          >
            View Pro Plan
          </button>
        </section>
      )}
    </div>
  );
}