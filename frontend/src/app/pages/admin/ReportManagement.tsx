import {
  Flag, Search, Eye, CheckCircle2, XCircle, AlertTriangle,
  FileText, Clock, Trash2, ChevronRight, Filter, RefreshCw,
  MessageSquare, Ban
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

const reportCategories = [
  "All", "Copyright Violation", "Inappropriate Content", "Spam", "Misinformation", "Privacy Violation", "Other"
];

const allReports = [
  {
    id: "RPT-001",
    document: "Advanced Thermodynamics.pdf",
    reporter: "Sarah Chen",
    category: "Copyright Violation",
    description: "This document appears to be a copyrighted textbook uploaded without permission.",
    date: "Jun 5, 2024",
    status: "pending",
    priority: "high",
  },
  {
    id: "RPT-002",
    document: "Intro Chemistry Notes.pdf",
    reporter: "Marcus Williams",
    category: "Misinformation",
    description: "The chemical formulas in this document are incorrect and could mislead students.",
    date: "Jun 4, 2024",
    status: "pending",
    priority: "medium",
  },
  {
    id: "RPT-003",
    document: "History Essay Final.docx",
    reporter: "Priya Patel",
    category: "Inappropriate Content",
    description: "Contains offensive language and inappropriate historical revisionism.",
    date: "Jun 3, 2024",
    status: "resolved",
    priority: "high",
  },
  {
    id: "RPT-004",
    document: "Math Problem Set 5.pdf",
    reporter: "James O'Brien",
    category: "Spam",
    description: "This file contains promotional content and advertisements, not academic material.",
    date: "Jun 2, 2024",
    status: "dismissed",
    priority: "low",
  },
  {
    id: "RPT-005",
    document: "Psychology Research.pdf",
    reporter: "Emma Rodriguez",
    category: "Privacy Violation",
    description: "Contains personal information of real individuals without consent.",
    date: "Jun 1, 2024",
    status: "pending",
    priority: "high",
  },
];

type ReportStatus = "pending" | "resolved" | "dismissed";

const StatusBadge = ({ status }: { status: ReportStatus | string }) => {
  const config: Record<string, string> = {
    pending: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300",
    resolved: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    dismissed: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
  };
  return <span className={`px-2.5 py-1 text-xs font-bold rounded-lg capitalize ${config[status]}`}>{status}</span>;
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  const config: Record<string, string> = {
    high: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300",
    medium: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300",
    low: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
  };
  return <span className={`px-2.5 py-1 text-xs font-bold rounded-lg capitalize ${config[priority]}`}>{priority}</span>;
};

export function ReportManagement() {
  const [reports, setReports] = useState(allReports);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedReport, setSelectedReport] = useState<typeof allReports[0] | null>(null);

  const filtered = reports.filter((r) => {
    const matchSearch = r.document.toLowerCase().includes(search.toLowerCase()) || r.reporter.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "All" || r.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const resolveReport = (id: string) => {
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: "resolved" } : r));
    toast.success("Report resolved and document removed");
    setSelectedReport(null);
  };

  const dismissReport = (id: string) => {
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: "dismissed" } : r));
    toast.success("Report dismissed");
    setSelectedReport(null);
  };

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-8 bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Report Management</h1>
          <p className="text-slate-500 dark:text-slate-400">Review and resolve content reports from users</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300 rounded-xl border border-red-100 dark:border-red-500/30">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-bold text-sm">{pendingCount} reports need review</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5">
        {[
          { label: "Pending Review", value: reports.filter((r) => r.status === "pending").length, icon: Clock, color: "amber" },
          { label: "Resolved", value: reports.filter((r) => r.status === "resolved").length, icon: CheckCircle2, color: "emerald" },
          { label: "Dismissed", value: reports.filter((r) => r.status === "dismissed").length, icon: XCircle, color: "slate" },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center bg-${stat.color}-50 dark:bg-slate-800`}>
              <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{stat.value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Report List */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <div className="space-y-4 mb-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
              <input
                type="text"
                placeholder="Search reports..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {reportCategories.slice(0, 4).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    categoryFilter === cat ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filtered.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className={`w-full text-left p-4 rounded-2xl border-2 bg-white dark:bg-slate-900 transition-all ${
                  selectedReport?.id === report.id
                    ? "border-blue-500 bg-blue-50/30 dark:bg-blue-500/10"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Flag className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-900 dark:text-white text-sm truncate">{report.document}</span>
                  </div>
                  <StatusBadge status={report.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>{report.id}</span>
                  <span>·</span>
                  <span>{report.category}</span>
                  <span>·</span>
                  <span>{report.date}</span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                <Flag className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm font-medium">No reports found</p>
              </div>
            )}
          </div>
        </div>

        {/* Report Detail */}
        <AnimatePresence mode="wait">
          {selectedReport ? (
            <motion.div
              key={selectedReport.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{selectedReport.id}</span>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{selectedReport.document}</h2>
                </div>
                <PriorityBadge priority={selectedReport.priority} />
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-0.5">Category</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{selectedReport.category}</p>
                  </div>
                </div>
                <div className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-0.5">Reported By</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{selectedReport.reporter} · {selectedReport.date}</p>
                  </div>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/30 rounded-2xl">
                  <p className="text-xs text-amber-600 dark:text-amber-300 font-bold uppercase tracking-wider mb-2">Description</p>
                  <p className="text-sm text-amber-800 dark:text-amber-100 leading-relaxed">{selectedReport.description}</p>
                </div>
              </div>

              {selectedReport.status === "pending" ? (
                <div className="space-y-3">
                  <button
                    onClick={() => resolveReport(selectedReport.id)}
                    className="w-full py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Remove Document & Resolve
                  </button>
                  <button
                    onClick={() => toast.success("Notification sent to document owner")}
                    className="w-full py-3 bg-amber-500 text-white font-bold rounded-2xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" /> Warn Document Owner
                  </button>
                  <button
                    onClick={() => dismissReport(selectedReport.id)}
                    className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" /> Dismiss Report
                  </button>
                </div>
              ) : (
                <div className={`p-4 rounded-2xl flex items-center gap-3 ${
                  selectedReport.status === "resolved" ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/30" : "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                }`}>
                  {selectedReport.status === "resolved"
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    : <XCircle className="w-5 h-5 text-slate-500 dark:text-slate-400" />}
                  <p className={`font-bold text-sm capitalize ${selectedReport.status === "resolved" ? "text-emerald-700 dark:text-emerald-300" : "text-slate-700 dark:text-slate-300"}`}>
                    This report has been {selectedReport.status}
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-slate-50 dark:bg-slate-800 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-12 text-center"
            >
              <Flag className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
              <p className="font-bold text-slate-500 dark:text-slate-400">Select a report to review</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Click any report from the list to see details</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
