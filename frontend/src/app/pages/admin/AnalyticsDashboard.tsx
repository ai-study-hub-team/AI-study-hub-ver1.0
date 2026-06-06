import {
  Users, FileText, Zap, HardDrive, TrendingUp, Activity,
  ArrowUpRight, ArrowDownRight, Globe, Clock, Calendar
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { useState } from "react";
import { motion } from "motion/react";

const periods = ["7 days", "30 days", "90 days", "1 year"];

const userGrowth = [
  { date: "May 5", users: 10800, active: 7200 },
  { date: "May 12", users: 11000, active: 7600 },
  { date: "May 19", users: 11400, active: 8100 },
  { date: "May 26", users: 11700, active: 8400 },
  { date: "Jun 2", users: 12000, active: 8700 },
  { date: "Jun 5", users: 12482, active: 9100 },
];

const aiUsage = [
  { day: "Mon", questions: 3400, summaries: 890, quizzes: 420 },
  { day: "Tue", questions: 4200, summaries: 1100, quizzes: 560 },
  { day: "Wed", questions: 5100, summaries: 1400, quizzes: 680 },
  { day: "Thu", questions: 4600, summaries: 1200, quizzes: 590 },
  { day: "Fri", questions: 5800, summaries: 1600, quizzes: 780 },
  { day: "Sat", questions: 3200, summaries: 800, quizzes: 340 },
  { day: "Sun", questions: 2800, summaries: 700, quizzes: 290 },
];

const docUploads = [
  { month: "Jan", uploads: 2100 },
  { month: "Feb", uploads: 3400 },
  { month: "Mar", uploads: 4200 },
  { month: "Apr", uploads: 3800 },
  { month: "May", uploads: 5600 },
  { month: "Jun", uploads: 6900 },
];

const subjectDistribution = [
  { name: "STEM", value: 45, fill: "#2563EB" },
  { name: "Humanities", value: 25, fill: "#8B5CF6" },
  { name: "Business", value: 18, fill: "#10B981" },
  { name: "Arts", value: 8, fill: "#F59E0B" },
  { name: "Other", value: 4, fill: "#6B7280" },
];

const kpis = [
  { label: "Total Users", value: "12,482", growth: "+14.2%", positive: true, sub: "vs last month", icon: Users, color: "blue" },
  { label: "Active Users", value: "9,100", growth: "+8.6%", positive: true, sub: "daily average", icon: Activity, color: "emerald" },
  { label: "Total Documents", value: "48,291", growth: "+22.4%", positive: true, sub: "ever uploaded", icon: FileText, color: "purple" },
  { label: "AI Queries Today", value: "28,943", growth: "+31%", positive: true, sub: "questions asked", icon: Zap, color: "amber" },
  { label: "Storage Used", value: "2.4 TB", growth: "+18%", positive: true, sub: "across all users", icon: HardDrive, color: "red" },
  { label: "Avg Session", value: "24 min", growth: "+5%", positive: true, sub: "per user visit", icon: Clock, color: "indigo" },
];

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState("30 days");

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Platform Analytics</h1>
          <p className="text-slate-500">Comprehensive platform metrics and usage insights</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-1.5">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                period === p ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        {kpis.map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${kpi.color}-50`}>
                <kpi.icon className={`w-5 h-5 text-${kpi.color}-600`} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${kpi.positive ? "text-emerald-500" : "text-red-500"}`}>
                {kpi.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {kpi.growth}
              </div>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</p>
            <p className="text-2xl font-extrabold text-slate-900">{kpi.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* User Growth Chart */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">User Growth</h2>
            <p className="text-sm text-slate-500">Total registered vs. daily active users</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-600" /> Total Users</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Active Users</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={userGrowth}>
            <defs>
              <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => v >= 1000 ? `${v/1000}k` : v} tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "12px" }} />
            <Area type="monotone" dataKey="users" name="Total Users" stroke="#2563EB" strokeWidth={2.5} fill="url(#totalGrad)" />
            <Area type="monotone" dataKey="active" name="Active Users" stroke="#10B981" strokeWidth={2.5} fill="url(#activeGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Usage */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-5">AI Feature Usage (This Week)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={aiUsage} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "12px" }} />
              <Bar dataKey="questions" name="AI Questions" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="summaries" name="Summaries" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="quizzes" name="Quizzes" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Document Distribution */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-5">Documents by Subject</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={subjectDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {subjectDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2.5">
              {subjectDistribution.map((s) => (
                <div key={s.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.fill }} />
                  <div className="flex-1 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{s.name}</span>
                    <span className="font-bold text-slate-900">{s.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Monthly Document Uploads</h3>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={docUploads} barSize={20}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "11px" }} />
                <Bar dataKey="uploads" name="Uploads" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
