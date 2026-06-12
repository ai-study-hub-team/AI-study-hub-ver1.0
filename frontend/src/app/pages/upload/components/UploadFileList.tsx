import { FileText, X } from "lucide-react";

interface UploadFileListProps {
  files: File[];
  onRemove: (index: number) => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadFileList({ files, onRemove }: UploadFileListProps) {
  if (files.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
        No files selected yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file, index) => (
        <div
          key={`${file.name}-${file.lastModified}-${index}`}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{file.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{formatSize(file.size)}</p>
          </div>
          <button
            onClick={() => onRemove(index)}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
            title="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
