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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
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

type PaymentReturnView = {
  status: "success" | "failed";
  orderCode: string;
  message: string;
} | null;

const PENDING_PAYMENT_ORDER_CODE_KEY = "pendingPaymentOrderCode";

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
  return Math.floor(toSafeNumber(value)).toLocaleString("en-US");
};

const formatCurrency = (value?: number | string | null): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(toSafeNumber(value));
};

const formatDate = (value?: string | null): string => {
  if (!value) {
    return "No expiration";
  }

  const normalizedValue = value.replace(/\.(\d{3})\d+/, ".$1");
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
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

  return date.toLocaleString("en-US", {
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
    return "Active";
  }

  if (normalizedStatus === "EXPIRED") {
    return "Expired";
  }

  if (normalizedStatus === "CANCELLED") {
    return "Cancelled";
  }

  return status || "Unknown";
};

const getPaymentStatusLabel = (status?: string | null): string => {
  const normalizedStatus = normalizeCode(status);

  if (normalizedStatus === "SUCCESS" || normalizedStatus === "PAID") {
    return "Successful";
  }

  if (normalizedStatus === "PENDING") {
    return "Pending";
  }

  if (normalizedStatus === "FAILED") {
    return "Failed";
  }

  if (normalizedStatus === "CANCELLED") {
    return "Cancelled";
  }

  return status || "Unknown";
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
        label="Document uploads"
      />
      <FeatureRow
        enabled={Boolean(plan.allowImageUpload)}
        label="Image uploads"
      />
      <FeatureRow
        enabled={Boolean(plan.allowVideoUpload)}
        label="Video uploads"
      />
      <FeatureRow
        enabled={Boolean(plan.allowAudioUpload)}
        label="Audio uploads"
      />
    </div>
  );
}


