import { useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import {
  documentReportApi,
  type ReportDocumentPayload,
} from "../../../services/documentReportApi";
import type { DocumentReportReason } from "../../../services/adminDocumentReportApi";

interface ReportDocumentModalProps {
  documentId: number;
  documentTitle: string;
  onClose: () => void;
}

const reasonOptions: Array<{ value: DocumentReportReason; label: string }> = [
  { value: "COPYRIGHT", label: "Copyright violation" },
  { value: "SPAM", label: "Spam" },
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate content" },
  { value: "MISLEADING", label: "Misleading information" },
  { value: "OTHER", label: "Other" },
];

const getErrorMessage = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  "Unable to submit this report.";

export function ReportDocumentModal({
  documentId,
  documentTitle,
  onClose,
}: ReportDocumentModalProps) {
  const [reason, setReason] = useState<DocumentReportReason>("INAPPROPRIATE_CONTENT");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!Number.isInteger(documentId) || documentId <= 0) {
      toast.error("Invalid document.");
      return;
    }

    const payload: ReportDocumentPayload = {
      reason,
      description: description.trim() || undefined,
    };

    try {
      setIsSubmitting(true);
      await documentReportApi.reportDocument(documentId, payload);
      toast.success("Report submitted successfully.");
      onClose();
    } catch (error: any) {
      if (error?.response?.status === 401) {
        toast.error("Please sign in before reporting this document.");
        return;
      }

      if (error?.response?.status === 409) {
        toast.error("You have already reported this document.");
        return;
      }

      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
                Report document
              </h2>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                {documentTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close report dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
              Reason
            </label>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as DocumentReportReason)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-blue-950"
            >
              {reasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
              Additional details
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isSubmitting}
              rows={5}
              maxLength={1000}
              placeholder="Describe why this document should be reviewed..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-blue-950"
            />
            <p className="mt-1 text-right text-xs text-slate-400">
              {description.length}/1000
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit report
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReportDocumentModal;
