import {
  AlertCircle,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { userApi, type UserResponse } from "../../services/userApi";

type UiReportPeriod =
  "DAY" | "WEEK" | "MONTH" | "LAST_7_DAYS" | "LAST_30_DAYS" | "CUSTOM";

type ApiError = {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
};

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const PERIOD_OPTIONS: Array<{
  value: UiReportPeriod;
  label: string;
}> = [
  {
    value: "DAY",
    label: "1 day",
  },
  {
    value: "WEEK",
    label: "Weekly",
  },
  {
    value: "MONTH",
    label: "Monthly",
  },
  {
    value: "LAST_7_DAYS",
    label: "Last 7 days",
  },
  {
    value: "LAST_30_DAYS",
    label: "Last 30 days",
  },
  {
    value: "CUSTOM",
    label: "Custom",
  },
];

const todayInputValue = (): string => {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const isValidDateInput = (value: string): boolean => {
  if (!value || !DATE_INPUT_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(year, month - 1, day, 12, 0, 0);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

const shiftDate = (value: string, days: number): string => {
  if (!isValidDateInput(value)) {
    return "";
  }

  const [year, month, day] = value.split("-").map(Number);

  /*
   * Use noon to avoid date shifts across time zones.
   */
  const date = new Date(year, month - 1, day, 12, 0, 0);

  date.setDate(date.getDate() + days);

  const shiftedYear = date.getFullYear();

  const shiftedMonth = String(date.getMonth() + 1).padStart(2, "0");

  const shiftedDay = String(date.getDate()).padStart(2, "0");

  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
};

const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  const apiError = error as ApiError;

  return (
    apiError.response?.data?.message ||
    apiError.response?.data?.error ||
    apiError.message ||
    fallbackMessage
  );
};

const toSafeNumber = (value: unknown): number => {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? Math.max(0, numberValue) : 0;
};

const formatNumber = (value: unknown): string => {
  return Math.floor(toSafeNumber(value)).toLocaleString("en-US");
};

const formatCurrency = (value: unknown, currency = "VND"): string => {
  const amount = toSafeNumber(value);

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${formatNumber(amount)} ${currency || "VND"}`;
  }
};

const formatBytes = (value: unknown): string => {
  const bytes = toSafeNumber(value);

  const units = ["B", "KB", "MB", "GB", "TB"];

  if (bytes === 0) {
    return "0 B";
  }

  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  const converted = bytes / 1024 ** unitIndex;

  return `${converted.toFixed(
    converted >= 10 || unitIndex === 0 ? 1 : 2,
  )} ${units[unitIndex]}`;
};

const formatDate = (value?: string | null): string => {
  if (!value) {
    return "—";
  }

  const normalized = value.slice(0, 10);

  if (!isValidDateInput(normalized)) {
    return value;
  }

  const [year, month, day] = normalized.split("-").map(Number);

  const date = new Date(year, month - 1, day, 12, 0, 0);

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatChartDate = (value: string): string => {
  if (!isValidDateInput(value)) {
    return value;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(year, month - 1, day, 12, 0, 0);

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
  });
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
  const referenceDate = isValidDateInput(selectedDate)
    ? selectedDate
    : todayInputValue();

  if (period === "LAST_7_DAYS") {
    return {
      period: "CUSTOM",
      fromDate: shiftDate(referenceDate, -6),
      toDate: referenceDate,
    };
  }

  if (period === "LAST_30_DAYS") {
    return {
      period: "CUSTOM",
      fromDate: shiftDate(referenceDate, -29),
      toDate: referenceDate,
    };
  }

  if (period === "CUSTOM") {
    return {
      period: "CUSTOM",
      fromDate: customFromDate,
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
    if (!isValidDateInput(selectedDate)) {
      return "Please select a reference date or end date.";
    }

    return null;
  }

  if (!fromDate || !toDate) {
    return "Please select both the start date and end date.";
  }

  if (!isValidDateInput(fromDate) || !isValidDateInput(toDate)) {
    return "Invalid date. Use the YYYY-MM-DD format.";
  }

  if (fromDate > toDate) {
    return "The start date must be earlier than or equal to the end date.";
  }

  return null;
};

function LoadingBlock({ label }: { label: string }) {
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
        Retry
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
  setPeriod: (value: UiReportPeriod) => void;
  selectedDate: string;
  setSelectedDate: (value: string) => void;
  customFromDate: string;
  setCustomFromDate: (value: string) => void;
  customToDate: string;
  setCustomToDate: (value: string) => void;
  loading: boolean;
  onRefresh: () => void;
}) {
  const selectedDateLabel =
    period === "LAST_7_DAYS" || period === "LAST_30_DAYS"
      ? "End date"
      : "Reference date";

  const handlePeriodChange = (nextPeriod: UiReportPeriod): void => {
    setPeriod(nextPeriod);

    const today = todayInputValue();

    if (nextPeriod !== "CUSTOM" && !isValidDateInput(selectedDate)) {
      setSelectedDate(today);
    }

    if (nextPeriod === "CUSTOM") {
      const validToDate = isValidDateInput(customToDate) ? customToDate : today;

      if (!isValidDateInput(customToDate)) {
        setCustomToDate(today);
      }

      if (!isValidDateInput(customFromDate)) {
        setCustomFromDate(shiftDate(validToDate, -29));
      }
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="space-y-1.5">
        <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Report period
        </span>

        <select
          value={period}
          onChange={(event) =>
            handlePeriodChange(event.target.value as UiReportPeriod)
          }
          className="h-10 min-w-40 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
        >
          {PERIOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
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
            onChange={(event) => setSelectedDate(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          />
        </label>
      ) : (
        <>
          <label className="space-y-1.5">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              From date
            </span>

            <input
              type="date"
              value={customFromDate}
              onChange={(event) => setCustomFromDate(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              To date
            </span>

            <input
              type="date"
              value={customToDate}
              onChange={(event) => setCustomToDate(event.target.value)}
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
        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        View report
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
  onChange: (value: string) => void;
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const selectedUser = useMemo(
    () => users.find((user) => String(user.id) === value) || null,
    [users, value],
  );

  const filteredUsers = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();

    const sortedUsers = [...users].sort((firstUser, secondUser) => {
      const firstEmail = firstUser.email?.toLowerCase() || "";
      const secondEmail = secondUser.email?.toLowerCase() || "";

      return firstEmail.localeCompare(secondEmail);
    });

    if (!keyword) {
      return sortedUsers;
    }

    return sortedUsers.filter((user) =>
      [String(user.id), user.fullName || "", user.email || ""]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [searchValue, users]);

  /*
   * Avoid rendering hundreds or thousands of rows at once. Users can keep
   * typing an email, name, or ID to narrow the result list.
   */
  const visibleUsers = useMemo(
    () => filteredUsers.slice(0, 100),
    [filteredUsers],
  );

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent): void => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen]);

  const selectUser = (userId: string): void => {
    onChange(userId);
    setSearchValue("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>

      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
       className="
  flex h-10 w-72 max-w-full
  items-center justify-between gap-3
  rounded-xl border border-slate-200
  bg-white px-3 text-left text-sm
  font-semibold text-slate-700
  outline-none transition
  hover:border-blue-300 focus:border-blue-500
  dark:border-slate-700 dark:bg-slate-950
  dark:text-slate-200 dark:hover:border-blue-500/60
"
        aria-expanded={isOpen}
      >
        <span className="min-w-0 truncate">
          {selectedUser
            ? selectedUser.email || selectedUser.fullName || `User ${selectedUser.id}`
            : "All users"}
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
  <div
    className="
      absolute left-0 top-full z-[9999] mt-2
      w-[min(26rem,calc(100vw-2rem))]
      overflow-hidden rounded-2xl
      border border-slate-200 bg-white shadow-2xl
      dark:border-slate-700 dark:bg-slate-900
    "
  >
    <div className="border-b border-slate-200 p-3 dark:border-slate-700">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

        <input
          ref={searchInputRef}
          value={searchValue}
          onChange={(event) =>
            setSearchValue(event.target.value)
          }
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          placeholder="Search by email, name, or user ID..."
          className="
            h-10 w-full rounded-xl
            border border-slate-200 bg-slate-50
            pl-9 pr-3 text-sm text-slate-800
            outline-none transition
            focus:border-blue-500 focus:bg-white
            dark:border-slate-700 dark:bg-slate-950
            dark:text-white
          "
        />
      </div>
    </div>

    <div
      className="max-h-64 overflow-y-auto overscroll-contain p-2"
      role="listbox"
    >
      <button
        type="button"
        onClick={() => selectUser("")}
        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition ${
          value === ""
            ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
            : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
        }`}
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold">
            All users
          </span>

          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
            Combine data from every account
          </span>
        </span>

        {value === "" && (
          <CheckCircle2 className="h-4 w-4 shrink-0" />
        )}
      </button>

      <div className="my-2 border-t border-slate-100 dark:border-slate-800" />

      {visibleUsers.map((user) => {
        const isSelected =
          String(user.id) === value;

        return (
          <button
            key={user.id}
            type="button"
            onClick={() =>
              selectUser(String(user.id))
            }
            className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
              isSelected
                ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
            role="option"
            aria-selected={isSelected}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">
                {user.email || "No email"}
              </span>

              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                {user.fullName || "Unnamed user"} · ID {user.id}
              </span>
            </span>

            {isSelected && (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            )}
          </button>
        );
      })}

      {filteredUsers.length === 0 && (
        <div className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          No user matches this email, name, or ID.
        </div>
      )}
    </div>

    {filteredUsers.length > visibleUsers.length && (
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
        Showing the first {visibleUsers.length} of{" "}
        {filteredUsers.length} users. Continue typing to narrow
        the results.
      </div>
    )}
  </div>
)}
    </div>
  );
}

