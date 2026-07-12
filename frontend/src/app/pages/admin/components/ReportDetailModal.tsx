import { AlertTriangle, CheckCircle2, X, XCircle } from "lucide-react";

import type {
  DocumentReportResponse,
  DocumentReportStatus,
} from "../../../services/adminDocumentReportApi";

interface ReportDetailModalProps {
  report: DocumentReportResponse;
  adminNote: string;
  hideDocument: boolean;
  updating: boolean;
  onAdminNoteChange: (value: string) => void;
  onHideDocumentChange: (value: boolean) => void;
  onPreviewDocument: () => void;
  onUpdateStatus: (status: DocumentReportStatus) => void;
  onClose: () => void;
}

export function ReportDetailModal({
  report,
  adminNote,
  hideDocument,
  updating,
  onAdminNoteChange,
  onHideDocumentChange,
  onPreviewDocument,
  onUpdateStatus,
  onClose,
}: ReportDetailModalProps) {
  const documentTitle = report.documentTitle || `Document #${report.documentId}`;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={onPreviewDocument}
              className="block max-w-full text-left text-xl font-extrabold text-slate-950 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
              title="Preview document"
            >
              <span className="block break-words [overflow-wrap:anywhere]">
                {documentTitle}
              </span>
            </button>
            <p className="mt-1 text-sm text-slate-500">Report #{report.id}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close report detail"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 text-sm md:grid-cols-2">
          <p className="min-w-0 break-words [overflow-wrap:anywhere]">
            <b>Reporter:</b> {report.reporterEmail || "Unknown"}
          </p>
          <p className="min-w-0 break-words [overflow-wrap:anywhere]">
            <b>Owner:</b> {report.ownerEmail || "Unknown"}
          </p>
          <p><b>Reason:</b> {report.reason}</p>
          <p><b>Status:</b> {report.status}</p>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
          <b>Description</b>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">
            {report.description || "No description"}
          </p>
        </div>

        <textarea
          value={adminNote}
          onChange={(event) => onAdminNoteChange(event.target.value)}
          placeholder="Admin note"
          className="mt-4 min-h-24 w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950"
        />

        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hideDocument}
            onChange={(event) => onHideDocumentChange(event.target.checked)}
          />
          Hide document when resolving
        </label>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            disabled={updating}
            onClick={() => onUpdateStatus("REVIEWING")}
            className="rounded-xl border px-4 py-2 font-bold disabled:opacity-60"
          >
            <AlertTriangle className="mr-2 inline h-4 w-4" /> Reviewing
          </button>
          <button
            disabled={updating}
            onClick={() => onUpdateStatus("REJECTED")}
            className="rounded-xl border px-4 py-2 font-bold disabled:opacity-60"
          >
            <XCircle className="mr-2 inline h-4 w-4" /> Reject
          </button>
          <button
            disabled={updating}
            onClick={() => onUpdateStatus("RESOLVED")}
            className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white disabled:opacity-60"
          >
            <CheckCircle2 className="mr-2 inline h-4 w-4" /> Resolve
          </button>
        </div>
      </div>
    </div>
  );
}
