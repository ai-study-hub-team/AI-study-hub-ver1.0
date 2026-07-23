import { useCallback, useEffect, useState } from "react";
import { Activity, ChevronLeft, ChevronRight, Eye, Loader2, RefreshCcw, Search, X } from "lucide-react";
import { toast } from "sonner";
import {
  adminActivityApi,
  type RecentUserActivity,
  type UserActivityLog,
} from "../../services/adminActivityApi";

const formatDateTime = (value?: string | null) => {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const toStartOfDay = (value: string) => (value ? `${value}T00:00:00` : undefined);
const toEndOfDay = (value: string) => (value ? `${value}T23:59:59` : undefined);

export function ActivityLogs() {
  const [items, setItems] = useState<RecentUserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sort, setSort] = useState<"lastActiveAt" | "lastLoginAt">("lastActiveAt");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [selectedUser, setSelectedUser] = useState<RecentUserActivity | null>(null);
  const [logs, setLogs] = useState<UserActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logPage, setLogPage] = useState(0);
  const [logTotalPages, setLogTotalPages] = useState(0);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminActivityApi.getRecentActivities({
        keyword: keyword || undefined,
        role: role || undefined,
        status: status || undefined,
        fromDate: toStartOfDay(fromDate),
        toDate: toEndOfDay(toDate),
        page,
        size: 10,
        sort,
      });
      setItems(response.data.content ?? []);
      setTotalPages(response.data.totalPages ?? 0);
      setTotalElements(response.data.totalElements ?? 0);
    } catch (error) {
      console.error(error);
      toast.error("Cannot load activity logs.");
    } finally {
      setLoading(false);
    }
  }, [keyword, role, status, fromDate, toDate, page, sort]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  const loadUserLogs = useCallback(async (user: RecentUserActivity, targetPage = 0) => {
    setSelectedUser(user);
    setLogsLoading(true);
    try {
      const response = await adminActivityApi.getUserActivities(user.userId, targetPage, 10);
      setLogs(response.data.content ?? []);
      setLogPage(response.data.number ?? targetPage);
      setLogTotalPages(response.data.totalPages ?? 0);
    } catch (error) {
      console.error(error);
      toast.error("Cannot load this user's activity history.");
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const resetFilters = () => {
    setKeywordInput("");
    setKeyword("");
    setRole("");
    setStatus("");
    setFromDate("");
    setToDate("");
    setSort("lastActiveAt");
    setPage(0);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Activity Logs</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track recent user activity and inspect each account's history.
          </p>
        </div>
        <button type="button" onClick={() => void loadActivities()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
          <RefreshCcw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <form className="grid gap-3 lg:grid-cols-6" onSubmit={(event) => { event.preventDefault(); setPage(0); setKeyword(keywordInput.trim()); }}>
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} placeholder="Search name or email" className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950" />
          </div>
          <select value={role} onChange={(event) => { setRole(event.target.value); setPage(0); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
            <option value="">All roles</option><option value="USER">User</option><option value="MANAGER">Manager</option><option value="ADMIN">Admin</option>
          </select>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
            <option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
          </select>
          <input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(0); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
          <input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(0); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
          <select value={sort} onChange={(event) => { setSort(event.target.value as typeof sort); setPage(0); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
            <option value="lastActiveAt">Sort by last active</option><option value="lastLoginAt">Sort by last login</option>
          </select>
          <div className="flex gap-2 lg:col-span-2">
            <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Search</button>
            <button type="button" onClick={resetFilters} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Reset</button>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2 font-semibold"><Activity className="h-5 w-5 text-blue-600" /> Recent users</div>
          <span className="text-sm text-slate-500">{totalElements} users</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950/60"><tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Last action</th><th className="px-5 py-3">Last active</th><th className="px-5 py-3">Resources</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? <tr><td colSpan={7} className="px-5 py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" /></td></tr> : items.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">No activity found.</td></tr> : items.map((item) => (
                <tr key={item.userId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-5 py-4"><div className="font-medium text-slate-900 dark:text-white">{item.fullName || "Unknown"}</div><div className="text-xs text-slate-500">{item.email}</div></td>
                  <td className="px-5 py-4">{item.role}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.accountStatus === "ACTIVE" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{item.accountStatus}</span></td>
                  <td className="max-w-[220px] truncate px-5 py-4">{item.lastAction || "—"}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatDateTime(item.lastActiveAt)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{item.totalDocuments} docs · {item.totalSharedDocuments} shares · {item.totalReports} reports</td>
                  <td className="px-5 py-4 text-right"><button type="button" onClick={() => void loadUserLogs(item)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10"><Eye className="h-4 w-4" /> View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <span className="text-sm text-slate-500">Page {totalPages === 0 ? 0 : page + 1} of {totalPages}</span>
          <div className="flex gap-2"><button disabled={page <= 0} onClick={() => setPage((value) => value - 1)} className="rounded-lg border p-2 disabled:opacity-40 dark:border-slate-700"><ChevronLeft className="h-4 w-4" /></button><button disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border p-2 disabled:opacity-40 dark:border-slate-700"><ChevronRight className="h-4 w-4" /></button></div>
        </div>
      </div>

      {selectedUser && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelectedUser(null); }}>
        <div className="max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
          <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800"><div><h2 className="text-lg font-bold">{selectedUser.fullName}'s activity</h2><p className="text-sm text-slate-500">{selectedUser.email}</p></div><button onClick={() => setSelectedUser(null)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
          <div className="max-h-[60vh] overflow-auto">
            <table className="min-w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950"><tr><th className="px-5 py-3">Time</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Target</th><th className="px-5 py-3">IP address</th><th className="px-5 py-3">User agent</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{logsLoading ? <tr><td colSpan={5} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr> : logs.length === 0 ? <tr><td colSpan={5} className="py-12 text-center text-slate-500">No detailed activity found.</td></tr> : logs.map((log) => <tr key={log.id}><td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatDateTime(log.createdAt)}</td><td className="px-5 py-4 font-medium">{log.action}</td><td className="px-5 py-4">{log.targetType || "—"}{log.targetId ? ` #${log.targetId}` : ""}</td><td className="px-5 py-4">{log.ipAddress || "—"}</td><td className="max-w-[300px] truncate px-5 py-4 text-slate-500" title={log.userAgent || ""}>{log.userAgent || "—"}</td></tr>)}</tbody></table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 p-4 dark:border-slate-800"><span className="text-sm text-slate-500">Page {logTotalPages === 0 ? 0 : logPage + 1} of {logTotalPages}</span><div className="flex gap-2"><button disabled={logPage <= 0 || logsLoading} onClick={() => void loadUserLogs(selectedUser, logPage - 1)} className="rounded-lg border p-2 disabled:opacity-40 dark:border-slate-700"><ChevronLeft className="h-4 w-4" /></button><button disabled={logPage + 1 >= logTotalPages || logsLoading} onClick={() => void loadUserLogs(selectedUser, logPage + 1)} className="rounded-lg border p-2 disabled:opacity-40 dark:border-slate-700"><ChevronRight className="h-4 w-4" /></button></div></div>
        </div>
      </div>}
    </div>
  );
}
