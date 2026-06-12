export type DocumentStatus = "UPLOADING" | "UPLOADED" | "UPLOAD_FAILED" | "DELETED";

export type AiStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

export interface StatusMeta {
  label: string;
  badgeClass: string;
  dotClass: string;
}

export const documentStatusMeta: Record<DocumentStatus, StatusMeta> = {
  UPLOADING: {
    label: "Uploading",
    badgeClass: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-800",
    dotClass: "bg-blue-500 animate-pulse",
  },
  UPLOADED: {
    label: "Uploaded",
    badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800",
    dotClass: "bg-emerald-500",
  },
  UPLOAD_FAILED: {
    label: "Upload Failed",
    badgeClass: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-800",
    dotClass: "bg-red-500",
  },
  DELETED: {
    label: "Deleted",
    badgeClass: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    dotClass: "bg-slate-400",
  },
};

export const aiStatusMeta: Record<AiStatus, StatusMeta> = {
  PENDING: {
    label: "Pending",
    badgeClass: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800",
    dotClass: "bg-amber-500",
  },
  PROCESSING: {
    label: "Processing",
    badgeClass: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800",
    dotClass: "bg-amber-500 animate-pulse",
  },
  READY: {
    label: "Ready",
    badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800",
    dotClass: "bg-emerald-500",
  },
  FAILED: {
    label: "Failed",
    badgeClass: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-800",
    dotClass: "bg-red-500",
  },
};

export const aiStatusFilters = ["All", "PENDING", "PROCESSING", "READY", "FAILED"] as const;

export type AiStatusFilter = typeof aiStatusFilters[number];
