import {
  Zap, CreditCard, Calendar, Download, ArrowUpRight, CheckCircle2,
  Receipt, Trash2, Plus, Shield, Star, Clock, ChevronRight, AlertTriangle
} from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const usageData = [
  { month: "Jan", ai: 45, uploads: 12 },
  { month: "Feb", ai: 72, uploads: 18 },
  { month: "Mar", ai: 89, uploads: 25 },
  { month: "Apr", ai: 134, uploads: 31 },
  { month: "May", ai: 112, uploads: 22 },
  { month: "Jun", ai: 198, uploads: 40 },
];

const billingHistory = [
  { id: "INV-2024-006", date: "Jun 1, 2024", amount: "$19.00", status: "paid", plan: "Pro Monthly" },
  { id: "INV-2024-005", date: "May 1, 2024", amount: "$19.00", status: "paid", plan: "Pro Monthly" },
  { id: "INV-2024-004", date: "Apr 1, 2024", amount: "$19.00", status: "paid", plan: "Pro Monthly" },
  { id: "INV-2024-003", date: "Mar 1, 2024", amount: "$19.00", status: "paid", plan: "Pro Monthly" },
  { id: "INV-2024-002", date: "Feb 1, 2024", amount: "$19.00", status: "paid", plan: "Pro Monthly" },
  { id: "INV-2024-001", date: "Jan 1, 2024", amount: "$0.00", status: "trial", plan: "Pro Trial" },
];

const paymentMethods = [
  { id: 1, type: "visa", last4: "4242", expiry: "12/26", isDefault: true },
  { id: 2, type: "mastercard", last4: "8731", expiry: "08/25", isDefault: false },
];

const CardBrand = ({ type }: { type: string }) => {
  const brands: Record<string, string> = { visa: "VISA", mastercard: "MC" };
  const colors: Record<string, string> = {
    visa: "from-blue-600 to-blue-800",
    mastercard: "from-red-500 to-orange-500",
  };
  return (
    <div className={`w-12 h-8 rounded-lg bg-gradient-to-r ${colors[type]} flex items-center justify-center`}>
      <span className="text-white text-xs font-extrabold tracking-wider">{brands[type]}</span>
    </div>
  );
};

export function SubscriptionDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "billing" | "payment">("overview");
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Subscription</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your plan, billing, and payment methods</p>
        </div>
        <button
          onClick={() => navigate("/app/subscription/upgrade")}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
        >
          <Zap className="w-4 h-4" /> Upgrade Plan
        </button>
      </div>

      {/* Current Plan Banner */}
      <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-[2rem] p-8 text-white overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-wider opacity-80">Current Plan</span>
            </div>
            <h2 className="text-3xl font-extrabold mb-1">Pro Monthly</h2>
            <p className="opacity-80">$19.00 / month</p>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider opacity-80 mb-3">Next Billing</p>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-5 h-5" />
              <span className="text-xl font-extrabold">July 1, 2024</span>
            </div>
            <p className="opacity-80 text-sm">Auto-renews in 26 days</p>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider opacity-80 mb-3">Status</p>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xl font-extrabold">Active</span>
            </div>
            <button
              onClick={() => toast.error("Are you sure you want to cancel?")}
              className="text-sm opacity-60 hover:opacity-100 underline transition-opacity"
            >
              Cancel subscription
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
        {(["overview", "billing", "payment"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 font-bold text-sm capitalize transition-all border-b-2 -mb-px ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {tab === "payment" ? "Payment Methods" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Usage Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { label: "AI Questions Used", value: "198", limit: "Unlimited", icon: Zap, color: "blue", pct: null },
              { label: "Documents Uploaded", value: "40", limit: "Unlimited", icon: Download, color: "purple", pct: null },
              { label: "Storage Used", value: "9 GB", limit: "100 GB", icon: Shield, color: "emerald", pct: 9 },
            ].map((stat, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center bg-${stat.color}-50 dark:bg-slate-800`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                </div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">of {stat.limit}</p>
                {stat.pct !== null && (
                  <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full bg-${stat.color}-500`} style={{ width: `${stat.pct}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Usage Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">Usage Over Time</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={usageData}>
                <defs>
                  <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="uploadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "12px" }} />
                <Area type="monotone" dataKey="ai" name="AI Questions" stroke="#2563EB" strokeWidth={2} fill="url(#aiGrad)" />
                <Area type="monotone" dataKey="uploads" name="Uploads" stroke="#8B5CF6" strokeWidth={2} fill="url(#uploadGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pro Features */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">Your Pro Features</h2>
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
                <div key={feat} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "billing" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Billing History</h2>
              <button
                onClick={() => toast.success("Downloading all invoices...")}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
              >
                <Download className="w-4 h-4" /> Download All
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
                  {billingHistory.map((inv) => (
                    <tr key={inv.id} className="group bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <td className="px-4 py-3 rounded-l-2xl">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{inv.id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{inv.date}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-medium">{inv.plan}</td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-white">{inv.amount}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                          inv.status === "paid" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300"
                        }`}>
                          {inv.status === "paid" ? "Paid" : "Trial"}
                        </span>
                      </td>
                      <td className="px-4 py-3 rounded-r-2xl text-right">
                        <button
                          onClick={() => toast.success(`Downloading ${inv.id}...`)}
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Payment Methods</h2>
              <button
                onClick={() => toast.success("Add payment method modal opened")}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" /> Add Card
              </button>
            </div>
            <div className="space-y-3">
              {paymentMethods.map((card) => (
                <div key={card.id} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                  card.isDefault ? "border-blue-500 bg-blue-50/30 dark:bg-blue-500/10" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                }`}>
                  <div className="flex items-center gap-4">
                    <CardBrand type={card.type} />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white capitalize">{card.type} ending in {card.last4}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Expires {card.expiry}</p>
                    </div>
                    {card.isDefault && (
                      <span className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg">Default</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!card.isDefault && (
                      <button
                        onClick={() => toast.success("Set as default card")}
                        className="text-sm font-semibold text-blue-600 hover:underline"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => toast.error("Card removed")}
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
              <p className="font-bold text-slate-700 dark:text-slate-300">Your payment information is secure</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Payments are encrypted with 256-bit SSL. We never store your full card details.</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
