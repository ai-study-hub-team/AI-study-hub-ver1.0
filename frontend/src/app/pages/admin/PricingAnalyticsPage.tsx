import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Coins, CreditCard, RefreshCw, Search, WalletCards, X } from "lucide-react";
import { toast } from "sonner";
import {
  adminAnalyticsApi,
  type AdminActiveUserItem,
  type PaymentHistoryItem,
  type RevenueReportResponse,
  type TokenCostResponse,
  type TokenPricingResponse,
  type TokenUsageReportResponse,
} from "../../services/adminAnalyticsApi";
import { PaginationControls } from "../../components/ui/PaginationControls";

const formatNumber = (value?: number | null) =>
  new Intl.NumberFormat("vi-VN").format(Number(value || 0));

const formatMoney = (value?: number | null) => {
  const amount = Number(value || 0);
  const hasFraction = !Number.isInteger(amount);
  return `${new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 6,
  }).format(amount)} đ`;
};

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "-";

export function PricingAnalyticsPage() {
  const [cost, setCost] = useState<TokenCostResponse | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsageReportResponse | null>(null);
  const [revenue, setRevenue] = useState<RevenueReportResponse | null>(null);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [pricing, setPricing] = useState<TokenPricingResponse | null>(null);
  const [users, setUsers] = useState<AdminActiveUserItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [reportPeriod, setReportPeriod] = useState<"DAY" | "WEEK" | "MONTH">("MONTH");
  const [reportDate, setReportDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [userSearch, setUserSearch] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [editingPrice, setEditingPrice] = useState<{
    field: "inputPricePerMillion" | "outputPricePerMillion";
    label: string;
    value: string;
  } | null>(null);
  const [savingPrice, setSavingPrice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const paginatedPayments = payments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        period: reportPeriod,
        date: reportDate,
        ...(selectedUserId ? { userId: Number(selectedUserId) } : {}),
      };
      const [costResult, usageResult, revenueResult, paymentResult, pricingResult] = await Promise.allSettled([
        adminAnalyticsApi.getTokenCost(params),
        adminAnalyticsApi.getTokenUsage(params),
        adminAnalyticsApi.getRevenue(params),
        adminAnalyticsApi.getPaymentHistory(params),
        adminAnalyticsApi.getTokenPricing(),
      ]);
      if (costResult.status === "fulfilled") {
        setCost(costResult.value.data);
      }
      if (usageResult.status === "fulfilled") {
        setTokenUsage(usageResult.value.data);
      }
      if (revenueResult.status === "fulfilled") setRevenue(revenueResult.value.data);
      if (paymentResult.status === "fulfilled") {
        setPayments(Array.isArray(paymentResult.value.data) ? paymentResult.value.data : []);
      }
      if (pricingResult.status === "fulfilled") {
        setPricing(pricingResult.value.data);
      }

      const failedCount = [costResult, usageResult, revenueResult, paymentResult, pricingResult]
        .filter((result) => result.status === "rejected").length;
      if (failedCount > 0) toast.error(`${failedCount} pricing data request(s) could not be loaded.`);
    } catch (error) {
      console.error("Load pricing analytics failed:", error);
      toast.error("Unable to load pricing and transaction data.");
    } finally {
      setLoading(false);
    }
  }, [reportDate, reportPeriod, selectedUserId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    adminAnalyticsApi
      .getActiveUsers()
      .then((response) => setUsers(Array.isArray(response.data) ? response.data : []))
      .catch((error) => console.error("Load users failed:", error));
  }, []);

  useEffect(() => {
    const closeUserMenu = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", closeUserMenu);
    return () => document.removeEventListener("mousedown", closeUserMenu);
  }, []);

  const selectedUser = useMemo(
    () => users.find((user) => String(user.id) === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  const trackedDays = {
    DAY: 1,
    WEEK: 7,
    MONTH: 30,
  }[reportPeriod];

  const filteredUsers = useMemo(() => {
    const keyword = userSearch.trim().toLowerCase();
    return [...users]
      .sort((left, right) => (left.email || "").localeCompare(right.email || ""))
      .filter((user) =>
        !keyword ||
        `${user.id} ${user.fullName || ""} ${user.email || ""}`
          .toLowerCase()
          .includes(keyword),
      )
      .slice(0, 100);
  }, [userSearch, users]);

  const openPriceEditor = (
    field: "inputPricePerMillion" | "outputPricePerMillion",
    label: string,
  ) => {
    if (!pricing) return;
    setEditingPrice({
      field,
      label,
      value: String(Number(pricing[field]) / 10),
    });
  };

  const savePrice = async () => {
    if (!pricing || !editingPrice) return;
    const pricePer100K = Number(editingPrice.value);
    if (!Number.isFinite(pricePer100K) || pricePer100K <= 0) {
      toast.error("Price must be greater than 0.");
      return;
    }

    try {
      setSavingPrice(true);
      const response = await adminAnalyticsApi.updateTokenPricing({
        modelName: pricing.modelName,
        inputPricePerMillion:
          editingPrice.field === "inputPricePerMillion"
            ? pricePer100K * 10
            : Number(pricing.inputPricePerMillion),
        outputPricePerMillion:
          editingPrice.field === "outputPricePerMillion"
            ? pricePer100K * 10
            : Number(pricing.outputPricePerMillion),
        currency: pricing.currency,
      });
      setPricing(response.data);
      setEditingPrice(null);
      toast.success(`${editingPrice.label} updated.`);
    } catch (error) {
      console.error("Update token price failed:", error);
      toast.error("Unable to update token price.");
    } finally {
      setSavingPrice(false);
    }
  };

  const cards = [
    { label: "Input price", value: formatMoney(Number(pricing?.inputPricePerMillion || 0) / 10), Icon: Coins, editableField: "inputPricePerMillion" as const },
    { label: "Output price", value: formatMoney(Number(pricing?.outputPricePerMillion || 0) / 10), Icon: Coins, editableField: "outputPricePerMillion" as const },
    { label: "Total tokens", value: formatNumber(tokenUsage?.totals?.overallTokens ?? tokenUsage?.totals?.totalTokens), Icon: Coins },
    { label: "Tracked days", value: formatNumber(trackedDays), Icon: Coins },
    { label: "Total input cost", value: formatMoney(cost?.inputCost), Icon: WalletCards },
    { label: "Total output cost", value: formatMoney(cost?.outputCost), Icon: WalletCards },
    { label: "Total AI cost", value: formatMoney(cost?.totalCost), Icon: WalletCards },
    { label: "Total revenue", value: formatMoney(revenue?.totalRevenue), Icon: WalletCards },
    { label: "Successful transactions", value: formatNumber(revenue?.successfulTransactionCount), Icon: CreditCard },
  ];

  return (
    <div className="flex flex-col gap-7 bg-slate-50 dark:bg-slate-950">
      <div className="order-1">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Pricing & Revenue</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Token costs, revenue, and transaction history for the current month.</p>
        </div>
      </div>

      <div className="order-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, Icon, editableField }) => (
          <div key={label} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Icon className="h-5 w-5 text-emerald-600" />
            {editableField && (
              <button
                type="button"
                onClick={() => openPriceEditor(editableField, label)}
                aria-label={`Edit ${label}`}
                className="absolute right-4 top-4 grid grid-cols-2 gap-1 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800"
              >
                {[0, 1, 2, 3].map((dot) => (
                  <span key={dot} className="h-1 w-1 rounded-full bg-current" />
                ))}
              </button>
            )}
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 break-words text-2xl font-extrabold text-slate-900 dark:text-white">{loading ? "..." : value}</p>
          </div>
        ))}
      </div>

      <section className="order-2 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div ref={userMenuRef} className="relative">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
            User scope
          </span>
          <button
            type="button"
            onClick={() => setUserMenuOpen((open) => !open)}
            className="flex h-11 w-72 max-w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <span className="truncate">
              {selectedUser
                ? selectedUser.email || selectedUser.fullName || `User ${selectedUser.id}`
                : "All users"}
            </span>
            <ChevronDown className={`h-4 w-4 transition ${userMenuOpen ? "rotate-180" : ""}`} />
          </button>

          {userMenuOpen && (
            <div className="absolute left-0 top-full z-40 mt-2 w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-200 p-3 dark:border-slate-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    autoFocus
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    placeholder="Search by email, name, or user ID..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserId("");
                    setUserMenuOpen(false);
                    setUserSearch("");
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left ${!selectedUserId ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                >
                  <span>
                    <span className="block text-sm font-bold">All users</span>
                    <span className="block text-xs text-slate-500">Combine data from every account</span>
                  </span>
                  {!selectedUserId && <CheckCircle2 className="h-4 w-4" />}
                </button>
                <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setSelectedUserId(String(user.id));
                      setUserMenuOpen(false);
                      setUserSearch("");
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left ${String(user.id) === selectedUserId ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{user.email || "No email"}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {user.fullName || "Unnamed user"} · ID {user.id}
                      </span>
                    </span>
                    {String(user.id) === selectedUserId && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <label className="grid gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Report period
          </span>
          <select
            value={reportPeriod}
            onChange={(event) =>
              setReportPeriod(event.target.value as "DAY" | "WEEK" | "MONTH")
            }
            className="h-11 min-w-40 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="DAY">Selected day</option>
            <option value="WEEK">Last 7 days</option>
            <option value="MONTH">Last 30 days</option>
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {reportPeriod === "DAY" ? "Date" : "End date"}
          </span>
          <input
            type="date"
            value={reportDate}
            onChange={(event) => setReportDate(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          />
        </label>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          View report
        </button>
      </section>

      <section className="order-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Transaction history</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800">
              <tr><th className="px-5 py-3">Order</th><th className="px-5 py-3">User</th><th className="px-5 py-3">Plan</th><th className="px-5 py-3">Provider</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Amount</th><th className="px-5 py-3">Time</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedPayments.map((payment) => (
                <tr key={payment.orderCode} className="text-slate-700 dark:text-slate-200">
                  <td className="px-5 py-4 font-bold">{payment.orderCode}</td>
                  <td className="px-5 py-4"><div className="font-semibold">{payment.userFullName}</div><div className="text-xs text-slate-500">{payment.userEmail}</div></td>
                  <td className="px-5 py-4">{payment.planName || payment.planCode}</td>
                  <td className="px-5 py-4">{payment.provider}</td>
                  <td className="px-5 py-4"><span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10">{payment.status}</span></td>
                  <td className="px-5 py-4 text-right font-extrabold">{formatMoney(payment.amount)}</td>
                  <td className="px-5 py-4">{formatDateTime(payment.paymentTime || payment.createdAt)}</td>
                </tr>
              ))}
              {!loading && payments.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">No transactions found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-5 pb-5">
          <PaginationControls currentPage={currentPage} totalItems={payments.length} pageSize={pageSize} onPageChange={setCurrentPage} />
        </div>
      </section>

      {editingPrice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Edit token price
                </h2>
                <p className="mt-1 text-sm text-slate-500">{editingPrice.label}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPrice(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mt-5 grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
              Price
              <input
                autoFocus
                type="number"
                min="0"
                step="any"
                value={editingPrice.value}
                onChange={(event) =>
                  setEditingPrice((current) =>
                    current ? { ...current, value: event.target.value } : current,
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") void savePrice();
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-normal outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingPrice(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void savePrice()}
                disabled={savingPrice}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {savingPrice ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
