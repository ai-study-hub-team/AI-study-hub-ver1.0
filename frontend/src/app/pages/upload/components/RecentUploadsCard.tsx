import { FileText, Share2 } from "lucide-react";
import { aiStatusFilters, aiStatusMeta, documentStatusMeta } from "../../../constants/documentStatus";
import { useCreatePublicLink } from "../../../hooks/useCreatePublicLink";
import type { RecentUpload, UploadFilter } from "../types";

interface RecentUploadsCardProps {
  uploads: RecentUpload[];
  activeFilter: UploadFilter;
  onFilterChange: (filter: UploadFilter) => void;
}

interface StatusBadgeProps {
  label: string;
  badgeClass: string;
}

interface UploadStatusBlockProps {
  title: string;
  status: StatusBadgeProps;
}

interface RecentUploadItemProps {
  upload: RecentUpload;
  onShare: (documentId: number) => void | Promise<void>;
  sharingDocumentId: number | null;
}

function StatusBadge({ label, badgeClass }: StatusBadgeProps) {
  return (
    <span className={`inline-flex max-w-full items-center rounded-full px-2 py-1 text-[11px] font-extrabold ring-1 ${badgeClass}`}>
      <span className="truncate whitespace-nowrap">{label}</span>
    </span>
  );
}

function UploadStatusBlock({ title, status }: UploadStatusBlockProps) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">{title}</p>
      <StatusBadge label={status.label} badgeClass={status.badgeClass} />
    </div>
  );
}

function RecentUploadItem({
  upload,
  onShare,
  sharingDocumentId,
}: RecentUploadItemProps) {
  const aiStatus = aiStatusMeta[upload.aiStatus];
  const documentStatus = documentStatusMeta[upload.documentStatus];

  return (
    <div className="grid min-h-[112px] gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_max-content] items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <FileText className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{upload.name}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <time className="whitespace-nowrap pt-0.5 text-right text-xs font-bold text-slate-400 dark:text-slate-500">
            {upload.uploadedAt}
          </time>

          <button
            type="button"
            onClick={() => onShare(upload.id)}
            disabled={sharingDocumentId === upload.id}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-blue-300"
            title="Share document"
            aria-label="Share document"
          >
            <Share2
              className={`h-4 w-4 ${
                sharingDocumentId === upload.id ? "animate-pulse" : ""
              }`}
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-2">
        <UploadStatusBlock title="Upload Status" status={documentStatus} />
        <UploadStatusBlock title="AI Status" status={aiStatus} />
      </div>
    </div>
  );
}

export function RecentUploadsCard({ uploads, activeFilter, onFilterChange }: RecentUploadsCardProps) {
  const { createAndCopyPublicLink, loadingDocumentId } =
    useCreatePublicLink();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4">
        <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">Recent Uploads</h2>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {aiStatusFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => onFilterChange(filter)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeFilter === filter
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            <span className="whitespace-nowrap">{filter === "All" ? "All" : aiStatusMeta[filter].label}</span>
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {uploads.map((upload) => (
          <RecentUploadItem
            key={upload.id}
            upload={upload}
            onShare={createAndCopyPublicLink}
            sharingDocumentId={loadingDocumentId}
          />
        ))}
        {uploads.length === 0 && (
          <p className="rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            No uploads match this filter.
          </p>
        )}
      </div>
    </section>
  );
}
