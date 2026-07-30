import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Cloud,
  CreditCard,
  FileUp,
  HelpCircle,
  LayoutDashboard,
  LogIn,
  RefreshCw,
  ShieldCheck,
  Star,
  X,
  Zap,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
} from "motion/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import {
  getAuthToken,
} from "../../services/apiClient";
import {
  subscriptionApi,
  type PlanResponse,
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

type PlanFeature = {
  label: string;
  included: boolean;
};

const FAQS = [
  {
    question: "Thông tin gói trên trang này lấy từ đâu?",
    answer:
      "Tên gói, giá, dung lượng, giới hạn token và quyền tải tệp được tải trực tiếp từ API GET /api/plans.",
  },
  {
    question: "Thanh toán gói trả phí bằng cách nào?",
    answer:
      "Sau khi đăng nhập, hệ thống gọi API tạo thanh toán VNPAY rồi chuyển bạn đến cổng thanh toán VNPAY.",
  },
  {
    question: "Khi nào tài khoản được nâng cấp?",
    answer:
      "Gói chỉ được cập nhật sau khi backend xác nhận giao dịch VNPAY thành công. Giao dịch thất bại không làm thay đổi gói hiện tại.",
  },
  {
    question: "Mỗi lần mua gói trả phí có thời hạn bao lâu?",
    answer:
      "Luồng thanh toán hiện tại của hệ thống cấp 30 ngày cho mỗi lần mua thành công.",
  },
  {
    question: "Tôi xem lịch sử thanh toán ở đâu?",
    answer:
      "Sau khi đăng nhập, mở trang Subscription trong ứng dụng để xem gói hiện tại và lịch sử thanh toán.",
  },
];

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
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? Math.max(0, parsedValue)
    : 0;
};

const formatNumber = (value: unknown): string => {
  return Math.floor(toSafeNumber(value)).toLocaleString(
    "vi-VN",
  );
};

