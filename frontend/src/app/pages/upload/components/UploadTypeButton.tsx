import type { UploadType } from "../types";

interface UploadTypeButtonProps {
  type: UploadType;
}

export function UploadTypeButton({ type }: UploadTypeButtonProps) {
  return (
    <button className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-bold text-slate-700 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/60 dark:hover:bg-blue-950/30">
      <type.icon className="h-4 w-4 shrink-0 text-blue-600" />
      <span className="min-w-0 truncate">{type.label}</span>
    </button>
  );
}
