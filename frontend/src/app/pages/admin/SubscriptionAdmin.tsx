import {
  DollarSign, Users, TrendingUp, CreditCard, Zap, Star, Building2,
  ArrowUpRight, ArrowDownRight, Download, Calendar, ChevronRight
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { motion } from "motion/react";
import { toast } from "sonner";

const revenueData = [
  { month: "Jan", revenue: 4200, users: 221 },
  { month: "Feb", revenue: 5800, users: 305 },
  { month: "Mar", revenue: 7200, users: 378 },
  { month: "Apr", revenue: 6900, users: 363 },
  { month: "May", revenue: 9400, users: 494 },
  { month: "Jun", revenue: 11200, users: 589 },
];

const planDistribution = [
  { name: "Free", value: 8941, fill: "#E2E8F0" },
  { name: "Pro", value: 3201, fill: "#2563EB" },
  { name: "Enterprise", value: 340, fill: "#8B5CF6" },
];

const recentUpgrades = [
  { user: "Yuki Tanaka", from: "Free", to: "Pro", date: "Jun 5, 2024", amount: "$19.00" },
  { user: "Emma Rodriguez", from: "Free", to: "Pro", date: "Jun 4, 2024", amount: "$19.00" },
  { user: "Tech Corp Inc.", from: "Pro", to: "Enterprise", date: "Jun 3, 2024", amount: "$49.00" },
  { user: "David Kim", from: "Free", to: "Pro", date: "Jun 2, 2024", amount: "$19.00" },
  { user: "University of AI", from: "Free", to: "Enterprise", date: "Jun 1, 2024", amount: "$49.00" },
];

const kpis = [
  { label: "Monthly Revenue", value: "$11,200", growth: "+19%", positive: true, icon: DollarSign, color: "emerald" },
  { label: "Paid Users", value: "3,541", growth: "+12%", positive: true, icon: Users, color: "blue" },
  { label: "Avg Revenue/User", value: "$19.40", growth: "+3%", positive: true, icon: TrendingUp, color: "purple" },
  { label: "Churned Users", value: "47", growth: "+8%", positive: false, icon: CreditCard, color: "red" },
];

const PLAN_COLORS: Record<string, string> = { Free: "slate", Pro: "blue", Enterprise: "purple" };
const PLAN_ICONS: Record<string, React.ElementType> = { Free: Star, Pro: Zap, Enterprise: Building2 };

export function SubscriptionAdmin() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Subscription Management</h1>
          <p className="text-slate-500">Revenue tracking, plan distribution, and subscription analytics</p>
        </div>
        <button
          onClick={() => toast.success("Exporting revenue report...")}
          className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm"
          >
            <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center bg-${kpi.color}-50`}>
              <kpi.icon className={`w-5 h-5 text-${kpi.color}-600`} />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{kpi.label}</p>
            <p className="text-2xl font-extrabold text-slate-900">{kpi.value}</p>
            <div className={`flex items-center gap-1 mt-1 text-xs font-bold ${kpi.positive ? "text-emerald-500" : "text-red-500"}`}>
              {kpi.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {kpi.growth} this month
            </div>
          </motion.div>
        ))}
      </div>

      {/* Revenue Chart + Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-900">Revenue Over Time</h2>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-500 font-medium">Monthly Revenue</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v) => [`$${v}`, "Revenue"]}
                contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "12px" }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2.5} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-5">Plan Distribution</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={planDistribution}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                dataKey="value"
                strokeWidth={0}
              >
                {planDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [v, "Users"]} contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3 mt-2">
            {planDistribution.map((plan) => {
              const Icon = PLAN_ICONS[plan.name];
              const total = planDistribution.reduce((s, p) => s + p.value, 0);
              const pct = Math.round((plan.value / total) * 100);
              return (
                <div key={plan.name} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: plan.fill + "20" }}>
                    <Icon className="w-4 h-4" style={{ color: plan.fill }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold text-slate-700">{plan.name}</span>
                      <span className="text-slate-400">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: plan.fill }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-700 w-16 text-right">{plan.value.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Upgrades */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">Recent Upgrades</h2>
          <button className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
            View all <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-slate-400 text-xs font-bold uppercase tracking-widest">
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Upgrade</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentUpgrades.map((upg, i) => (
                <tr key={i} className="group hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 rounded-l-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-extrabold shrink-0">
                        {upg.user.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-800 text-sm">{upg.user}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg">{upg.from}</span>
                      <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-lg ${upg.to === "Pro" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>{upg.to}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{upg.date}</td>
                  <td className="px-4 py-3 rounded-r-2xl text-right">
                    <span className="font-extrabold text-emerald-600">{upg.amount}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