const formatCurrency = (value: unknown): string => {
  const amount = toSafeNumber(value);

  if (amount <= 0) {
    return "Miễn phí";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatStorage = (value: unknown): string => {
  const storageMb = toSafeNumber(value);

  if (storageMb >= 1024) {
    const storageGb = storageMb / 1024;

    return `${Number.isInteger(storageGb)
      ? storageGb
      : storageGb.toFixed(1)} GB`;
  }

  return `${formatNumber(storageMb)} MB`;
};

const normalizePlanCode = (value?: string): string => {
  return String(value || "")
    .trim()
    .toUpperCase();
};

const createPlanFeatures = (
  plan: PlanResponse,
): PlanFeature[] => {
  const storageLimit = toSafeNumber(plan.storageLimitMb);
  const tokenLimit = toSafeNumber(plan.dailyTokenLimit);
  const fileLimit = toSafeNumber(
    plan.maxUploadSizePerFileMb,
  );

  return [
    {
      label: `${formatStorage(storageLimit)} Cloud Storage`,
      included: storageLimit > 0,
    },
    {
      label: `${formatNumber(tokenLimit)} AI token mỗi ngày`,
      included: tokenLimit > 0,
    },
    {
      label: `Tối đa ${formatNumber(fileLimit)} MB mỗi tệp`,
      included: fileLimit > 0,
    },
    {
      label: "Tải tài liệu",
      included: Boolean(plan.allowDocumentUpload),
    },
    {
      label: "Tải hình ảnh",
      included: Boolean(plan.allowImageUpload),
    },
    {
      label: "Tải video",
      included: Boolean(plan.allowVideoUpload),
    },
    {
      label: "Tải âm thanh",
      included: Boolean(plan.allowAudioUpload),
    },
  ];
};

function PlanIcon({
  planCode,
}: {
  planCode: string;
}) {
  if (planCode === "FREE") {
    return <Star className="w-6 h-6" />;
  }

  if (planCode === "PRO") {
    return <Zap className="w-6 h-6" />;
  }

  return <ShieldCheck className="w-6 h-6" />;
}

export function PricingPage() {
  const navigate = useNavigate();
  const isLoggedIn = Boolean(getAuthToken());

  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [subscription, setSubscription] =
    useState<SubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [processingPlanCode, setProcessingPlanCode] =
    useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const loadPlans = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError("");

    try {
      const plansResponse =
        await subscriptionApi.getActivePlans();

      const activePlans = Array.isArray(plansResponse.data)
        ? [...plansResponse.data]
            .sort(
              (firstPlan, secondPlan) =>
                toSafeNumber(firstPlan.price) -
                toSafeNumber(secondPlan.price),
            )
        : [];

      setPlans(activePlans);

      if (isLoggedIn) {
        try {
          const subscriptionResponse =
            await subscriptionApi.getCurrentSubscription();

          setSubscription(subscriptionResponse.data);
        } catch (error) {
          console.error(
            "Load current subscription failed:",
            error,
          );
        }
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error("Load active plans failed:", error);

      const message = getErrorMessage(
        error,
        "Không thể tải danh sách gói dịch vụ.",
      );

      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const currentPlanCode = useMemo(
    () => normalizePlanCode(subscription?.plan?.code),
    [subscription?.plan?.code],
  );

  const handleSelectPlan = async (
    plan: PlanResponse,
  ): Promise<void> => {
    const planCode = normalizePlanCode(plan.code);
    const isCurrentPlan =
      Boolean(currentPlanCode) && currentPlanCode === planCode;
    const isFreePlan =
      planCode === "FREE" || toSafeNumber(plan.price) <= 0;

    if (isCurrentPlan) {
      navigate("/app/subscription");
      return;
    }

    if (isFreePlan) {
      navigate(isLoggedIn ? "/app/subscription" : "/register");
      return;
    }

    if (!isLoggedIn) {
      sessionStorage.setItem("selectedPlanCode", planCode);
      toast.info("Vui lòng đăng nhập để tiếp tục thanh toán.");
      navigate("/login");
      return;
    }

    if (processingPlanCode) {
      return;
    }

    setProcessingPlanCode(planCode);

    try {
      const response =
        await subscriptionApi.createVnpayPayment(planCode);

      const paymentUrl = response.data?.paymentUrl?.trim();

      if (!paymentUrl) {
        throw new Error(
          "Backend không trả về đường dẫn thanh toán VNPAY.",
        );
      }

      window.location.assign(paymentUrl);
    } catch (error) {
      console.error("Create VNPAY payment failed:", error);

      toast.error(
        getErrorMessage(
          error,
          "Không thể tạo giao dịch thanh toán.",
        ),
      );
    } finally {
      setProcessingPlanCode("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-extrabold text-white">
              A
            </div>
            <span className="font-extrabold text-slate-900 dark:text-white">
              AI Study Hub
            </span>
          </button>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => navigate("/app/subscription")}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                <LayoutDashboard className="w-4 h-4" />
                Subscription
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-700 transition hover:text-blue-600 dark:text-slate-300"
                >
                  <LogIn className="w-4 h-4" />
                  Đăng nhập
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  Đăng ký
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-16">
        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
            <Zap className="w-4 h-4" />
            Dữ liệu gói được tải từ hệ thống
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            Chọn gói phù hợp với việc học của bạn
          </h1>

          <p className="mt-5 text-lg leading-8 text-slate-500 dark:text-slate-400">
            Giá, dung lượng và giới hạn AI bên dưới được lấy trực
            tiếp từ API. Gói trả phí được thanh toán qua VNPAY.
          </p>
        </section>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center">
            <div className="flex items-center gap-3 font-semibold text-slate-500 dark:text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
              Đang tải danh sách gói...
            </div>
          </div>
        ) : loadError ? (
          <div className="mx-auto mt-12 max-w-xl rounded-[2rem] border border-red-200 bg-red-50 p-8 text-center dark:border-red-500/30 dark:bg-red-500/10">
            <p className="font-bold text-red-700 dark:text-red-300">
              {loadError}
            </p>
            <button
              type="button"
              onClick={() => void loadPlans()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700"
            >
              <RefreshCw className="w-4 h-4" />
              Tải lại
            </button>
          </div>
        ) : plans.length === 0 ? (
          <div className="mx-auto mt-12 max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            Hiện chưa có gói nào đang hoạt động.
          </div>
        ) : (
          <section
            className={`mt-14 grid gap-7 ${
              plans.length === 1
                ? "mx-auto max-w-md grid-cols-1"
                : plans.length === 2
                  ? "mx-auto max-w-4xl grid-cols-1 md:grid-cols-2"
                  : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
            }`}
          >
            {plans.map((plan, index) => {
              const planCode = normalizePlanCode(plan.code);
              const isCurrentPlan =
                Boolean(currentPlanCode) &&
                currentPlanCode === planCode;
              const isPaid = toSafeNumber(plan.price) > 0;
              const isProcessing =
                processingPlanCode === planCode;
              const features = createPlanFeatures(plan);

              return (
                <motion.article
                  key={plan.id || planCode}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className={`relative flex flex-col rounded-[2rem] border-2 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900 ${
                    isCurrentPlan
                      ? "border-emerald-500 shadow-emerald-100/60 dark:shadow-none"
                      : planCode === "PRO"
                        ? "border-blue-500 shadow-blue-100/60 dark:shadow-none"
                        : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {(isCurrentPlan || planCode === "PRO") && (
                    <div
                      className={`absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-white ${
                        isCurrentPlan ? "bg-emerald-600" : "bg-blue-600"
                      }`}
                    >
                      {isCurrentPlan ? "Gói hiện tại" : "Gói trả phí"}
                    </div>
                  )}

                  <div
                    className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${
                      planCode === "FREE"
                        ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        : planCode === "PRO"
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                          : "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"
                    }`}
                  >
                    <PlanIcon planCode={planCode} />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                        {planCode || "PLAN"}
                      </p>
                      <h2 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
                        {plan.name || planCode}
                      </h2>
                    </div>

                    {plan.isActive !== false && (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                        Đang hoạt động
                      </span>
                    )}
                  </div>

                  <p className="mt-3 min-h-12 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {plan.description ||
                      "Gói học tập do hệ thống cung cấp."}
                  </p>

                  <div className="mt-6 border-b border-slate-100 pb-6 dark:border-slate-800">
                    <p className="text-4xl font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(plan.price)}
                    </p>
                    {isPaid && (
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        cho 30 ngày sử dụng
                      </p>
                    )}
                  </div>

                  <div className="mt-6 flex-1 space-y-3">
                    {features.map((feature) => (
                      <div
                        key={feature.label}
                        className="flex items-start gap-3"
                      >
                        <div
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                            feature.included
                              ? "bg-emerald-50 dark:bg-emerald-500/10"
                              : "bg-slate-100 dark:bg-slate-800"
                          }`}
                        >
                          {feature.included ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <X className="w-3 h-3 text-slate-400" />
                          )}
                        </div>

                        <span
                          className={`text-sm ${
                            feature.included
                              ? "text-slate-700 dark:text-slate-300"
                              : "text-slate-400 line-through dark:text-slate-500"
                          }`}
                        >
                          {feature.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSelectPlan(plan)}
                    disabled={Boolean(processingPlanCode)}
                    className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      isCurrentPlan
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : isPaid
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
                          : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Đang tạo thanh toán...
                      </>
                    ) : isCurrentPlan ? (
                      <>
                        Xem gói hiện tại
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : isPaid ? (
                      <>
                        {isLoggedIn
                          ? `Chọn ${plan.name}`
                          : "Đăng nhập để mua"}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        {isLoggedIn
                          ? "Xem gói của tôi"
                          : "Bắt đầu miễn phí"}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </motion.article>
              );
            })}
          </section>
        )}

        <section className="mt-16 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <Cloud className="w-5 h-5 text-blue-600" />
            <h3 className="mt-3 font-extrabold text-slate-900 dark:text-white">
              Dung lượng theo gói
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Giới hạn Cloud Storage được lấy từ trường
              storageLimitMb của API.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <Bot className="w-5 h-5 text-violet-600" />
            <h3 className="mt-3 font-extrabold text-slate-900 dark:text-white">
              Token AI mỗi ngày
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Giới hạn token hiển thị theo dailyTokenLimit do backend
              trả về.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            <h3 className="mt-3 font-extrabold text-slate-900 dark:text-white">
              Thanh toán VNPAY
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Frontend không thu thập thông tin thẻ; người dùng được
              chuyển đến cổng VNPAY.
            </p>
          </div>
        </section>

        <section className="mx-auto mt-20 max-w-3xl">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h2 className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-white">
              Câu hỏi thường gặp
            </h2>
          </div>

          <div className="mt-8 space-y-3">
            {FAQS.map((faq, index) => (
              <div
                key={faq.question}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenFaq(openFaq === index ? null : index)
                  }
                  className="flex w-full items-center justify-between p-5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span className="pr-4 font-bold text-slate-900 dark:text-white">
                    {faq.question}
                  </span>

                  {openFaq === index ? (
                    <ChevronUp className="w-5 h-5 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 shrink-0 text-slate-400" />
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm leading-7 text-slate-500 dark:text-slate-400">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-[2rem] bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white md:flex md:items-center md:justify-between md:gap-8">
          <div>
            <FileUp className="w-7 h-7" />
            <h2 className="mt-4 text-2xl font-extrabold">
              Bắt đầu với AI Study Hub
            </h2>
            <p className="mt-2 text-white/75">
              Tạo tài khoản để nhận gói miễn phí hoặc đăng nhập để
              mua gói trả phí qua VNPAY.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(isLoggedIn ? "/app/subscription" : "/register")
            }
            className="mt-6 inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-6 py-3.5 font-extrabold text-blue-700 transition hover:bg-blue-50 md:mt-0"
          >
            {isLoggedIn ? "Quản lý gói" : "Đăng ký miễn phí"}
            <ArrowRight className="w-5 h-5" />
          </button>
        </section>
      </main>
    </div>
  );
}
