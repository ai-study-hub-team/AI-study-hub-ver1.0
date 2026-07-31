import { useCallback, useEffect, useState } from "react";
import { Ban, Loader2, RefreshCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  adminDocumentShareLinkApi,
  type AdminDocumentShareLinkResponse,
  type AdminShareLinkStatus,
} from "../../services/adminDocumentShareLinkApi";
import { PaginationControls } from "../../components/ui/PaginationControls";

const PAGE_SIZE = 20;

const formatBytes = (value?: number | null) => {
  if (value === null || value === undefined) return "Unlimited";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "No expiry";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const data = (error as { response?: { data?: { message?: string; error?: string } } })
      .response?.data;
    return data?.message || data?.error || fallback;
  }
  return fallback;
};

const statusStyle: Record<AdminShareLinkStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  DISABLED: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  EXPIRED: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  REVOKED: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

export function ShareLinkManagement() {
  const [links, setLinks] = useState<AdminDocumentShareLinkResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"ALL" | AdminShareLinkStatus>("ALL");
  const [keyword, setKeyword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [disablingId, setDisablingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadLinks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminDocumentShareLinkApi.getLinks({
        page: page - 1,
        size: PAGE_SIZE,
        ...(status !== "ALL" ? { status } : {}),
        ...(searchTerm.trim() ? { keyword: searchTerm.trim() } : {}),
      });
      setLinks(response.data.content ?? []);
      setTotal(response.data.totalElements ?? 0);
    } catch (error) {
      toast.error(getErrorMessage(error, "Cannot load share links."));
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, status]);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearchTerm(keyword);
  };

  const disableLink = async (link: AdminDocumentShareLinkResponse) => {
    if (!window.confirm(`Disable share link #${link.id} created by ${link.ownerEmail}?`)) return;

    setDisablingId(link.id);
    try {
      const response = await adminDocumentShareLinkApi.disableLink(link.id);
      setLinks((current) => current.map((item) => (
        item.id === link.id ? response.data : item
      )));
      toast.success("Share link disabled.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Cannot disable share link."));
    } finally {
      setDisablingId(null);
    }
  };

  const deleteLink = async (link: AdminDocumentShareLinkResponse) => {
    if (!window.confirm(`Permanently delete share link #${link.id}? This cannot be undone.`)) return;

    setDeletingId(link.id);
    try {
      await adminDocumentShareLinkApi.deleteLink(link.id);
      setLinks((current) => current.filter((item) => item.id !== link.id));
      setTotal((current) => Math.max(0, current - 1));
      toast.success("Share link permanently deleted.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Cannot permanently delete share link."));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Share Link Management</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Review platform share links, their owners, limits, and current status.
          </p>
        </div>
        <button type="button" onClick={() => void loadLinks()} disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <form onSubmit={submitSearch} className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)}
              placeholder="Search by link title, owner name, or email"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </div>
          <select value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
            <option value="EXPIRED">Expired</option>
            <option value="REVOKED">Revoked</option>
          </select>
          <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Search</button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800/70"><tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="px-5 py-4">Link / owner</th><th className="px-5 py-4">Policy</th><th className="px-5 py-4">Uploads</th><th className="px-5 py-4">Storage</th><th className="px-5 py-4">Expires</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Action</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? <tr><td colSpan={7} className="px-5 py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" /></td></tr>
                : links.length === 0 ? <tr><td colSpan={7} className="px-5 py-16 text-center text-slate-500">No share links found.</td></tr>
                : links.map((link) => <tr key={link.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-4"><p className="font-bold text-slate-900 dark:text-white">{link.title || `Share link #${link.id}`}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{link.ownerName || "Unknown user"}</p><p className="text-xs text-slate-500">{link.ownerEmail} · ID {link.ownerUserId}</p></td>
                  <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{link.accessPolicy || "—"}</td>
                  <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{link.currentUploads} / {link.maxUploads ?? "∞"}<p className="mt-1 text-xs text-slate-500">Per user: {link.maxUploadsPerUser ?? "∞"}</p></td>
                  <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{formatBytes(link.activeStoredBytes)} / {formatBytes(link.maxTotalBytes)}<p className="mt-1 text-xs text-slate-500">File max: {formatBytes(link.maxFileSizeBytes)}</p></td>
                  <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{formatDate(link.expiresAt)}<p className="mt-1 text-xs text-slate-500">Created {formatDate(link.createdAt)}</p></td>
                  <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[link.status] ?? "bg-slate-100 text-slate-700"}`}>{link.status}</span></td>
                  <td className="px-5 py-4 text-right">{link.status === "ACTIVE" && <button type="button" disabled={disablingId === link.id} onClick={() => void disableLink(link)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30">{disablingId === link.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Disable</button>}{(link.status === "EXPIRED" || link.status === "DISABLED") && <button type="button" disabled={deletingId === link.id} onClick={() => void deleteLink(link)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30">{deletingId === link.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete</button>}</td>
                </tr>)}
            </tbody>
          </table>
        </div>
        <div className="px-5 pb-5"><PaginationControls currentPage={page} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} /></div>
      </div>
    </div>
  );
}
