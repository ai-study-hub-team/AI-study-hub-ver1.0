import { useCallback, useEffect, useState } from "react";
import { Coins, CreditCard, Pencil, RefreshCw, WalletCards, X } from "lucide-react";
import { toast } from "sonner";
import {
  adminAnalyticsApi,
  type PaymentHistoryItem,
  type RevenueReportResponse,
  type TokenCostResponse,
  type TokenPricingResponse,
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
  const [revenue, setRevenue] = useState<RevenueReportResponse | null>(null);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [pricing, setPricing] = useState<TokenPricingResponse | null>(null);
  const [pricingDraft, setPricingDraft] = useState<TokenPricingResponse | null>(null);
  const [editingPricing, setEditingPricing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const paginatedPayments = payments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { period: "MONTH" as const };
      const [costResult, revenueResult, paymentResult, pricingResult] = await Promise.allSettled([
        adminAnalyticsApi.getTokenCost(params),
        adminAnalyticsApi.getRevenue(params),
        adminAnalyticsApi.getPaymentHistory(params),
        adminAnalyticsApi.getTokenPricing(),
      ]);
      if (costResult.status === "fulfilled") setCost(costResult.value.data);
      if (revenueResult.status === "fulfilled") setRevenue(revenueResult.value.data);
      if (paymentResult.status === "fulfilled") {
        setPayments(Array.isArray(paymentResult.value.data) ? paymentResult.value.data : []);
      }
      if (pricingResult.status === "fulfilled") {
        setPricing(pricingResult.value.data);
        setPricingDraft(pricingResult.value.data);
      }

      const failedCount = [costResult, revenueResult, paymentResult, pricingResult]
        .filter((result) => result.status === "rejected").length;
      if (failedCount > 0) toast.error(`${failedCount} pricing data request(s) could not be loaded.`);
    } catch (error) {
      console.error("Load pricing analytics failed:", error);
      toast.error("Unable to load pricing and transaction data.");
    } finally {
      setLoading(false);
    }
  }, []);

  const savePricing = async () => {
    if (!pricingDraft) return;
    try {
      const response = await adminAnalyticsApi.updateTokenPricing({
        modelName: pricingDraft.modelName,
        inputPricePerMillion: Number(pricingDraft.inputPricePerMillion) * 10,
        outputPricePerMillion: Number(pricingDraft.outputPricePerMillion) * 10,
        currency: pricingDraft.currency,
      });
      setPricing(response.data);
      setPricingDraft(response.data);
      setEditingPricing(false);
      toast.success("Token pricing updated.");
      await loadData();
    } catch (error) {
      console.error("Update token pricing failed:", error);
      toast.error("Unable to update token pricing.");
    }
  };

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const cards = [
    ["Input price / 100K", formatMoney(Number(cost?.inputPricePerMillion || 0) / 10), Coins],
    ["Output price / 100K", formatMoney(Number(cost?.outputPricePerMillion || 0) / 10), Coins],
    ["Input tokens", formatNumber(cost?.totalInputToken), Coins],
    ["Output tokens", formatNumber(cost?.totalOutputToken), Coins],
    ["Total AI cost", formatMoney(cost?.totalCost), WalletCards],
    ["Total revenue", formatMoney(revenue?.totalRevenue), WalletCards],
    ["Successful transactions", formatNumber(revenue?.successfulTransactionCount), CreditCard],
  ] as const;

  return (
    <div className="space-y-7 bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Pricing & Revenue</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Token costs, revenue, and transaction history for the current month.</p>
        </div>
        <button onClick={() => void loadData()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Icon className="h-5 w-5 text-emerald-600" />
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 break-words text-2xl font-extrabold text-slate-900 dark:text-white">{loading ? "..." : value}</p>
          </div>
        ))}
      </div>

      {pricing && pricingDraft && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <label className="flex-1 text-sm font-bold text-slate-700 dark:text-slate-200">Model
              <input disabled={!editingPricing} value={pricingDraft.modelName} onChange={(e) => setPricingDraft({ ...pricingDraft, modelName: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:disabled:bg-slate-800/60" />
            </label>
            <label className="flex-1 text-sm font-bold text-slate-700 dark:text-slate-200">Input price / 100K
              <input disabled={!editingPricing} type="number" min="0" step="any" value={editingPricing ? pricingDraft.inputPricePerMillion : Number(pricing.inputPricePerMillion) / 10} onChange={(e) => setPricingDraft({ ...pricingDraft, inputPricePerMillion: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:disabled:bg-slate-800/60" />
            </label>
            <label className="flex-1 text-sm font-bold text-slate-700 dark:text-slate-200">Output price / 100K
              <input disabled={!editingPricing} type="number" min="0" step="any" value={editingPricing ? pricingDraft.outputPricePerMillion : Number(pricing.outputPricePerMillion) / 10} onChange={(e) => setPricingDraft({ ...pricingDraft, outputPricePerMillion: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:disabled:bg-slate-800/60" />
            </label>
            {editingPricing ? (
              <div className="flex gap-2">
                <button onClick={() => { setPricingDraft(pricing); setEditingPricing(false); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold dark:border-slate-700"><X className="h-4 w-4" /> Cancel</button>
                <button onClick={() => void savePricing()} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Save pricing</button>
              </div>
            ) : (
              <button onClick={() => { setPricingDraft({ ...pricing, inputPricePerMillion: Number(pricing.inputPricePerMillion) / 10, outputPricePerMillion: Number(pricing.outputPricePerMillion) / 10 }); setEditingPricing(true); }} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"><Pencil className="h-4 w-4" /> Edit</button>
            )}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
    </div>
  );
}
