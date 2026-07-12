import {
  AlertCircle,
  Bot,
  CalendarDays,
  CheckCircle2,
  Coins,
  FileText,
  HardDrive,
  RefreshCw,
  Search,
  WalletCards,
} from "lucide-react";
import { motion } from "motion/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import {
  adminAnalyticsApi,
  type BackendReportPeriod,
  type RevenueReportParams,
  type RevenueReportResponse,
  type StorageReportResponse,
  type TokenUsageReportParams,
  type TokenUsageReportResponse,
} from "../../services/adminAnalyticsApi";
import {
  userApi,
  type UserResponse,
} from "../../services/userApi";

type UiReportPeriod =
  | "DAY"
  | "WEEK"
  | "MONTH"
  | "LAST_7_DAYS"
  | "LAST_30_DAYS"
  | "CUSTOM";

type ApiError = {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
};

const DATE_INPUT_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;

const PERIOD_OPTIONS: Array<{
  value: UiReportPeriod;
  label: string;
}> = [
  {
    value: "DAY",
    label: "1 ngày",
  },
  {
    value: "WEEK",
    label: "Theo tuần",
  },
  {
    value: "MONTH",
    label: "Theo tháng",
  },
  {
    value: "LAST_7_DAYS",
    label: "7 ngày gần nhất",
  },
  {
    value: "LAST_30_DAYS",
    label: "30 ngày gần nhất",
  },
  {
    value: "CUSTOM",
    label: "Tùy chọn",
  },
];

const todayInputValue = (): string => {
  const date = new Date();

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const isValidDateInput = (
  value: string,
): boolean => {
  if (
    !value ||
    !DATE_INPUT_PATTERN.test(value)
  ) {
    return false;
  }

  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0,
  );

  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

const shiftDate = (
  value: string,
  days: number,
): string => {
  if (!isValidDateInput(value)) {
    return "";
  }

  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  /*
   * Dùng 12 giờ trưa để tránh lỗi lệch ngày
   * khi máy có timezone khác nhau.
   */
  const date = new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0,
  );

  date.setDate(
    date.getDate() + days,
  );

  const shiftedYear =
    date.getFullYear();

  const shiftedMonth = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const shiftedDay = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
};

const getErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  const apiError =
    error as ApiError;

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
  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue,
  )
    ? Math.max(0, numberValue)
    : 0;
};

const formatNumber = (
  value: unknown,
): string => {
  return Math.floor(
    toSafeNumber(value),
  ).toLocaleString("vi-VN");
};

const formatCurrency = (
  value: unknown,
  currency = "VND",
): string => {
  const amount =
    toSafeNumber(value);

  try {
    return new Intl.NumberFormat(
      "vi-VN",
      {
        style: "currency",
        currency:
          currency || "VND",
        maximumFractionDigits: 0,
      },
    ).format(amount);
  } catch {
    return `${formatNumber(
      amount,
    )} ${currency || "VND"}`;
  }
};

const formatBytes = (
  value: unknown,
): string => {
  const bytes =
    toSafeNumber(value);

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB",
  ];

  if (bytes === 0) {
    return "0 B";
  }

  const unitIndex = Math.min(
    Math.floor(
      Math.log(bytes) /
        Math.log(1024),
    ),
    units.length - 1,
  );

  const converted =
    bytes / 1024 ** unitIndex;

  return `${converted.toFixed(
    converted >= 10 ||
      unitIndex === 0
      ? 1
      : 2,
  )} ${units[unitIndex]}`;
};

const formatDate = (
  value?: string | null,
): string => {
  if (!value) {
    return "—";
  }

  const normalized =
    value.slice(0, 10);

  if (
    !isValidDateInput(normalized)
  ) {
    return value;
  }

  const [
    year,
    month,
    day,
  ] = normalized
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0,
  );

  return date.toLocaleDateString(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );
};

const formatChartDate = (
  value: string,
): string => {
  if (!isValidDateInput(value)) {
    return value;
  }

  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0,
  );

  return date.toLocaleDateString(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
    },
  );
};

const buildDateParams = (
  period: UiReportPeriod,
  selectedDate: string,
  customFromDate: string,
  customToDate: string,
): {
  period: BackendReportPeriod;
  date?: string;
  fromDate?: string;
  toDate?: string;
} => {
  const referenceDate =
    isValidDateInput(
      selectedDate,
    )
      ? selectedDate
      : todayInputValue();

  if (
    period === "LAST_7_DAYS"
  ) {
    return {
      period: "CUSTOM",
      fromDate: shiftDate(
        referenceDate,
        -6,
      ),
      toDate: referenceDate,
    };
  }

  if (
    period === "LAST_30_DAYS"
  ) {
    return {
      period: "CUSTOM",
      fromDate: shiftDate(
        referenceDate,
        -29,
      ),
      toDate: referenceDate,
    };
  }

  if (period === "CUSTOM") {
    return {
      period: "CUSTOM",
      fromDate:
        customFromDate,
      toDate: customToDate,
    };
  }

  return {
    period,
    date: referenceDate,
  };
};

