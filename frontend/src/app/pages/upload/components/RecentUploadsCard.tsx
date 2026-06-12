import { FileText } from "lucide-react";
import { aiStatusFilters, aiStatusMeta, documentStatusMeta } from "../../../constants/documentStatus";
import type { RecentUpload, UploadFilter } from "../types";

interface RecentUploadsCardProps {
  uploads: RecentUpload[];
  activeFilter: UploadFilter;
  onFilterChange: (filter: UploadFilter) => void;
}

export function RecentUploadsCard({ uploads, activeFilter, onFilterChange }: RecentUploadsCardProps) {
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
            {filter === "All" ? "All" : aiStatusMeta[filter].label}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        <div className="hidden grid-cols-[minmax(0,1fr)_120px_120px] gap-3 px-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-400 lg:grid">
          <span>File</span>
          <span>Upload Status</span>
          <span>AI Status</span>
        </div>
        {uploads.map((upload) => {
          const aiStatus = aiStatusMeta[upload.aiStatus];
          const documentStatus = documentStatusMeta[upload.documentStatus];

          return (
            <div key={upload.id} className="grid gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800 lg:grid-cols-[minmax(0,1fr)_120px_120px] lg:items-center">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{upload.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {upload.type} - {upload.uploadedAt}
                  </p>
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-extrabold uppercase tracking-widest text-slate-400 lg:hidden">Upload Status</p>
                <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-extrabold ring-1 ${documentStatus.badgeClass}`}>
                  {documentStatus.label}
                </span>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-extrabold uppercase tracking-widest text-slate-400 lg:hidden">AI Status</p>
                <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-extrabold ring-1 ${aiStatus.badgeClass}`}>
                  {aiStatus.label}
                </span>
              </div>
            </div>
          );
        })}
        {uploads.length === 0 && (
          <p className="rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            No uploads match this filter.
          </p>
        )}
      </div>
    </section>
  );
}
