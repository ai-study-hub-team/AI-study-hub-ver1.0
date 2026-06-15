export type DocumentStatus = "ACTIVE" | "DELETED";

export type AiStatus = "UPLOADED" | "PROCESSING" | "PROCESSED" | "FAILED";

export interface StatusMeta {
  label: string;
  badgeClass: string;
  dotClass: string;
}

export const documentStatusMeta: Record<DocumentStatus, StatusMeta> = {
  ACTIVE: {
    label: "Active",
    badgeClass:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800",
    dotClass: "bg-emerald-500",
  },
  DELETED: {
    label: "Deleted",
    badgeClass:
      "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    dotClass: "bg-slate-400",
  },
};

export const aiStatusMeta: Record<AiStatus, StatusMeta> = {
  UPLOADED: {
    label: "Uploaded",
    badgeClass:
      "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-800",
    dotClass: "bg-blue-500",
  },
  PROCESSING: {
    label: "Processing",
    badgeClass:
      "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800",
    dotClass: "bg-amber-500 animate-pulse",
  },
  PROCESSED: {
    label: "Processed",
    badgeClass:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800",
    dotClass: "bg-emerald-500",
  },
  FAILED: {
    label: "Failed",
    badgeClass:
      "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-800",
    dotClass: "bg-red-500",
  },
};

export const documentStatusFilters = ["All", "ACTIVE", "DELETED"] as const;

export type DocumentStatusFilter = typeof documentStatusFilters[number];

export const aiStatusFilters = [
  "All",
  "UPLOADED",
  "PROCESSING",
  "PROCESSED",
  "FAILED",
] as const;

export type AiStatusFilter = typeof aiStatusFilters[number];