const validateDateRange = (
  period: UiReportPeriod,
  selectedDate: string,
  fromDate: string,
  toDate: string,
): string | null => {
  if (period !== "CUSTOM") {
    if (
      !isValidDateInput(
        selectedDate,
      )
    ) {
      return "Vui lòng chọn ngày tham chiếu hoặc ngày kết thúc.";
    }

    return null;
  }

  if (
    !fromDate ||
    !toDate
  ) {
    return "Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.";
  }

  if (
    !isValidDateInput(
      fromDate,
    ) ||
    !isValidDateInput(toDate)
  ) {
    return "Ngày không hợp lệ. Định dạng đúng là YYYY-MM-DD.";
  }

  if (fromDate > toDate) {
    return "Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.";
  }

  return null;
};

function LoadingBlock({
  label,
}: {
  label: string;
}) {
  return (
    <div className="min-h-64 flex items-center justify-center">
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin" />

        {label}
      </div>
    </div>
  );
}

function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="min-h-64 flex flex-col items-center justify-center text-center px-6">
      <AlertCircle className="w-10 h-10 text-red-500" />

      <p className="mt-3 text-sm font-semibold text-red-600 dark:text-red-300">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
      >
        <RefreshCw className="w-4 h-4" />

        Thử lại
      </button>
    </div>
  );
}

