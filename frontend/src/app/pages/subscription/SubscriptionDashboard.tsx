import {
  AlertCircle,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Crown,
  FileImage,
  FileText,
  HardDrive,
  Music,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Upload,
  Video,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  createVnpayPaymentApi,
  getPaymentHistoryApi,
  type PaymentHistoryResponse,
} from "../../services/paymentApi";
import {
  subscriptionApi,
  type PlanResponse,
  type SubscriptionResponse,
} from "../../services/subscriptionApi";

type SubscriptionTab = "overview" | "plans" | "billing";

type ApiError = {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
};

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

const toSafeNumber = (value: unknown): number => {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.max(0, numberValue);
};

const formatNumber = (value: unknown): string => {
  return Math.floor(toSafeNumber(value)).toLocaleString("vi-VN");
};

const formatCurrency = (value?: number | string | null): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(toSafeNumber(value));
};

const formatDate = (value?: string | null): string => {
  if (!value) {
    return "Không hết hạn";
  }

  const normalizedValue = value.replace(/\.(\d{3})\d+/, ".$1");
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return "—";
  }

  const normalizedValue = value.replace(/\.(\d{3})\d+/, ".$1");
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatStorage = (value?: number): string => {
  const storageLimitMb = toSafeNumber(value);

  if (storageLimitMb >= 1024) {
    const storageLimitGb = storageLimitMb / 1024;

    return `${Number.isInteger(storageLimitGb)
      ? storageLimitGb
      : storageLimitGb.toFixed(1)} GB`;
  }

  return `${formatNumber(storageLimitMb)} MB`;
};

const normalizeCode = (value?: string | null): string => {
  return String(value || "")
    .trim()
    .toUpperCase();
};

const getStatusLabel = (status?: string | null): string => {
  const normalizedStatus = normalizeCode(status);

  if (normalizedStatus === "ACTIVE") {
    return "Đang hoạt động";
  }

  if (normalizedStatus === "EXPIRED") {
    return "Đã hết hạn";
  }

  if (normalizedStatus === "CANCELLED") {
    return "Đã hủy";
  }

  return status || "Không xác định";
};

const getPaymentStatusLabel = (status?: string | null): string => {
  const normalizedStatus = normalizeCode(status);

  if (normalizedStatus === "SUCCESS" || normalizedStatus === "PAID") {
    return "Thành công";
  }

  if (normalizedStatus === "PENDING") {
    return "Đang chờ";
  }

  if (normalizedStatus === "FAILED") {
    return "Thất bại";
  }

  if (normalizedStatus === "CANCELLED") {
    return "Đã hủy";
  }

  return status || "Không xác định";
};

const getPaymentStatusClass = (status?: string | null): string => {
  const normalizedStatus = normalizeCode(status);

  if (normalizedStatus === "SUCCESS" || normalizedStatus === "PAID") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (normalizedStatus === "PENDING") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300";
  }

  if (normalizedStatus === "FAILED" || normalizedStatus === "CANCELLED") {
    return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300";
  }

  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
};

const getPaymentDate = (payment: PaymentHistoryResponse): string | null => {
  return payment.paymentTime || payment.createdAt || null;
};

const getPaymentOrderCode = (
  payment: PaymentHistoryResponse,
  index: number,
): string => {
  return payment.orderCode || payment.transactionNo || `PAYMENT-${index + 1}`;
};

const getRemainingDays = (endDate?: string | null): number | null => {
  if (!endDate) {
    return null;
  }

  const normalizedValue = endDate.replace(/\.(\d{3})\d+/, ".$1");
  const expirationDate = new Date(normalizedValue);

  if (Number.isNaN(expirationDate.getTime())) {
    return null;
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const remainingMilliseconds = expirationDate.getTime() - Date.now();

  return Math.max(0, Math.ceil(remainingMilliseconds / millisecondsPerDay));
};

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="min-h-72 flex items-center justify-center rounded-[2rem] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin" />
        {label}
      </div>
    </div>
  );
}