export function AdminAnalyticsContent({ view }: { view: "token" | "storage" }) {
  const today = useMemo(() => todayInputValue(), []);

  const defaultFromDate = useMemo(() => shiftDate(today, -29), [today]);

  const [users, setUsers] = useState<UserResponse[]>([]);

  const [userSearch, setUserSearch] = useState("");

  const [revenue, setRevenue] = useState<RevenueReportResponse | null>(null);

  const [revenuePeriod, setRevenuePeriod] =
    useState<UiReportPeriod>("LAST_30_DAYS");

  const [revenueDate, setRevenueDate] = useState(today);

  const [revenueFromDate, setRevenueFromDate] = useState(defaultFromDate);

  const [revenueToDate, setRevenueToDate] = useState(today);

  const [revenueLoading, setRevenueLoading] = useState(true);

  const [revenueError, setRevenueError] = useState("");

  const [storage, setStorage] = useState<StorageReportResponse | null>(null);

  const [storageUserId, setStorageUserId] = useState("");

  const [storageLoading, setStorageLoading] = useState(true);

  const [storageError, setStorageError] = useState("");

  const [tokenUsage, setTokenUsage] = useState<TokenUsageReportResponse | null>(
    null,
  );

  const [tokenUserId, setTokenUserId] = useState("");

  const [tokenPeriod, setTokenPeriod] =
    useState<UiReportPeriod>("LAST_30_DAYS");

  const [tokenDate, setTokenDate] = useState(today);

  const [tokenFromDate, setTokenFromDate] = useState(defaultFromDate);

  const [tokenToDate, setTokenToDate] = useState(today);

  const [tokenLoading, setTokenLoading] = useState(true);

  const [tokenError, setTokenError] = useState("");

  const loadUsers = useCallback(async (): Promise<void> => {
    try {
      const response = await userApi.getUsers();

      const rawUsers = response.data;

      const userList = Array.isArray(rawUsers) ? rawUsers : [];

      const sortedUsers = [...userList].sort(
        (firstUser, secondUser) => firstUser.id - secondUser.id,
      );

      setUsers(sortedUsers);
    } catch (error) {
      console.error("Load users failed:", error);

      toast.error(getErrorMessage(error, "Unable to load the user list."));
    }
  }, []);

  const loadRevenue = useCallback(async (): Promise<void> => {
    const validationMessage = validateDateRange(
      revenuePeriod,
      revenueDate,
      revenueFromDate,
      revenueToDate,
    );

    if (validationMessage) {
      setRevenueError(validationMessage);

      toast.error(validationMessage);

      return;
    }

    setRevenueLoading(true);
    setRevenueError("");

    try {
      const params = buildDateParams(
        revenuePeriod,
        revenueDate,
        revenueFromDate,
        revenueToDate,
      ) as RevenueReportParams;

      const response = await adminAnalyticsApi.getRevenue(params);

      setRevenue(response.data);
    } catch (error) {
      console.error("Load revenue report failed:", error);

      const message = getErrorMessage(
        error,
        "Unable to load the revenue report.",
      );

      setRevenueError(message);

      toast.error(message);
    } finally {
      setRevenueLoading(false);
    }
  }, [revenueDate, revenueFromDate, revenuePeriod, revenueToDate]);

  const loadStorage = useCallback(async (
    selectedUserId = storageUserId,
  ): Promise<void> => {
    setStorageLoading(true);
    setStorageError("");

    try {
      const userId = selectedUserId ? Number(selectedUserId) : undefined;

      if (userId !== undefined && (!Number.isInteger(userId) || userId <= 0)) {
        throw new Error("Invalid user ID.");
      }

      const response = await adminAnalyticsApi.getStorage(userId);

      setStorage(response.data);
    } catch (error) {
      console.error("Load storage report failed:", error);

      const message = getErrorMessage(
        error,
        "Unable to load the storage report.",
      );

      setStorageError(message);

      toast.error(message);
    } finally {
      setStorageLoading(false);
    }
  }, [storageUserId]);

  const loadTokenUsage = useCallback(async (
    selectedUserId = tokenUserId,
  ): Promise<void> => {
    const validationMessage = validateDateRange(
      tokenPeriod,
      tokenDate,
      tokenFromDate,
      tokenToDate,
    );

    if (validationMessage) {
      setTokenError(validationMessage);

      toast.error(validationMessage);

      return;
    }

    setTokenLoading(true);
    setTokenError("");

    try {
      const dateParams = buildDateParams(
        tokenPeriod,
        tokenDate,
        tokenFromDate,
        tokenToDate,
      );

      const parsedUserId = selectedUserId ? Number(selectedUserId) : undefined;

      if (
        parsedUserId !== undefined &&
        (!Number.isInteger(parsedUserId) || parsedUserId <= 0)
      ) {
        throw new Error("Invalid user ID.");
      }

      const params: TokenUsageReportParams = {
        ...dateParams,
        ...(parsedUserId !== undefined
          ? {
              userId: parsedUserId,
            }
          : {}),
      };

      const response = await adminAnalyticsApi.getTokenUsage(params);

      setTokenUsage(response.data);
    } catch (error) {
      console.error("Load token report failed:", error);

      const message = getErrorMessage(
        error,
        "Unable to load the token usage report.",
      );

      setTokenError(message);

      toast.error(message);
    } finally {
      setTokenLoading(false);
    }
  }, [tokenDate, tokenFromDate, tokenPeriod, tokenToDate, tokenUserId]);

  useEffect(() => {
    void loadUsers();
    if (view === "storage") void loadStorage();
    if (view === "token") void loadTokenUsage();

    /*
     * Load the default reports only once when the page opens.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredStorageUsers = useMemo(() => {
    const reportUsers = storage?.users || [];

    const keyword = userSearch.trim().toLowerCase();

    if (!keyword) {
      return reportUsers;
    }

    return reportUsers.filter((user) =>
      [String(user.userId), user.fullName || "", user.email || ""]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [storage?.users, userSearch]);

  const storageChartData = useMemo(
    () =>
      [...(storage?.users || [])]
        .sort(
          (firstUser, secondUser) =>
            secondUser.totalStorageBytes - firstUser.totalStorageBytes,
        )
        .slice(0, 10)
        .map((user) => ({
          name: user.fullName || `User ${user.userId}`,
          storageMb: Number(
            (toSafeNumber(user.totalStorageBytes) / 1024 ** 2).toFixed(2),
          ),
        })),
    [storage?.users],
  );

  const revenueChartData = useMemo(
    () =>
      (revenue?.dailyRevenue || []).map((item) => ({
        ...item,
        label: formatChartDate(item.date),
        totalRevenue: toSafeNumber(item.totalRevenue),
      })),
    [revenue?.dailyRevenue],
  );

  const tokenChartData = useMemo(
    () =>
      (tokenUsage?.dailyUsage || []).map((item) => ({
        ...item,
        label: formatChartDate(item.date),
      })),
    [tokenUsage?.dailyUsage],
  );

  const selectedStorageUser = useMemo(
    () => users.find((user) => String(user.id) === storageUserId),
    [storageUserId, users],
  );

  const selectedTokenUser = useMemo(
    () => users.find((user) => String(user.id) === tokenUserId),
    [tokenUserId, users],
  );

  const allKpis = [
    {
      label: "Total revenue",
      value: formatCurrency(revenue?.totalRevenue, revenue?.currency || "VND"),
      sub: revenue?.fromDate
        ? `${formatDate(revenue.fromDate)} - ${formatDate(revenue.toDate)}`
        : "Selected period",
      icon: WalletCards,
      boxClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-600 dark:text-emerald-300",
    },
    {
      label: "Successful transactions",
      value: formatNumber(revenue?.successfulTransactionCount),
      sub: "Only SUCCESS transactions are included",
      icon: CheckCircle2,
      boxClass: "bg-blue-50 dark:bg-blue-500/10",
      iconClass: "text-blue-600 dark:text-blue-300",
    },
    {
      label: "Storage used",
      value: formatBytes(storage?.totalStorageBytes),
      sub: storageUserId
        ? selectedStorageUser?.fullName || "Single user"
        : `${formatNumber(storage?.userCount)} users`,
      icon: HardDrive,
      boxClass: "bg-violet-50 dark:bg-violet-500/10",
      iconClass: "text-violet-600 dark:text-violet-300",
    },
    {
      label: "Total documents",
      value: formatNumber(storage?.documentCount),
      sub: storageUserId ? "For the selected user" : "All users",
      icon: FileText,
      boxClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-600 dark:text-amber-300",
    },
    {
      label: "Total AI tokens",
      value: formatNumber(tokenUsage?.totals?.overallTokens),
      sub: tokenUserId
        ? selectedTokenUser?.fullName || "Single user"
        : "All users",
      icon: Bot,
      boxClass: "bg-pink-50 dark:bg-pink-500/10",
      iconClass: "text-pink-600 dark:text-pink-300",
    },
    {
      label: "Token AI Chat",
      value: formatNumber(tokenUsage?.totals?.chatTokens),
      sub: tokenUsage?.fromDate
        ? `${formatDate(tokenUsage.fromDate)} - ${formatDate(
            tokenUsage.toDate,
          )}`
        : "Selected period",
      icon: Coins,
      boxClass: "bg-cyan-50 dark:bg-cyan-500/10",
      iconClass: "text-cyan-600 dark:text-cyan-300",
    },
  ];

  const kpis = view === "storage" ? allKpis.slice(2, 4) : allKpis.slice(4, 6);

  return (
    <div className="space-y-8 bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {view === "storage" ? "Storage Analytics" : "Token Analytics"}
          </h1>

          <p className="text-slate-500 dark:text-slate-400">
            {view === "storage"
              ? "Storage usage and document distribution based on live data."
              : "AI token consumption based on live data."}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CalendarDays className="w-4 h-4" />
          Updated: {formatDate(today)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi, index) => (
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
              delay: index * 0.05,
            }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center ${kpi.boxClass}`}
            >
              <kpi.icon className={`w-5 h-5 ${kpi.iconClass}`} />
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
        ))}
      </div>

      {false && <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-300">
              <WalletCards className="w-5 h-5" />

              <span className="text-xs font-extrabold uppercase tracking-widest">
                Revenue Analytics
              </span>
            </div>

            <h2 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
              Revenue report
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              View data by day, week, month, the last 7 days, the last 30 days,
              or a custom range.
            </p>
          </div>

          <PeriodFilters
            period={revenuePeriod}
            setPeriod={setRevenuePeriod}
            selectedDate={revenueDate}
            setSelectedDate={setRevenueDate}
            customFromDate={revenueFromDate}
            setCustomFromDate={setRevenueFromDate}
            customToDate={revenueToDate}
            setCustomToDate={setRevenueToDate}
            loading={revenueLoading}
            onRefresh={() => void loadRevenue()}
          />
        </div>

        {revenueLoading ? (
          <LoadingBlock label="Loading revenue report..." />
        ) : revenueError ? (
          <ErrorBlock
            message={revenueError}
            onRetry={() => void loadRevenue()}
          />
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-emerald-50 p-5 dark:bg-emerald-500/10">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
                  Total revenue
                </p>

                <p className="mt-2 text-2xl font-extrabold text-emerald-800 dark:text-emerald-100">
                  {formatCurrency(
                    revenue?.totalRevenue,
                    revenue?.currency || "VND",
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-blue-50 p-5 dark:bg-blue-500/10">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-300">
                  Successful transactions
                </p>

                <p className="mt-2 text-2xl font-extrabold text-blue-800 dark:text-blue-100">
                  {formatNumber(revenue?.successfulTransactionCount)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Report range
                </p>

                <p className="mt-2 font-extrabold text-slate-900 dark:text-white">
                  {formatDate(revenue?.fromDate)} -{" "}
                  {formatDate(revenue?.toDate)}
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {formatNumber(revenue?.numberOfDays)} days
                </p>
              </div>
            </div>

            <div className="mt-7 h-80 dark:[&_.recharts-cartesian-axis-tick_text]:fill-slate-400 dark:[&_.recharts-cartesian-grid_line]:stroke-slate-800">
              {revenueChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E2E8F0"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 11,
                        fill: "#64748B",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      tickFormatter={(value) =>
                        `${Math.round(Number(value) / 1000)}k`
                      }
                      tick={{
                        fontSize: 11,
                        fill: "#64748B",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #E2E8F0",
                        fontSize: 12,
                      }}
                      formatter={(value) => [
                        formatCurrency(value, revenue?.currency || "VND"),
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
                  No chart data is available for this period.
                </div>
              )}
            </div>
          </>
        )}
      </section>}

      {view === "storage" && <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-300">
              <HardDrive className="w-5 h-5" />

              <span className="text-xs font-extrabold uppercase tracking-widest">
                Storage Analytics
              </span>
            </div>

            <h2 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
              Storage by user
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              View total storage across all accounts or select a specific
              account.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <UserFilter
              users={users}
              value={storageUserId}
              onChange={(userId) => {
                setStorageUserId(userId);
                void loadStorage(userId);
              }}
              label="User scope"
            />

            <button
              type="button"
              onClick={() => void loadStorage()}
              disabled={storageLoading}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              <RefreshCw
                className={`w-4 h-4 ${storageLoading ? "animate-spin" : ""}`}
              />
              View storage
            </button>
          </div>
        </div>

        {storageLoading ? (
          <LoadingBlock label="Loading storage report..." />
        ) : storageError ? (
          <ErrorBlock
            message={storageError}
            onRetry={() => void loadStorage()}
          />
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-violet-50 p-5 dark:bg-violet-500/10">
                <p className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300">
                  Total storage
                </p>

                <p className="mt-2 text-2xl font-extrabold text-violet-800 dark:text-violet-100">
                  {formatBytes(storage?.totalStorageBytes)}
                </p>
              </div>

              <div className="rounded-2xl bg-blue-50 p-5 dark:bg-blue-500/10">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-300">
                  Users
                </p>

                <p className="mt-2 text-2xl font-extrabold text-blue-800 dark:text-blue-100">
                  {formatNumber(storage?.userCount)}
                </p>
              </div>

              <div className="rounded-2xl bg-amber-50 p-5 dark:bg-amber-500/10">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                  Documents
                </p>

                <p className="mt-2 text-2xl font-extrabold text-amber-800 dark:text-amber-100">
                  {formatNumber(storage?.documentCount)}
                </p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.25fr]">
              <div className="h-80 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 dark:[&_.recharts-cartesian-axis-tick_text]:fill-slate-400 dark:[&_.recharts-cartesian-grid_line]:stroke-slate-800">
                <h3 className="mb-3 text-sm font-extrabold text-slate-800 dark:text-slate-200">
                  Top users by storage (MB)
                </h3>

                {storageChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart
                      data={storageChartData}
                      layout="vertical"
                      margin={{
                        left: 10,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#E2E8F0"
                        horizontal={false}
                      />

                      <XAxis
                        type="number"
                        tick={{
                          fontSize: 10,
                          fill: "#64748B",
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        tick={{
                          fontSize: 10,
                          fill: "#64748B",
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #E2E8F0",
                          fontSize: 12,
                        }}
                      />

                      <Bar
                        dataKey="storageMb"
                        name="Storage (MB)"
                        fill="#7C3AED"
                        radius={[0, 5, 5, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[90%] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                    No storage data is available.
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
                  <h3 className="font-extrabold text-slate-900 dark:text-white">
                    User details
                  </h3>
                </div>

                <div className="max-h-80 overflow-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3">User</th>

                        <th className="px-4 py-3">Email</th>

                        <th className="px-4 py-3 text-right">Documents</th>

                        <th className="px-4 py-3 text-right">Storage</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredStorageUsers.map((user) => (
                        <tr
                          key={user.userId}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        >
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900 dark:text-white">
                              {user.fullName || "Unnamed user"}
                            </p>

                            <p className="text-xs text-slate-400">
                              ID {user.userId}
                            </p>
                          </td>

                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {user.email}
                          </td>

                          <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">
                            {formatNumber(user.documentCount)}
                          </td>

                          <td className="px-4 py-3 text-right font-extrabold text-violet-600 dark:text-violet-300">
                            {formatBytes(user.totalStorageBytes)}
                          </td>
                        </tr>
                      ))}

                      {filteredStorageUsers.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-10 text-center text-slate-500 dark:text-slate-400"
                          >
                            No matching users found.
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
      </section>}

      {view === "token" && <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex items-center gap-2 text-pink-600 dark:text-pink-300">
              <Bot className="w-5 h-5" />

              <span className="text-xs font-extrabold uppercase tracking-widest">
                Token Analytics
              </span>
            </div>

            <h2 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
              AI token usage
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Filter by one user or all users, combined with a day, week, month,
              the last 7 days, the last 30 days, or a custom range.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <UserFilter
              users={users}
              value={tokenUserId}
              onChange={(userId) => {
                setTokenUserId(userId);
                void loadTokenUsage(userId);
              }}
              label="User scope"
            />

            <PeriodFilters
              period={tokenPeriod}
              setPeriod={setTokenPeriod}
              selectedDate={tokenDate}
              setSelectedDate={setTokenDate}
              customFromDate={tokenFromDate}
              setCustomFromDate={setTokenFromDate}
              customToDate={tokenToDate}
              setCustomToDate={setTokenToDate}
              loading={tokenLoading}
              onRefresh={() => void loadTokenUsage()}
            />
          </div>
        </div>

        {tokenLoading ? (
          <LoadingBlock label="Loading token usage report..." />
        ) : tokenError ? (
          <ErrorBlock
            message={tokenError}
            onRetry={() => void loadTokenUsage()}
          />
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {[
                [
                  "Chat",
                  tokenUsage?.totals?.chatTokens,
                  "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
                ],
                [
                  "Summary",
                  tokenUsage?.totals?.summaryTokens,
                  "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
                ],
                [
                  "Quiz",
                  tokenUsage?.totals?.quizTokens,
                  "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
                ],
                [
                  "Extract",
                  tokenUsage?.totals?.extractTokens,
                  "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                ],
                [
                  "Feature total",
                  tokenUsage?.totals?.totalTokens,
                  "bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300",
                ],
                [
                  "Overall",
                  tokenUsage?.totals?.overallTokens,
                  "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-white",
                ],
              ].map(([label, value, className]) => (
                <div
                  key={String(label)}
                  className={`rounded-2xl p-4 ${String(className)}`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider opacity-75">
                    {String(label)}
                  </p>

                  <p className="mt-2 text-xl font-extrabold">
                    {formatNumber(value)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-7 h-96 dark:[&_.recharts-cartesian-axis-tick_text]:fill-slate-400 dark:[&_.recharts-cartesian-grid_line]:stroke-slate-800">
              {tokenChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tokenChartData} barSize={16}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E2E8F0"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 11,
                        fill: "#64748B",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      tickFormatter={(value) => formatNumber(value)}
                      tick={{
                        fontSize: 11,
                        fill: "#64748B",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #E2E8F0",
                        fontSize: 12,
                      }}
                      formatter={(value, name) => [
                        formatNumber(value),
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
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                  No token usage data is available for this period.
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <span>
                Scope:{" "}
                <strong>
                  {tokenUserId
                    ? selectedTokenUser?.fullName || `User ${tokenUserId}`
                    : "All users"}
                </strong>
              </span>

              <span>
                Period:{" "}
                <strong>
                  {formatDate(tokenUsage?.fromDate)} -{" "}
                  {formatDate(tokenUsage?.toDate)}
                </strong>
              </span>

              <span>
                Number of days:{" "}
                <strong>{formatNumber(tokenUsage?.numberOfDays)}</strong>
              </span>
            </div>
          </>
        )}
      </section>}
    </div>
  );
}