function PeriodFilters({
  period,
  setPeriod,
  selectedDate,
  setSelectedDate,
  customFromDate,
  setCustomFromDate,
  customToDate,
  setCustomToDate,
  loading,
  onRefresh,
}: {
  period: UiReportPeriod;
  setPeriod: (
    value: UiReportPeriod,
  ) => void;
  selectedDate: string;
  setSelectedDate: (
    value: string,
  ) => void;
  customFromDate: string;
  setCustomFromDate: (
    value: string,
  ) => void;
  customToDate: string;
  setCustomToDate: (
    value: string,
  ) => void;
  loading: boolean;
  onRefresh: () => void;
}) {
  const selectedDateLabel =
    period ===
      "LAST_7_DAYS" ||
    period ===
      "LAST_30_DAYS"
      ? "Ngày kết thúc"
      : "Ngày tham chiếu";

  const handlePeriodChange = (
    nextPeriod: UiReportPeriod,
  ): void => {
    setPeriod(nextPeriod);

    const today =
      todayInputValue();

    if (
      nextPeriod !== "CUSTOM" &&
      !isValidDateInput(
        selectedDate,
      )
    ) {
      setSelectedDate(today);
    }

    if (
      nextPeriod === "CUSTOM"
    ) {
      const validToDate =
        isValidDateInput(
          customToDate,
        )
          ? customToDate
          : today;

      if (
        !isValidDateInput(
          customToDate,
        )
      ) {
        setCustomToDate(today);
      }

      if (
        !isValidDateInput(
          customFromDate,
        )
      ) {
        setCustomFromDate(
          shiftDate(
            validToDate,
            -29,
          ),
        );
      }
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="space-y-1.5">
        <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Khoảng thời gian
        </span>

        <select
          value={period}
          onChange={(event) =>
            handlePeriodChange(
              event.target
                .value as UiReportPeriod,
            )
          }
          className="h-10 min-w-40 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
        >
          {PERIOD_OPTIONS.map(
            (option) => (
              <option
                key={
                  option.value
                }
                value={
                  option.value
                }
              >
                {option.label}
              </option>
            ),
          )}
        </select>
      </label>

      {period !== "CUSTOM" ? (
        <label className="space-y-1.5">
          <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {selectedDateLabel}
          </span>

          <input
            type="date"
            value={selectedDate}
            onChange={(event) =>
              setSelectedDate(
                event.target.value,
              )
            }
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          />
        </label>
      ) : (
        <>
          <label className="space-y-1.5">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Từ ngày
            </span>

            <input
              type="date"
              value={
                customFromDate
              }
              onChange={(event) =>
                setCustomFromDate(
                  event.target
                    .value,
                )
              }
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Đến ngày
            </span>

            <input
              type="date"
              value={customToDate}
              onChange={(event) =>
                setCustomToDate(
                  event.target
                    .value,
                )
              }
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            />
          </label>
        </>
      )}

      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw
          className={`w-4 h-4 ${
            loading
              ? "animate-spin"
              : ""
          }`}
        />

        Xem báo cáo
      </button>
    </div>
  );
}

function UserFilter({
  users,
  value,
  onChange,
  label,
}: {
  users: UserResponse[];
  value: string;
  onChange: (
    value: string,
  ) => void;
  label: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="h-10 min-w-64 max-w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
      >
        <option value="">
          Tất cả người dùng
        </option>

        {users.map((user) => (
          <option
            key={user.id}
            value={String(
              user.id,
            )}
          >
            ID {user.id} -{" "}
            {user.fullName ||
              user.email}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AnalyticsDashboard() {
  const today = useMemo(
    () => todayInputValue(),
    [],
  );

  const defaultFromDate =
    useMemo(
      () =>
        shiftDate(
          today,
          -29,
        ),
      [today],
    );

  const [
    users,
    setUsers,
  ] = useState<
    UserResponse[]
  >([]);

  const [
    userSearch,
    setUserSearch,
  ] = useState("");

  const [
    revenue,
    setRevenue,
  ] =
    useState<RevenueReportResponse | null>(
      null,
    );

  const [
    revenuePeriod,
    setRevenuePeriod,
  ] =
    useState<UiReportPeriod>(
      "LAST_30_DAYS",
    );

  const [
    revenueDate,
    setRevenueDate,
  ] = useState(today);

  const [
    revenueFromDate,
    setRevenueFromDate,
  ] =
    useState(defaultFromDate);

  const [
    revenueToDate,
    setRevenueToDate,
  ] = useState(today);

  const [
    revenueLoading,
    setRevenueLoading,
  ] = useState(true);

  const [
    revenueError,
    setRevenueError,
  ] = useState("");

  const [
    storage,
    setStorage,
  ] =
    useState<StorageReportResponse | null>(
      null,
    );

  const [
    storageUserId,
    setStorageUserId,
  ] = useState("");

  const [
    storageLoading,
    setStorageLoading,
  ] = useState(true);

  const [
    storageError,
    setStorageError,
  ] = useState("");

  const [
    tokenUsage,
    setTokenUsage,
  ] =
    useState<TokenUsageReportResponse | null>(
      null,
    );

  const [
    tokenUserId,
    setTokenUserId,
  ] = useState("");

  const [
    tokenPeriod,
    setTokenPeriod,
  ] =
    useState<UiReportPeriod>(
      "LAST_30_DAYS",
    );

  const [
    tokenDate,
    setTokenDate,
  ] = useState(today);

  const [
    tokenFromDate,
    setTokenFromDate,
  ] =
    useState(defaultFromDate);

  const [
    tokenToDate,
    setTokenToDate,
  ] = useState(today);

  const [
    tokenLoading,
    setTokenLoading,
  ] = useState(true);

  const [
    tokenError,
    setTokenError,
  ] = useState("");

  const loadUsers =
    useCallback(
      async (): Promise<void> => {
        try {
          const response =
            await userApi.getUsers();

          const rawUsers =
            response.data;

          const userList =
            Array.isArray(rawUsers)
              ? rawUsers
              : [];

          const sortedUsers = [
            ...userList,
          ].sort(
            (firstUser, secondUser) =>
              firstUser.id -
              secondUser.id,
          );

          setUsers(sortedUsers);
        } catch (error) {
          console.error(
            "Load users failed:",
            error,
          );

          toast.error(
            getErrorMessage(
              error,
              "Không thể tải danh sách người dùng.",
            ),
          );
        }
      },
      [],
    );

  const loadRevenue =
    useCallback(
      async (): Promise<void> => {
        const validationMessage =
          validateDateRange(
            revenuePeriod,
            revenueDate,
            revenueFromDate,
            revenueToDate,
          );

        if (
          validationMessage
        ) {
          setRevenueError(
            validationMessage,
          );

          toast.error(
            validationMessage,
          );

          return;
        }

        setRevenueLoading(true);
        setRevenueError("");

        try {
          const params =
            buildDateParams(
              revenuePeriod,
              revenueDate,
              revenueFromDate,
              revenueToDate,
            ) as RevenueReportParams;

          const response =
            await adminAnalyticsApi.getRevenue(
              params,
            );

          setRevenue(
            response.data,
          );
        } catch (error) {
          console.error(
            "Load revenue report failed:",
            error,
          );

          const message =
            getErrorMessage(
              error,
              "Không thể tải báo cáo doanh thu.",
            );

          setRevenueError(
            message,
          );

          toast.error(message);
        } finally {
          setRevenueLoading(
            false,
          );
        }
      },
      [
        revenueDate,
        revenueFromDate,
        revenuePeriod,
        revenueToDate,
      ],
    );

  const loadStorage =
    useCallback(
      async (): Promise<void> => {
        setStorageLoading(true);
        setStorageError("");

        try {
          const userId =
            storageUserId
              ? Number(
                  storageUserId,
                )
              : undefined;

          if (
            userId !== undefined &&
            (!Number.isInteger(
              userId,
            ) ||
              userId <= 0)
          ) {
            throw new Error(
              "User ID không hợp lệ.",
            );
          }

          const response =
            await adminAnalyticsApi.getStorage(
              userId,
            );

          setStorage(
            response.data,
          );
        } catch (error) {
          console.error(
            "Load storage report failed:",
            error,
          );

          const message =
            getErrorMessage(
              error,
              "Không thể tải báo cáo dung lượng.",
            );

          setStorageError(
            message,
          );

          toast.error(message);
        } finally {
          setStorageLoading(
            false,
          );
        }
      },
      [storageUserId],
    );

  const loadTokenUsage =
    useCallback(
      async (): Promise<void> => {
        const validationMessage =
          validateDateRange(
            tokenPeriod,
            tokenDate,
            tokenFromDate,
            tokenToDate,
          );

        if (
          validationMessage
        ) {
          setTokenError(
            validationMessage,
          );

          toast.error(
            validationMessage,
          );

          return;
        }

        setTokenLoading(true);
        setTokenError("");

        try {
          const dateParams =
            buildDateParams(
              tokenPeriod,
              tokenDate,
              tokenFromDate,
              tokenToDate,
            );

          const parsedUserId =
            tokenUserId
              ? Number(
                  tokenUserId,
                )
              : undefined;

          if (
            parsedUserId !==
              undefined &&
            (!Number.isInteger(
              parsedUserId,
            ) ||
              parsedUserId <= 0)
          ) {
            throw new Error(
              "User ID không hợp lệ.",
            );
          }

          const params:
            TokenUsageReportParams =
            {
              ...dateParams,
              ...(parsedUserId !==
              undefined
                ? {
                    userId:
                      parsedUserId,
                  }
                : {}),
            };

          const response =
            await adminAnalyticsApi.getTokenUsage(
              params,
            );

          setTokenUsage(
            response.data,
          );
        } catch (error) {
          console.error(
            "Load token report failed:",
            error,
          );

          const message =
            getErrorMessage(
              error,
              "Không thể tải báo cáo token.",
            );

          setTokenError(
            message,
          );

          toast.error(message);
        } finally {
          setTokenLoading(
            false,
          );
        }
      },
      [
        tokenDate,
        tokenFromDate,
        tokenPeriod,
        tokenToDate,
        tokenUserId,
      ],
    );

  useEffect(() => {
    void loadUsers();
    void loadRevenue();
    void loadStorage();
    void loadTokenUsage();

    /*
     * Chỉ tải bộ báo cáo mặc định
     * một lần khi mở trang.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredStorageUsers =
    useMemo(() => {
      const reportUsers =
        storage?.users || [];

      const keyword =
        userSearch
          .trim()
          .toLowerCase();

      if (!keyword) {
        return reportUsers;
      }

      return reportUsers.filter(
        (user) =>
          [
            String(
              user.userId,
            ),
            user.fullName || "",
            user.email || "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(keyword),
      );
    }, [
      storage?.users,
      userSearch,
    ]);

  const storageChartData =
    useMemo(
      () =>
        [
          ...(storage?.users ||
            []),
        ]
          .sort(
            (
              firstUser,
              secondUser,
            ) =>
              secondUser.totalStorageBytes -
              firstUser.totalStorageBytes,
          )
          .slice(0, 10)
          .map((user) => ({
            name:
              user.fullName ||
              `User ${user.userId}`,
            storageMb: Number(
              (
                toSafeNumber(
                  user.totalStorageBytes,
                ) /
                1024 ** 2
              ).toFixed(2),
            ),
          })),
      [storage?.users],
    );

  const revenueChartData =
    useMemo(
      () =>
        (
          revenue?.dailyRevenue ||
          []
        ).map((item) => ({
          ...item,
          label:
            formatChartDate(
              item.date,
            ),
          totalRevenue:
            toSafeNumber(
              item.totalRevenue,
            ),
        })),
      [revenue?.dailyRevenue],
    );

  const tokenChartData =
    useMemo(
      () =>
        (
          tokenUsage?.dailyUsage ||
          []
        ).map((item) => ({
          ...item,
          label:
            formatChartDate(
              item.date,
            ),
        })),
      [tokenUsage?.dailyUsage],
    );

  const selectedStorageUser =
    useMemo(
      () =>
        users.find(
          (user) =>
            String(user.id) ===
            storageUserId,
        ),
      [
        storageUserId,
        users,
      ],
    );

  const selectedTokenUser =
    useMemo(
      () =>
        users.find(
          (user) =>
            String(user.id) ===
            tokenUserId,
        ),
      [tokenUserId, users],
    );

  const kpis = [
    {
      label:
        "Tổng doanh thu",
      value: formatCurrency(
        revenue?.totalRevenue,
        revenue?.currency ||
          "VND",
      ),
      sub: revenue?.fromDate
        ? `${formatDate(
            revenue.fromDate,
          )} - ${formatDate(
            revenue.toDate,
          )}`
        : "Khoảng đang chọn",
      icon: WalletCards,
      boxClass:
        "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass:
        "text-emerald-600 dark:text-emerald-300",
    },
    {
      label:
        "Giao dịch thành công",
      value: formatNumber(
        revenue?.successfulTransactionCount,
      ),
      sub:
        "Chỉ tính trạng thái SUCCESS",
      icon: CheckCircle2,
      boxClass:
        "bg-blue-50 dark:bg-blue-500/10",
      iconClass:
        "text-blue-600 dark:text-blue-300",
    },
    {
      label:
        "Dung lượng đã dùng",
      value: formatBytes(
        storage?.totalStorageBytes,
      ),
      sub: storageUserId
        ? selectedStorageUser
            ?.fullName ||
          "Một người dùng"
        : `${formatNumber(
            storage?.userCount,
          )} người dùng`,
      icon: HardDrive,
      boxClass:
        "bg-violet-50 dark:bg-violet-500/10",
      iconClass:
        "text-violet-600 dark:text-violet-300",
    },
    {
      label: "Tổng tài liệu",
      value: formatNumber(
        storage?.documentCount,
      ),
      sub: storageUserId
        ? "Của người dùng đã chọn"
        : "Tất cả người dùng",
      icon: FileText,
      boxClass:
        "bg-amber-50 dark:bg-amber-500/10",
      iconClass:
        "text-amber-600 dark:text-amber-300",
    },
    {
      label:
        "Tổng token AI",
      value: formatNumber(
        tokenUsage?.totals
          ?.overallTokens,
      ),
      sub: tokenUserId
        ? selectedTokenUser
            ?.fullName ||
          "Một người dùng"
        : "Tất cả người dùng",
      icon: Bot,
      boxClass:
        "bg-pink-50 dark:bg-pink-500/10",
      iconClass:
        "text-pink-600 dark:text-pink-300",
    },
    {
      label:
        "Token AI Chat",
      value: formatNumber(
        tokenUsage?.totals
          ?.chatTokens,
      ),
      sub:
        tokenUsage?.fromDate
          ? `${formatDate(
              tokenUsage.fromDate,
            )} - ${formatDate(
              tokenUsage.toDate,
            )}`
          : "Khoảng đang chọn",
      icon: Coins,
      boxClass:
        "bg-cyan-50 dark:bg-cyan-500/10",
      iconClass:
        "text-cyan-600 dark:text-cyan-300",
    },
  ];

  return (
    <div className="space-y-8 bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Platform Analytics
          </h1>

          <p className="text-slate-500 dark:text-slate-400">
            Doanh thu, dung lượng lưu
            trữ và mức sử dụng token
            theo dữ liệu thật.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CalendarDays className="w-4 h-4" />

          Cập nhật:{" "}
          {formatDate(today)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map(
          (kpi, index) => (
            <motion.div
              key={kpi.label}
              initial={{
                opacity: 0,
                y: 18,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay:
                  index * 0.05,
              }}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${kpi.boxClass}`}
              >
                <kpi.icon
                  className={`w-5 h-5 ${kpi.iconClass}`}
                />
              </div>

              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {kpi.label}
              </p>

              <p className="mt-1 break-words text-2xl font-extrabold text-slate-900 dark:text-white">
                {kpi.value}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {kpi.sub}
              </p>
            </motion.div>
          ),
        )}
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-300">
              <WalletCards className="w-5 h-5" />

              <span className="text-xs font-extrabold uppercase tracking-widest">
                Revenue Analytics
              </span>
            </div>

            <h2 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
              Báo cáo doanh thu
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Xem theo một ngày,
              tuần, tháng, 7 ngày,
              30 ngày hoặc khoảng
              tùy chọn.
            </p>
          </div>

          <PeriodFilters
            period={
              revenuePeriod
            }
            setPeriod={
              setRevenuePeriod
            }
            selectedDate={
              revenueDate
            }
            setSelectedDate={
              setRevenueDate
            }
            customFromDate={
              revenueFromDate
            }
            setCustomFromDate={
              setRevenueFromDate
            }
            customToDate={
              revenueToDate
            }
            setCustomToDate={
              setRevenueToDate
            }
            loading={
              revenueLoading
            }
            onRefresh={() =>
              void loadRevenue()
            }
          />
        </div>

        {revenueLoading ? (
          <LoadingBlock label="Đang tải báo cáo doanh thu..." />
        ) : revenueError ? (
          <ErrorBlock
            message={
              revenueError
            }
            onRetry={() =>
              void loadRevenue()
            }
          />
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-emerald-50 p-5 dark:bg-emerald-500/10">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
                  Tổng doanh thu
                </p>

                <p className="mt-2 text-2xl font-extrabold text-emerald-800 dark:text-emerald-100">
                  {formatCurrency(
                    revenue?.totalRevenue,
                    revenue?.currency ||
                      "VND",
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-blue-50 p-5 dark:bg-blue-500/10">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-300">
                  Giao dịch thành công
                </p>

                <p className="mt-2 text-2xl font-extrabold text-blue-800 dark:text-blue-100">
                  {formatNumber(
                    revenue?.successfulTransactionCount,
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Khoảng báo cáo
                </p>

                <p className="mt-2 font-extrabold text-slate-900 dark:text-white">
                  {formatDate(
                    revenue?.fromDate,
                  )}{" "}
                  -{" "}
                  {formatDate(
                    revenue?.toDate,
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {formatNumber(
                    revenue?.numberOfDays,
                  )}{" "}
                  ngày
                </p>
              </div>
            </div>

            <div className="mt-7 h-80 dark:[&_.recharts-cartesian-axis-tick_text]:fill-slate-400 dark:[&_.recharts-cartesian-grid_line]:stroke-slate-800">
              {revenueChartData.length >
              0 ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart
                    data={
                      revenueChartData
                    }
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E2E8F0"
                      vertical={
                        false
                      }
                    />

                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 11,
                        fill: "#64748B",
                      }}
                      axisLine={
                        false
                      }
                      tickLine={
                        false
                      }
                    />

                    <YAxis
                      tickFormatter={(
                        value,
                      ) =>
                        `${Math.round(
                          Number(
                            value,
                          ) /
                            1000,
                        )}k`
                      }
                      tick={{
                        fontSize: 11,
                        fill: "#64748B",
                      }}
                      axisLine={
                        false
                      }
                      tickLine={
                        false
                      }
                    />

                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border:
                          "1px solid #E2E8F0",
                        fontSize: 12,
                      }}
                      formatter={(
                        value,
                      ) => [
                        formatCurrency(
                          value,
                          revenue?.currency ||
                            "VND",
                        ),
                        "Doanh thu",
                      ]}
                    />

                    <Line
                      type="monotone"
                      dataKey="totalRevenue"
                      name="Doanh thu"
                      stroke="#059669"
                      strokeWidth={3}
                      dot={{
                        r: 3,
                      }}
                      activeDot={{
                        r: 5,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                  Khoảng này chưa có
                  dữ liệu biểu đồ.
                </div>
              )}
            </div>
          </>
        )}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-300">
              <HardDrive className="w-5 h-5" />

              <span className="text-xs font-extrabold uppercase tracking-widest">
                Storage Analytics
              </span>
            </div>

            <h2 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
              Dung lượng theo người
              dùng
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Xem tổng dung lượng của
              tất cả tài khoản hoặc
              chọn một tài khoản cụ
              thể.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <UserFilter
              users={users}
              value={
                storageUserId
              }
              onChange={
                setStorageUserId
              }
              label="Phạm vi người dùng"
            />

            <button
              type="button"
              onClick={() =>
                void loadStorage()
              }
              disabled={
                storageLoading
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  storageLoading
                    ? "animate-spin"
                    : ""
                }`}
              />

              Xem dung lượng
            </button>
          </div>
        </div>

        {storageLoading ? (
          <LoadingBlock label="Đang tải báo cáo dung lượng..." />
        ) : storageError ? (
          <ErrorBlock
            message={
              storageError
            }
            onRetry={() =>
              void loadStorage()
            }
          />
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-violet-50 p-5 dark:bg-violet-500/10">
                <p className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300">
                  Tổng dung lượng
                </p>

                <p className="mt-2 text-2xl font-extrabold text-violet-800 dark:text-violet-100">
                  {formatBytes(
                    storage?.totalStorageBytes,
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-blue-50 p-5 dark:bg-blue-500/10">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-300">
                  Số người dùng
                </p>

                <p className="mt-2 text-2xl font-extrabold text-blue-800 dark:text-blue-100">
                  {formatNumber(
                    storage?.userCount,
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-amber-50 p-5 dark:bg-amber-500/10">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                  Số tài liệu
                </p>

                <p className="mt-2 text-2xl font-extrabold text-amber-800 dark:text-amber-100">
                  {formatNumber(
                    storage?.documentCount,
                  )}
                </p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.25fr]">
              <div className="h-80 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 dark:[&_.recharts-cartesian-axis-tick_text]:fill-slate-400 dark:[&_.recharts-cartesian-grid_line]:stroke-slate-800">
                <h3 className="mb-3 text-sm font-extrabold text-slate-800 dark:text-slate-200">
                  Top dung lượng theo
                  user (MB)
                </h3>

                {storageChartData.length >
                0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height="90%"
                  >
                    <BarChart
                      data={
                        storageChartData
                      }
                      layout="vertical"
                      margin={{
                        left: 10,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#E2E8F0"
                        horizontal={
                          false
                        }
                      />

                      <XAxis
                        type="number"
                        tick={{
                          fontSize: 10,
                          fill: "#64748B",
                        }}
                        axisLine={
                          false
                        }
                        tickLine={
                          false
                        }
                      />

                      <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        tick={{
                          fontSize: 10,
                          fill: "#64748B",
                        }}
                        axisLine={
                          false
                        }
                        tickLine={
                          false
                        }
                      />

                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border:
                            "1px solid #E2E8F0",
                          fontSize: 12,
                        }}
                      />

                      <Bar
                        dataKey="storageMb"
                        name="Dung lượng (MB)"
                        fill="#7C3AED"
                        radius={[
                          0,
                          5,
                          5,
                          0,
                        ]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[90%] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                    Chưa có dữ liệu
                    dung lượng.
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
                  <h3 className="font-extrabold text-slate-900 dark:text-white">
                    Chi tiết người dùng
                  </h3>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" />

                    <input
                      value={
                        userSearch
                      }
                      onChange={(
                        event,
                      ) =>
                        setUserSearch(
                          event.target
                            .value,
                        )
                      }
                      placeholder="Tìm ID, tên hoặc email..."
                      className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500 sm:w-64 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>

                <div className="max-h-80 overflow-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3">
                          User
                        </th>

                        <th className="px-4 py-3">
                          Email
                        </th>

                        <th className="px-4 py-3 text-right">
                          Tài liệu
                        </th>

                        <th className="px-4 py-3 text-right">
                          Dung lượng
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredStorageUsers.map(
                        (user) => (
                          <tr
                            key={
                              user.userId
                            }
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          >
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-900 dark:text-white">
                                {user.fullName ||
                                  "Chưa có tên"}
                              </p>

                              <p className="text-xs text-slate-400">
                                ID{" "}
                                {
                                  user.userId
                                }
                              </p>
                            </td>

                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                              {
                                user.email
                              }
                            </td>

                            <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">
                              {formatNumber(
                                user.documentCount,
                              )}
                            </td>

                            <td className="px-4 py-3 text-right font-extrabold text-violet-600 dark:text-violet-300">
                              {formatBytes(
                                user.totalStorageBytes,
                              )}
                            </td>
                          </tr>
                        ),
                      )}

                      {filteredStorageUsers.length ===
                        0 && (
                        <tr>
                          <td
                            colSpan={
                              4
                            }
                            className="px-4 py-10 text-center text-slate-500 dark:text-slate-400"
                          >
                            Không tìm
                            thấy người
                            dùng phù
                            hợp.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex items-center gap-2 text-pink-600 dark:text-pink-300">
              <Bot className="w-5 h-5" />

              <span className="text-xs font-extrabold uppercase tracking-widest">
                Token Analytics
              </span>
            </div>

            <h2 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
              Mức sử dụng token AI
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Lọc theo một user hoặc
              tất cả user, kết hợp
              ngày, tuần, tháng, 7
              ngày, 30 ngày hoặc
              khoảng tùy chọn.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <UserFilter
              users={users}
              value={tokenUserId}
              onChange={
                setTokenUserId
              }
              label="Phạm vi người dùng"
            />

            <PeriodFilters
              period={
                tokenPeriod
              }
              setPeriod={
                setTokenPeriod
              }
              selectedDate={
                tokenDate
              }
              setSelectedDate={
                setTokenDate
              }
              customFromDate={
                tokenFromDate
              }
              setCustomFromDate={
                setTokenFromDate
              }
              customToDate={
                tokenToDate
              }
              setCustomToDate={
                setTokenToDate
              }
              loading={
                tokenLoading
              }
              onRefresh={() =>
                void loadTokenUsage()
              }
            />
          </div>
        </div>

        {tokenLoading ? (
          <LoadingBlock label="Đang tải báo cáo token..." />
        ) : tokenError ? (
          <ErrorBlock
            message={tokenError}
            onRetry={() =>
              void loadTokenUsage()
            }
          />
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {[
                [
                  "Chat",
                  tokenUsage?.totals
                    ?.chatTokens,
                  "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
                ],
                [
                  "Summary",
                  tokenUsage?.totals
                    ?.summaryTokens,
                  "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
                ],
                [
                  "Quiz",
                  tokenUsage?.totals
                    ?.quizTokens,
                  "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
                ],
                [
                  "Extract",
                  tokenUsage?.totals
                    ?.extractTokens,
                  "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                ],
                [
                  "Feature total",
                  tokenUsage?.totals
                    ?.totalTokens,
                  "bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300",
                ],
                [
                  "Overall",
                  tokenUsage?.totals
                    ?.overallTokens,
                  "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-white",
                ],
              ].map(
                ([
                  label,
                  value,
                  className,
                ]) => (
                  <div
                    key={String(
                      label,
                    )}
                    className={`rounded-2xl p-4 ${String(
                      className,
                    )}`}
                  >
                    <p className="text-xs font-bold uppercase tracking-wider opacity-75">
                      {String(
                        label,
                      )}
                    </p>

                    <p className="mt-2 text-xl font-extrabold">
                      {formatNumber(
                        value,
                      )}
                    </p>
                  </div>
                ),
              )}
            </div>

            <div className="mt-7 h-96 dark:[&_.recharts-cartesian-axis-tick_text]:fill-slate-400 dark:[&_.recharts-cartesian-grid_line]:stroke-slate-800">
              {tokenChartData.length >
              0 ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={
                      tokenChartData
                    }
                    barSize={16}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E2E8F0"
                      vertical={
                        false
                      }
                    />

                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 11,
                        fill: "#64748B",
                      }}
                      axisLine={
                        false
                      }
                      tickLine={
                        false
                      }
                    />

                    <YAxis
                      tickFormatter={(
                        value,
                      ) =>
                        formatNumber(
                          value,
                        )
                      }
                      tick={{
                        fontSize: 11,
                        fill: "#64748B",
                      }}
                      axisLine={
                        false
                      }
                      tickLine={
                        false
                      }
                    />

                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border:
                          "1px solid #E2E8F0",
                        fontSize: 12,
                      }}
                      formatter={(
                        value,
                        name,
                      ) => [
                        formatNumber(
                          value,
                        ),
                        String(name),
                      ]}
                    />

                    <Legend />

                    <Bar
                      dataKey="chatTokens"
                      name="Chat"
                      stackId="tokens"
                      fill="#2563EB"
                    />

                    <Bar
                      dataKey="summaryTokens"
                      name="Summary"
                      stackId="tokens"
                      fill="#8B5CF6"
                    />

                    <Bar
                      dataKey="quizTokens"
                      name="Quiz"
                      stackId="tokens"
                      fill="#10B981"
                    />

                    <Bar
                      dataKey="extractTokens"
                      name="Extract"
                      stackId="tokens"
                      fill="#F59E0B"
                      radius={[
                        4,
                        4,
                        0,
                        0,
                      ]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                  Khoảng này chưa có
                  dữ liệu token.
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <span>
                Phạm vi:{" "}
                <strong>
                  {tokenUserId
                    ? selectedTokenUser
                        ?.fullName ||
                      `User ${tokenUserId}`
                    : "Tất cả người dùng"}
                </strong>
              </span>

              <span>
                Thời gian:{" "}
                <strong>
                  {formatDate(
                    tokenUsage?.fromDate,
                  )}{" "}
                  -{" "}
                  {formatDate(
                    tokenUsage?.toDate,
                  )}
                </strong>
              </span>

              <span>
                Số ngày:{" "}
                <strong>
                  {formatNumber(
                    tokenUsage?.numberOfDays,
                  )}
                </strong>
              </span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}