function FeatureRow({
  enabled,
  label,
}: {
  enabled: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
          enabled
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
            : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
        }`}
      >
        {enabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
      </div>

      <span
        className={
          enabled
            ? "font-semibold text-slate-700 dark:text-slate-200"
            : "text-slate-400 line-through dark:text-slate-500"
        }
      >
        {label}
      </span>
    </div>
  );
}

function PlanFeatureList({ plan }: { plan: PlanResponse }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FeatureRow
        enabled={Boolean(plan.allowDocumentUpload)}
        label="Tải tài liệu"
      />
      <FeatureRow enabled={Boolean(plan.allowImageUpload)} label="Tải hình ảnh" />
      <FeatureRow enabled={Boolean(plan.allowVideoUpload)} label="Tải video" />
      <FeatureRow enabled={Boolean(plan.allowAudioUpload)} label="Tải âm thanh" />
    </div>
  );
}

export function SubscriptionDashboard() {
  const [activeTab, setActiveTab] = useState<SubscriptionTab>("overview");
  const [subscription, setSubscription] =
    useState<SubscriptionResponse | null>(null);
  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [billingHistory, setBillingHistory] = useState<PaymentHistoryResponse[]>(
    [],
  );

  const [pageLoading, setPageLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");
  const [billingError, setBillingError] = useState("");
  const [creatingPlanCode, setCreatingPlanCode] = useState("");

  const loadSubscriptionAndPlans = useCallback(
    async (showRefreshState = false): Promise<void> => {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setPageLoading(true);
      }

      setPageError("");

      try {
        const [subscriptionResponse, plansResponse] = await Promise.all([
          subscriptionApi.getCurrentSubscription(),
          subscriptionApi.getActivePlans(),
        ]);

        setSubscription(subscriptionResponse.data);

        const activePlans = Array.isArray(plansResponse.data)
          ? plansResponse.data
          : [];

        setPlans(
          [...activePlans].sort((firstPlan, secondPlan) => {
            return toSafeNumber(firstPlan.price) - toSafeNumber(secondPlan.price);
          }),
        );
      } catch (error) {
        console.error("Load subscription information failed:", error);

        const message = getErrorMessage(
          error,
          "Không thể tải thông tin gói đăng ký.",
        );

        setPageError(message);
        toast.error(message);
      } finally {
        setPageLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  const loadBillingHistory = useCallback(async (): Promise<void> => {
    setBillingLoading(true);
    setBillingError("");

    try {
      const response = await getPaymentHistoryApi();
      const paymentHistory = Array.isArray(response.data) ? response.data : [];

      setBillingHistory(
        [...paymentHistory].sort((firstPayment, secondPayment) => {
          const firstDate = new Date(getPaymentDate(firstPayment) || 0).getTime();
          const secondDate = new Date(getPaymentDate(secondPayment) || 0).getTime();

          return secondDate - firstDate;
        }),
      );
    } catch (error) {
      console.error("Load payment history failed:", error);

      const message = getErrorMessage(
        error,
        "Không thể tải lịch sử thanh toán.",
      );

      setBillingError(message);
      toast.error(message);
    } finally {
      setBillingLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubscriptionAndPlans();
    void loadBillingHistory();
  }, [loadBillingHistory, loadSubscriptionAndPlans]);

  const currentPlan = subscription?.plan || null;
  const currentPlanCode = normalizeCode(currentPlan?.code);
  const currentStatus = normalizeCode(subscription?.status);
  const isCurrentSubscriptionActive = currentStatus === "ACTIVE";
  const remainingDays = getRemainingDays(subscription?.endDate);

  const paidPlans = useMemo(() => {
    return plans.filter((plan) => toSafeNumber(plan.price) > 0);
  }, [plans]);

  const preferredUpgradePlan = useMemo(() => {
    return (
      paidPlans.find((plan) => normalizeCode(plan.code) === "PRO") ||
      paidPlans[0] ||
      null
    );
  }, [paidPlans]);

  const latestPayment = billingHistory[0] || null;

  const handleRefreshAll = async (): Promise<void> => {
    await Promise.all([
      loadSubscriptionAndPlans(true),
      loadBillingHistory(),
    ]);
  };

  const handleCreatePayment = async (planCode: string): Promise<void> => {
    const normalizedPlanCode = normalizeCode(planCode);

    if (!normalizedPlanCode) {
      toast.error("Không xác định được mã gói thanh toán.");
      return;
    }

    try {
      setCreatingPlanCode(normalizedPlanCode);

      const response = await createVnpayPaymentApi(normalizedPlanCode);
      const paymentUrl = response.data?.paymentUrl;

      if (!paymentUrl) {
        toast.error("Backend không trả về đường dẫn thanh toán VNPAY.");
        return;
      }

      window.location.assign(paymentUrl);
    } catch (error) {
      console.error("Create VNPAY payment failed:", error);

      toast.error(
        getErrorMessage(
          error,
          "Không thể tạo thanh toán. Hãy đăng nhập lại rồi thử tiếp.",
        ),
      );
    } finally {
      setCreatingPlanCode("");
    }
  };

  if (pageLoading) {
    return <LoadingPanel label="Đang tải thông tin gói đăng ký..." />;
  }

  if (pageError && !subscription) {
    return (
      <div className="min-h-80 flex flex-col items-center justify-center rounded-[2rem] border border-red-200 bg-red-50 p-8 text-center dark:border-red-500/30 dark:bg-red-500/10">
        <AlertCircle className="w-12 h-12 text-red-500" />

        <h2 className="mt-4 text-xl font-extrabold text-red-700 dark:text-red-300">
          Không thể tải trang Subscription
        </h2>

        <p className="mt-2 max-w-2xl text-sm text-red-600 dark:text-red-300">
          {pageError}
        </p>

        <button
          type="button"
          onClick={() => void loadSubscriptionAndPlans()}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
        >
          <RefreshCw className="w-4 h-4" />
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Subscription
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Thông tin gói, giới hạn và lịch sử thanh toán từ API hệ thống.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleRefreshAll()}
            disabled={refreshing || billingLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Làm mới
          </button>

          {preferredUpgradePlan && (
            <button
              type="button"
              onClick={() => void handleCreatePayment(preferredUpgradePlan.code)}
              disabled={Boolean(creatingPlanCode)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingPlanCode === normalizeCode(preferredUpgradePlan.code) ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : currentPlanCode === normalizeCode(preferredUpgradePlan.code) ? (
                <Clock3 className="w-4 h-4" />
              ) : (
                <Zap className="w-4 h-4" />
              )}

              {creatingPlanCode === normalizeCode(preferredUpgradePlan.code)
                ? "Đang tạo thanh toán..."
                : currentPlanCode === normalizeCode(preferredUpgradePlan.code)
                  ? `Gia hạn ${preferredUpgradePlan.name}`
                  : `Nâng cấp ${preferredUpgradePlan.name}`}
            </button>
          )}
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-7 text-white shadow-xl shadow-blue-500/15 md:p-9">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-white/5" />

        <div className="relative grid grid-cols-1 gap-7 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-widest text-white/75">
              <Crown className="w-5 h-5" />
              Gói hiện tại
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h2 className="text-4xl font-extrabold">
                {currentPlan?.name || "Chưa có gói"}
              </h2>

              {currentPlanCode && (
                <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-extrabold tracking-widest">
                  {currentPlanCode}
                </span>
              )}
            </div>

            <p className="mt-3 max-w-xl text-sm leading-6 text-white/80">
              {currentPlan?.description ||
                "Thông tin gói được lấy từ GET /api/subscriptions/current."}
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-xs font-extrabold uppercase tracking-widest text-white/65">
              Trạng thái
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${
                  isCurrentSubscriptionActive
                    ? "bg-emerald-300 animate-pulse"
                    : "bg-amber-300"
                }`}
              />
              <span className="text-xl font-extrabold">
                {getStatusLabel(subscription?.status)}
              </span>
            </div>

            <p className="mt-3 text-sm text-white/70">
              Bắt đầu: {formatDate(subscription?.startDate)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-xs font-extrabold uppercase tracking-widest text-white/65">
              Thời hạn
            </p>

            <p className="mt-3 text-xl font-extrabold">
              {formatDate(subscription?.endDate)}
            </p>

            <p className="mt-3 text-sm text-white/70">
              {remainingDays === null
                ? "Gói hiện tại không có ngày hết hạn."
                : `${formatNumber(remainingDays)} ngày còn lại`}
            </p>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-700">
        {(
          [
            ["overview", "Tổng quan"],
            ["plans", "Các gói"],
            ["billing", "Lịch sử thanh toán"],
          ] as Array<[SubscriptionTab, string]>
        ).map(([tab, label]) => (
          <button
            type="button"
            key={tab}
            onClick={() => {
              setActiveTab(tab);

              if (tab === "billing") {
                void loadBillingHistory();
              }
            }}
            className={`-mb-px whitespace-nowrap border-b-2 px-5 py-3 text-sm font-bold transition ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && currentPlan && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Giới hạn lưu trữ",
                value: formatStorage(currentPlan.storageLimitMb),
                icon: HardDrive,
                className:
                  "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
              },
              {
                label: "Dung lượng mỗi file",
                value: formatStorage(currentPlan.maxUploadSizePerFileMb),
                icon: Upload,
                className:
                  "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
              },
              {
                label: "Token AI mỗi ngày",
                value: formatNumber(currentPlan.dailyTokenLimit),
                icon: Bot,
                className:
                  "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300",
              },
              {
                label: "Giá gói",
                value:
                  toSafeNumber(currentPlan.price) > 0
                    ? formatCurrency(currentPlan.price)
                    : "Miễn phí",
                icon: WalletCards,
                className:
                  "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.className}`}
                >
                  <item.icon className="w-5 h-5" />
                </div>

                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {item.label}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center dark:bg-blue-500/10 dark:text-blue-300">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Quyền lợi của gói
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Dữ liệu trực tiếp từ cấu hình plan của backend.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <PlanFeatureList plan={currentPlan} />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Document upload
                    </p>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {currentPlan.allowDocumentUpload ? "Cho phép" : "Không cho phép"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Subscription status
                    </p>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {getStatusLabel(subscription?.status)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Thanh toán gần nhất
                  </h3>
                </div>

                <ReceiptText className="w-6 h-6 text-slate-400" />
              </div>

              {billingLoading ? (
                <div className="min-h-52 flex items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                  <RefreshCw className="mr-2 w-4 h-4 animate-spin" />
                  Đang tải...
                </div>
              ) : latestPayment ? (
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Mã đơn hàng
                        </p>
                        <p className="mt-1 break-all font-extrabold text-slate-900 dark:text-white">
                          {getPaymentOrderCode(latestPayment, 0)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-extrabold ${getPaymentStatusClass(
                          latestPayment.status,
                        )}`}
                      >
                        {getPaymentStatusLabel(latestPayment.status)}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Gói
                        </p>
                        <p className="mt-1 font-bold text-slate-900 dark:text-white">
                          {latestPayment.planName ||
                            latestPayment.planCode ||
                            "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Số tiền
                        </p>
                        <p className="mt-1 font-extrabold text-slate-900 dark:text-white">
                          {formatCurrency(latestPayment.amount)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Thời gian: {formatDateTime(getPaymentDate(latestPayment))}
                  </p>
                </div>
              ) : (
                <div className="min-h-52 flex flex-col items-center justify-center text-center">
                  <ReceiptText className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                  <p className="mt-3 font-bold text-slate-700 dark:text-slate-200">
                    Chưa có lịch sử thanh toán
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Các giao dịch VNPAY sẽ xuất hiện tại đây.
                  </p>
                </div>
              )}
            </section>
          </div>
        </motion.div>
      )}

      {activeTab === "plans" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 gap-6 xl:grid-cols-2"
        >
          {plans.map((plan) => {
            const planCode = normalizeCode(plan.code);
            const isCurrentPlan = planCode === currentPlanCode;
            const isPaidPlan = toSafeNumber(plan.price) > 0;
            const isCreatingThisPlan = creatingPlanCode === planCode;

            return (
              <section
                key={plan.id || plan.code}
                className={`relative overflow-hidden rounded-[2rem] border bg-white p-6 shadow-sm dark:bg-slate-900 ${
                  isCurrentPlan
                    ? "border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/40"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute right-5 top-5 rounded-full bg-blue-600 px-3 py-1 text-xs font-extrabold text-white">
                    Gói hiện tại
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      isPaidPlan
                        ? "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {isPaidPlan ? (
                      <Crown className="w-6 h-6" />
                    ) : (
                      <PackageCheck className="w-6 h-6" />
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {planCode || "PLAN"}
                    </p>
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                      {plan.name}
                    </h3>
                  </div>
                </div>

                <div className="mt-6 flex items-end gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {isPaidPlan ? formatCurrency(plan.price) : "Miễn phí"}
                  </span>
                </div>

                <p className="mt-3 min-h-12 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {plan.description || "Không có mô tả cho gói này."}
                </p>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                    <HardDrive className="w-4 h-4 text-blue-500" />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Storage
                    </p>
                    <p className="font-extrabold text-slate-900 dark:text-white">
                      {formatStorage(plan.storageLimitMb)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                    <Upload className="w-4 h-4 text-emerald-500" />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      File size
                    </p>
                    <p className="font-extrabold text-slate-900 dark:text-white">
                      {formatStorage(plan.maxUploadSizePerFileMb)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                    <Bot className="w-4 h-4 text-violet-500" />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Tokens/day
                    </p>
                    <p className="font-extrabold text-slate-900 dark:text-white">
                      {formatNumber(plan.dailyTokenLimit)}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <PlanFeatureList plan={plan} />
                </div>

                <button
                  type="button"
                  onClick={() => void handleCreatePayment(plan.code)}
                  disabled={
                    Boolean(creatingPlanCode) ||
                    (!isPaidPlan && !isCurrentPlan) ||
                    (isCurrentPlan && !isPaidPlan)
                  }
                  className={`mt-7 w-full rounded-2xl px-5 py-3 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isCurrentPlan && !isPaidPlan
                      ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      : isCurrentPlan
                        ? "bg-violet-600 text-white hover:bg-violet-700"
                        : isPaidPlan
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {isCreatingThisPlan
                    ? "Đang tạo thanh toán..."
                    : isCurrentPlan && isPaidPlan
                      ? `Gia hạn ${plan.name}`
                      : isCurrentPlan
                        ? "Đang sử dụng"
                        : isPaidPlan
                          ? `Chọn ${plan.name}`
                          : "Không hỗ trợ hạ gói"}
                </button>
              </section>
            );
          })}

          {plans.length === 0 && (
            <div className="xl:col-span-2 min-h-72 flex items-center justify-center rounded-[2rem] border border-dashed border-slate-300 bg-white text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              API chưa trả về gói đang hoạt động.
            </div>
          )}
        </motion.div>
      )}

      {activeTab === "billing" && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Lịch sử thanh toán
              </h2>
            </div>

            <button
              type="button"
              onClick={() => void loadBillingHistory()}
              disabled={billingLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <RefreshCw
                className={`w-4 h-4 ${billingLoading ? "animate-spin" : ""}`}
              />
              Làm mới
            </button>
          </div>

          {billingError && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle className="mt-0.5 w-5 h-5 shrink-0" />
              <p className="text-sm font-semibold">{billingError}</p>
            </div>
          )}

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="px-4 py-3">Mã đơn hàng</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Gói</th>
                  <th className="px-4 py-3">Số ngày</th>
                  <th className="px-4 py-3">Nhà cung cấp</th>
                  <th className="px-4 py-3 text-right">Số tiền</th>
                  <th className="px-4 py-3 text-right">Trạng thái</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {billingLoading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-500 dark:text-slate-400"
                    >
                      <RefreshCw className="mx-auto mb-3 w-5 h-5 animate-spin" />
                      Đang tải lịch sử thanh toán...
                    </td>
                  </tr>
                )}

                {!billingLoading && billingHistory.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-500 dark:text-slate-400"
                    >
                      <ReceiptText className="mx-auto mb-3 w-9 h-9 text-slate-300 dark:text-slate-600" />
                      Chưa có giao dịch thanh toán.
                    </td>
                  </tr>
                )}

                {!billingLoading &&
                  billingHistory.map((payment, index) => (
                    <tr
                      key={getPaymentOrderCode(payment, index)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <ReceiptText className="w-4 h-4 text-slate-400" />
                          <span className="max-w-48 truncate font-bold text-slate-900 dark:text-white">
                            {getPaymentOrderCode(payment, index)}
                          </span>
                        </div>
                        {payment.transactionNo && (
                          <p className="mt-1 text-xs text-slate-400">
                            Transaction: {payment.transactionNo}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                        {formatDateTime(getPaymentDate(payment))}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {payment.planName || payment.planCode || "—"}
                        </p>
                        {payment.planCode && (
                          <p className="text-xs text-slate-400">
                            {payment.planCode}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                        {payment.purchasedDays
                          ? `${formatNumber(payment.purchasedDays)} ngày`
                          : "—"}
                      </td>

                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                        {payment.provider || "VNPAY"}
                      </td>

                      <td className="px-4 py-4 text-right font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(payment.amount)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${getPaymentStatusClass(
                            payment.status,
                          )}`}
                        >
                          {getPaymentStatusLabel(payment.status)}
                        </span>

                        {payment.failureReason && (
                          <p className="mt-1 max-w-56 text-right text-xs text-red-500">
                            {payment.failureReason}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <ShieldCheck className="mt-0.5 w-5 h-5 shrink-0 text-emerald-500" />
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                Thanh toán được xử lý qua VNPAY
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Frontend không lưu thông tin ngân hàng. Trạng thái giao dịch được
                lấy từ backend.
              </p>
            </div>
          </div>
        </motion.section>
      )}

      <section className="grid grid-cols-2 gap-3 rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-4">
        {[
          {
            icon: FileText,
            label: "Document",
            enabled: currentPlan?.allowDocumentUpload,
          },
          {
            icon: FileImage,
            label: "Image",
            enabled: currentPlan?.allowImageUpload,
          },
          {
            icon: Video,
            label: "Video",
            enabled: currentPlan?.allowVideoUpload,
          },
          {
            icon: Music,
            label: "Audio",
            enabled: currentPlan?.allowAudioUpload,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800"
          >
            <item.icon
              className={`w-5 h-5 ${
                item.enabled ? "text-emerald-500" : "text-slate-400"
              }`}
            />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {item.label}
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {item.enabled ? "Được phép" : "Không hỗ trợ"}
              </p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}