function PaymentResultPanel({
  result,
  onConfirm,
}: {
  result: Exclude<PaymentReturnView, null>;
  onConfirm: () => void;
}) {
  const isSuccess = result.status === "success";

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20"
      >
        <div
          className={`h-2 w-full ${
            isSuccess ? "bg-emerald-500" : "bg-red-500"
          }`}
        />

        <div className="p-8 text-center sm:p-10">
          <div
            className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${
              isSuccess
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300"
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="h-14 w-14" />
            ) : (
              <AlertCircle className="h-14 w-14" />
            )}
          </div>

          <h1 className="mt-6 text-3xl font-extrabold text-slate-900 dark:text-white">
            {isSuccess ? "Payment successful!" : "Payment failed"}
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            {isSuccess
              ? "Your payment has been completed and your subscription plan has been updated."
              : "Your payment could not be completed. Please return to the Subscription page and try again."}
          </p>

          {result.orderCode && (
            <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-left dark:border-slate-700 dark:bg-slate-800/70">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Order code
              </p>
              <p className="mt-1 break-all font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
                {result.orderCode}
              </p>
            </div>
          )}

          {result.message && (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              {result.message}
            </p>
          )}

          <button
            type="button"
            onClick={onConfirm}
            className={`mt-8 inline-flex min-w-40 items-center justify-center rounded-xl px-8 py-3 text-sm font-extrabold text-white shadow-lg transition ${
              isSuccess
                ? "bg-emerald-600 shadow-emerald-500/20 hover:bg-emerald-700"
                : "bg-red-600 shadow-red-500/20 hover:bg-red-700"
            }`}
          >
            OK
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function SubscriptionDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const paymentReturnHandledRef = useRef(false);

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
  const [paymentReturn, setPaymentReturn] = useState<PaymentReturnView>(null);

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
          "Unable to load subscription information.",
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
        "Unable to load payment history.",
      );

      setBillingError(message);
      toast.error(message);
    } finally {
      setBillingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (paymentReturnHandledRef.current) {
      return;
    }

    paymentReturnHandledRef.current = true;

    const searchParams = new URLSearchParams(location.search);
    const paymentResult = normalizeCode(searchParams.get("payment"));
    const orderCode = searchParams.get("orderCode")?.trim() || "";
    const returnMessage = searchParams.get("message")?.trim() || "";

    const handlePaymentReturn = async (): Promise<void> => {
      if (paymentResult) {
        const pendingOrderCode = sessionStorage.getItem(
          PENDING_PAYMENT_ORDER_CODE_KEY,
        );

        if (pendingOrderCode && orderCode && pendingOrderCode !== orderCode) {
          console.warn(
            "Returned payment order code does not match the pending order code.",
            { pendingOrderCode, orderCode },
          );
        }

        sessionStorage.removeItem(PENDING_PAYMENT_ORDER_CODE_KEY);

        setPaymentReturn({
          status: paymentResult === "SUCCESS" ? "success" : "failed",
          orderCode,
          message: returnMessage,
        });
      }

      await Promise.all([
        loadSubscriptionAndPlans(),
        loadBillingHistory(),
      ]);
    };

    void handlePaymentReturn();
  }, [
    loadBillingHistory,
    loadSubscriptionAndPlans,
    location.search,
  ]);

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
      toast.error("Unable to determine the selected plan code.");
      return;
    }

    try {
      setCreatingPlanCode(normalizedPlanCode);

      const response = await createVnpayPaymentApi(normalizedPlanCode);
      const paymentUrl = response.data?.paymentUrl;
      const orderCode = response.data?.orderCode?.trim();

      if (!paymentUrl) {
        sessionStorage.removeItem(PENDING_PAYMENT_ORDER_CODE_KEY);
        toast.error("The backend did not return a VNPAY payment URL.");
        return;
      }

      if (orderCode) {
        sessionStorage.setItem(PENDING_PAYMENT_ORDER_CODE_KEY, orderCode);
      } else {
        sessionStorage.removeItem(PENDING_PAYMENT_ORDER_CODE_KEY);
      }

      window.location.assign(paymentUrl);
    } catch (error) {
      console.error("Create VNPAY payment failed:", error);

      toast.error(
        getErrorMessage(
          error,
          "Unable to create the payment. Please sign in again and try again.",
        ),
      );
    } finally {
      setCreatingPlanCode("");
    }
  };

  const handlePaymentResultConfirm = (): void => {
    sessionStorage.removeItem(PENDING_PAYMENT_ORDER_CODE_KEY);
    setPaymentReturn(null);
    navigate(location.pathname, { replace: true });
  };

  if (paymentReturn) {
    return (
      <PaymentResultPanel
        result={paymentReturn}
        onConfirm={handlePaymentResultConfirm}
      />
    );
  }

  if (pageLoading) {
    return <LoadingPanel label="Loading subscription information..." />;
  }

  if (pageError && !subscription) {
    return (
      <div className="min-h-80 flex flex-col items-center justify-center rounded-[2rem] border border-red-200 bg-red-50 p-8 text-center dark:border-red-500/30 dark:bg-red-500/10">
        <AlertCircle className="w-12 h-12 text-red-500" />

        <h2 className="mt-4 text-xl font-extrabold text-red-700 dark:text-red-300">
          Unable to load the Subscription page
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
          Try again
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
            Plan details, usage limits, and payment history from the system API.
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
            Refresh
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
                ? "Creating payment..."
                : currentPlanCode === normalizeCode(preferredUpgradePlan.code)
                  ? `Renew ${preferredUpgradePlan.name}`
                  : `Upgrade to ${preferredUpgradePlan.name}`}
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
              Current plan
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h2 className="text-4xl font-extrabold">
                {currentPlan?.name || "No plan"}
              </h2>

              {currentPlanCode && (
                <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-extrabold tracking-widest">
                  {currentPlanCode}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-xs font-extrabold uppercase tracking-widest text-white/65">
              Status
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
              Start date: {formatDate(subscription?.startDate)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-xs font-extrabold uppercase tracking-widest text-white/65">
              Expiration
            </p>

            <p className="mt-3 text-xl font-extrabold">
              {formatDate(subscription?.endDate)}
            </p>

            <p className="mt-3 text-sm text-white/70">
              {remainingDays === null
                ? "The current plan does not expire."
                : `${formatNumber(remainingDays)} days remaining`}
            </p>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-700">
        {(
          [
            ["overview", "Overview"],
            ["plans", "Plans"],
            ["billing", "Payment history"],
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
                label: "Storage limit",
                value: formatStorage(currentPlan.storageLimitMb),
                icon: HardDrive,
                className:
                  "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
              },
              {
                label: "Maximum file size",
                value: formatStorage(currentPlan.maxUploadSizePerFileMb),
                icon: Upload,
                className:
                  "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
              },
              {
                label: "Daily AI tokens",
                value: formatNumber(currentPlan.dailyTokenLimit),
                icon: Bot,
                className:
                  "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300",
              },
              {
                label: "Plan price",
                value:
                  toSafeNumber(currentPlan.price) > 0
                    ? formatCurrency(currentPlan.price)
                    : "Free",
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
                    Plan benefits
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Live data from the backend plan configuration.
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
                      {currentPlan.allowDocumentUpload
                        ? "Allowed"
                        : "Not allowed"}
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
                    Latest payment
                  </h3>
                </div>

                <ReceiptText className="w-6 h-6 text-slate-400" />
              </div>

              {billingLoading ? (
                <div className="min-h-52 flex items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                  <RefreshCw className="mr-2 w-4 h-4 animate-spin" />
                  Loading...
                </div>
              ) : latestPayment ? (
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Order code
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
                          Plan
                        </p>
                        <p className="mt-1 font-bold text-slate-900 dark:text-white">
                          {latestPayment.planName ||
                            latestPayment.planCode ||
                            "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Amount
                        </p>
                        <p className="mt-1 font-extrabold text-slate-900 dark:text-white">
                          {formatCurrency(latestPayment.amount)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Date: {formatDateTime(getPaymentDate(latestPayment))}
                  </p>
                </div>
              ) : (
                <div className="min-h-52 flex flex-col items-center justify-center text-center">
                  <ReceiptText className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                  <p className="mt-3 font-bold text-slate-700 dark:text-slate-200">
                    No payment history yet
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    VNPAY transactions will appear here.
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
                    Current plan
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
                    {isPaidPlan ? formatCurrency(plan.price) : "Free"}
                  </span>
                </div>

                <p className="mt-3 min-h-12 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {plan.description || "No description is available for this plan."}
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
                    ? "Creating payment..."
                    : isCurrentPlan && isPaidPlan
                      ? `Renew ${plan.name}`
                      : isCurrentPlan
                        ? "Current plan"
                        : isPaidPlan
                          ? `Choose ${plan.name}`
                          : "Downgrading is not supported"}
                </button>
              </section>
            );
          })}

          {plans.length === 0 && (
            <div className="xl:col-span-2 min-h-72 flex items-center justify-center rounded-[2rem] border border-dashed border-slate-300 bg-white text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              The API did not return any active plans.
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
                Payment history
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
              Refresh
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
                  <th className="px-4 py-3">Order code</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Days</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Status</th>
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
                      Loading payment history...
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
                      No payment transactions yet.
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
                          ? `${formatNumber(payment.purchasedDays)} days`
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
                Payments are processed through VNPAY
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                The frontend does not store banking information. Transaction
                status is retrieved from the backend.
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
                {item.enabled ? "Supported" : "Not supported"}
              </p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}