import {
  Zap,
  Calendar,
  Download,
  CheckCircle2,
  Receipt,
  Trash2,
  Plus,
  Shield,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  createVnpayPaymentApi,
  getPaymentHistoryApi,
  PaymentHistoryResponse,
} from "../../services/paymentApi";

const usageData = [
  { month: "Jan", ai: 45, uploads: 12 },
  { month: "Feb", ai: 72, uploads: 18 },
  { month: "Mar", ai: 89, uploads: 25 },
  { month: "Apr", ai: 134, uploads: 31 },
  { month: "May", ai: 112, uploads: 22 },
  { month: "Jun", ai: 198, uploads: 40 },
];

const paymentMethods = [
  { id: 1, type: "vnpay", last4: "VNPAY", expiry: "N/A", isDefault: true },
];

const formatCurrency = (value?: number | string | null) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getStatusLabel = (status?: string) => {
  const normalized = status?.toUpperCase();

  if (normalized === "SUCCESS") return "Paid";
  if (normalized === "PAID") return "Paid";
  if (normalized === "PENDING") return "Pending";
  if (normalized === "FAILED") return "Failed";
  if (normalized === "CANCELLED") return "Cancelled";

  return status || "-";
};

const getStatusClass = (status?: string) => {
  const normalized = status?.toUpperCase();

  if (normalized === "SUCCESS" || normalized === "PAID") {
    return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  }

  if (normalized === "PENDING") {
    return "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-300";
  }

  if (normalized === "FAILED" || normalized === "CANCELLED") {
    return "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300";
  }

  return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300";
};

const getPaymentDate = (payment: PaymentHistoryResponse) => {
  return payment.paymentTime || payment.createdAt || null;
};

const getPaymentPlan = (payment: PaymentHistoryResponse) => {
  return (
    payment.planName ||
    payment.planCode ||
    "Subscription Plan"
  );
};

const getPaymentOrderCode = (
  payment: PaymentHistoryResponse,
  index: number,
) => {
  return (
    payment.orderCode ||
    payment.transactionNo ||
    `PAYMENT-${index + 1}`
  );
};

const CardBrand = ({ type }: { type: string }) => {
  if (type === "vnpay") {
    return (
      <div className="w-12 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
        <span className="text-white text-[10px] font-extrabold tracking-wider">
          VNPAY
        </span>
      </div>
    );
  }

  const brands: Record<string, string> = {
    visa: "VISA",
    mastercard: "MC",
  };

  const colors: Record<string, string> = {
    visa: "from-blue-600 to-blue-800",
    mastercard: "from-red-500 to-orange-500",
  };

  return (
    <div
      className={`w-12 h-8 rounded-lg bg-gradient-to-r ${
        colors[type] || "from-slate-600 to-slate-800"
      } flex items-center justify-center`}
    >
      <span className="text-white text-xs font-extrabold tracking-wider">
        {brands[type] || "CARD"}
      </span>
    </div>
  );
};

