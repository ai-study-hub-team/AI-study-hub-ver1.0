import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import {
  adminDocumentReportApi,
  type DocumentReportReason,
  type DocumentReportResponse,
  type DocumentReportStatus,
} from "../../services/adminDocumentReportApi";
import { DocumentPreviewModal, type PreviewDocument } from "../../components/ui/DocumentPreviewModal";
import { ReportDetailModal } from "./components/ReportDetailModal";

const statuses: Array<{ label: string; value: "ALL" | DocumentReportStatus }> = [
  { label: "All statuses", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Reviewing", value: "REVIEWING" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Rejected", value: "REJECTED" },
];

const reasons: Array<{ label: string; value: "ALL" | DocumentReportReason }> = [
  { label: "All reasons", value: "ALL" },
  { label: "Copyright", value: "COPYRIGHT" },
  { label: "Spam", value: "SPAM" },
  { label: "Inappropriate content", value: "INAPPROPRIATE_CONTENT" },
  { label: "Misleading", value: "MISLEADING" },
  { label: "Other", value: "OTHER" },
];

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-US");
};

const badgeClass: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  REVIEWING: "bg-blue-100 text-blue-700",
  RESOLVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-slate-200 text-slate-700",
};

export function ReportManagement() {
  const [reports, setReports] = useState<DocumentReportResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | DocumentReportStatus>("ALL");
  const [reason, setReason] = useState<"ALL" | DocumentReportReason>("ALL");
  const [selected, setSelected] = useState<DocumentReportResponse | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [hideDocument, setHideDocument] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<PreviewDocument | null>(null);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminDocumentReportApi.getReports({
        status: status === "ALL" ? undefined : status,
        reason: reason === "ALL" ? undefined : reason,
        page: 0,
        size: 100,
      });
      setReports(response.data.content ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, [reason, status]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return reports;
    return reports.filter((report) =>
      [report.documentTitle, report.reporterEmail, report.ownerEmail, report.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [reports, search]);

  const updateStatus = async (nextStatus: DocumentReportStatus) => {
    if (!selected) return;
    try {
      setUpdatingId(selected.id);
      const response = await adminDocumentReportApi.updateStatus(selected.id, {
        status: nextStatus,
        adminNote: adminNote.trim() || undefined,
        hideDocument: nextStatus === "RESOLVED" ? hideDocument : false,
      });
      setReports((current) => current.map((item) => item.id === selected.id ? response.data : item));
      setSelected(response.data);
      toast.success("Report status updated successfully.");
    } catch (error) {
      console.error(error);
      toast.error("Unable to update the report.");
    } finally {
      setUpdatingId(null);
    }
  };

  const openDetail = async (report: DocumentReportResponse) => {
    try {
      const response = await adminDocumentReportApi.getReport(report.id);
      setSelected(response.data);
      setAdminNote(response.data.adminNote ?? "");
      setHideDocument(false);
    } catch {
      setSelected(report);
      setAdminNote(report.adminNote ?? "");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Report Management</h1>
          <p className="text-slate-500">Review and manage document reports submitted by users.</p>
        </div>
        <button onClick={() => void loadReports()} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-semibold">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="grid gap-3 rounded-2xl border bg-white p-4 dark:bg-slate-900 md:grid-cols-3">
        <label className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search report..." className="w-full rounded-xl border py-2.5 pl-10 pr-3" />
        </label>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="rounded-xl border px-3 py-2.5">
          {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <select value={reason} onChange={(e) => setReason(e.target.value as typeof reason)} className="rounded-xl border px-3 py-2.5">
          {reasons.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white dark:bg-slate-900">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12"><Loader2 className="h-5 w-5 animate-spin" /> Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No matching reports found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800"><tr><th className="p-4">Document</th><th className="p-4">Reporter</th><th className="p-4">Reason</th><th className="p-4">Status</th><th className="p-4">Created</th><th className="p-4" /></tr></thead>
              <tbody>{filtered.map((report) => (
                <tr key={report.id} className="border-t">
                  <td className="max-w-[36rem] p-4 font-semibold">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewDocument({
                          id: report.documentId,
                          title: report.documentTitle || `Document #${report.documentId}`,
                        })
                      }
                      className="block max-w-full truncate text-left transition hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                      title={report.documentTitle || `Document #${report.documentId}`}
                    >
                      {report.documentTitle || `Document #${report.documentId}`}
                    </button>
                  </td>
                  <td className="p-4">{report.reporterEmail}</td>
                  <td className="p-4">{report.reason}</td>
                  <td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badgeClass[report.status] ?? "bg-slate-100"}`}>{report.status}</span></td>
                  <td className="p-4">{formatDate(report.createdAt)}</td>
                  <td className="p-4 text-right"><button onClick={() => void openDetail(report)} className="rounded-lg border p-2" title="View"><Eye className="h-4 w-4" /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <ReportDetailModal
          report={selected}
          adminNote={adminNote}
          hideDocument={hideDocument}
          updating={updatingId === selected.id}
          onAdminNoteChange={setAdminNote}
          onHideDocumentChange={setHideDocument}
          onPreviewDocument={() =>
            setPreviewDocument({
              id: selected.documentId,
              title: selected.documentTitle || `Document #${selected.documentId}`,
            })
          }
          onUpdateStatus={(nextStatus) => void updateStatus(nextStatus)}
          onClose={() => setSelected(null)}
        />
      )}

      <DocumentPreviewModal
        document={previewDocument}
        onClose={() => setPreviewDocument(null)}
      />
    </div>
  );
}