export function SubscriptionDashboard() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "billing" | "payment"
  >("overview");

  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [billingHistory, setBillingHistory] = useState<
    PaymentHistoryResponse[]
  >([]);
  const [billingLoading, setBillingLoading] = useState(false);

  const fetchBillingHistory = async () => {
    try {
      setBillingLoading(true);

      const res = await getPaymentHistoryApi();

      setBillingHistory(res.data || []);
    } catch (error) {
      console.error("Load payment history failed:", error);
      toast.error("Cannot load payment history");
    } finally {
      setBillingLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingHistory();
  }, []);

  const handleUpgradePayment = async () => {
    try {
      setIsCreatingPayment(true);

      const res = await createVnpayPaymentApi("PRO");
      const paymentUrl = res.data?.paymentUrl;

      if (!paymentUrl) {
        toast.error("Không tạo được link thanh toán VNPAY");
        return;
      }

      window.location.href = paymentUrl;
    } catch (error: any) {
      console.error("Create VNPAY payment failed:", error);

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Không thể tạo thanh toán. Hãy đăng nhập lại rồi thử tiếp.";

      toast.error(message);
    } finally {
      setIsCreatingPayment(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Subscription
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage your plan, billing, and payment methods
          </p>
        </div>

        <button
          onClick={handleUpgradePayment}
          disabled={isCreatingPayment}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Zap className="w-4 h-4" />
          {isCreatingPayment ? "Creating Payment..." : "Upgrade Plan"}
        </button>
      </div>

      <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-[2rem] p-8 text-white overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-wider opacity-80">
                Current Plan
              </span>
            </div>
            <h2 className="text-3xl font-extrabold mb-1">Subscription</h2>
            <p className="opacity-80">
              Upgrade with VNPAY to activate Pro plan
            </p>
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-wider opacity-80 mb-3">
              Payment Method
            </p>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-5 h-5" />
              <span className="text-xl font-extrabold">VNPAY Sandbox</span>
            </div>
            <p className="opacity-80 text-sm">
              Payment history is loaded from backend
            </p>
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-wider opacity-80 mb-3">
              Status
            </p>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xl font-extrabold">Active</span>
            </div>
            <button
              onClick={() => fetchBillingHistory()}
              className="text-sm opacity-60 hover:opacity-100 underline transition-opacity"
            >
              Refresh billing history
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
        {(["overview", "billing", "payment"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);

              if (tab === "billing") {
                fetchBillingHistory();
              }
            }}
            className={`px-5 py-3 font-bold text-sm capitalize transition-all border-b-2 -mb-px ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {tab === "payment"
              ? "Payment Methods"
              : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
              <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center bg-blue-50 dark:bg-slate-800">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                AI Questions Used
              </p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                198
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                of Unlimited
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
              <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center bg-purple-50 dark:bg-slate-800">
                <Download className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Documents Uploaded
              </p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                40
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                of Unlimited
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
              <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center bg-emerald-50 dark:bg-slate-800">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Storage Used
              </p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                9 GB
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                of 100 GB
              </p>
              <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-emerald-500"
                  style={{ width: "9%" }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">
              Usage Over Time
            </h2>

            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={usageData}>
                <defs>
                  <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="uploadGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #E2E8F0",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="ai"
                  name="AI Questions"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#aiGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="uploads"
                  name="Uploads"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  fill="url(#uploadGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">
              Your Pro Features
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                "100 GB Cloud Storage",
                "Unlimited AI Questions",
                "Unlimited Document Uploads",
                "Advanced AI Summaries",
                "Unlimited Quiz Generations",
                "Priority AI Processing",
                "Citation References",
                "Export to PDF & DOCX",
                "Advanced Analytics",
                "Priority Support",
              ].map((feat) => (
                <div
                  key={feat}
                  className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {feat}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "billing" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Billing History
              </h2>

              <button
                onClick={() => fetchBillingHistory()}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
              >
                <Download className="w-4 h-4" /> Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-50 dark:bg-slate-800">
                    <th className="px-4 py-2">Invoice</th>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Plan</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {billingLoading && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                      >
                        Loading billing history...
                      </td>
                    </tr>
                  )}

                  {!billingLoading && billingHistory.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                      >
                        No payment history yet.
                      </td>
                    </tr>
                  )}

                  {!billingLoading &&
                    billingHistory.map((inv, index) => (
                      <tr
                        key={getPaymentOrderCode(inv, index)}
                        className="group bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <td className="px-4 py-3 rounded-l-2xl">
                          <div className="flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                              {getPaymentOrderCode(inv, index)}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                          {formatDate(getPaymentDate(inv))}
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
                          {getPaymentPlan(inv)}
                        </td>

                        <td className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-white">
                          {formatCurrency(inv.amount)}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg ${getStatusClass(
                              inv.status,
                            )}`}
                          >
                            {getStatusLabel(inv.status)}
                          </span>
                        </td>

                        <td className="px-4 py-3 rounded-r-2xl text-right">
                          <button
                            onClick={() =>
                              toast.info(
                                "PDF invoice API chưa có, hiện chỉ xem lịch sử.",
                              )
                            }
                            className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1 ml-auto"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "payment" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-5"
        >
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Payment Methods
              </h2>

              <button
                onClick={handleUpgradePayment}
                disabled={isCreatingPayment}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                {isCreatingPayment ? "Creating..." : "Pay with VNPAY"}
              </button>
            </div>

            <div className="space-y-3">
              {paymentMethods.map((card) => (
                <div
                  key={card.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                    card.isDefault
                      ? "border-blue-500 bg-blue-50/30 dark:bg-blue-500/10"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <CardBrand type={card.type} />

                    <div>
                      <p className="font-bold text-slate-900 dark:text-white capitalize">
                        {card.type === "vnpay"
                          ? "VNPAY Payment Gateway"
                          : `${card.type} ending in ${card.last4}`}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {card.type === "vnpay"
                          ? "Sandbox payment for Pro upgrade"
                          : `Expires ${card.expiry}`}
                      </p>
                    </div>

                    {card.isDefault && (
                      <span className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg">
                        Default
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        toast.info("VNPAY is currently the default method")
                      }
                      className="text-sm font-semibold text-blue-600 hover:underline"
                    >
                      Active
                    </button>

                    <button
                      onClick={() =>
                        toast.info("Cannot remove VNPAY payment method")
                      }
                      className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex items-center gap-4">
            <Shield className="w-8 h-8 text-slate-500 dark:text-slate-400 shrink-0" />
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-300">
                Your payment information is secure
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Payments are processed through VNPAY sandbox. We do not store
                your banking information.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}