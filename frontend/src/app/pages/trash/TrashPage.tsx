import {
  AlertTriangle,
  ChevronDown,
  File,
  FileText,
  FileVideo,
  Grid,
  List,
  Presentation,
  RotateCcw,
  Search,
  SlidersHorizontal,
  SortDesc,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import axios from "axios";

import { ActionMenuItem, RowActionMenu } from "../../components/ui/RowActionMenu";
import type { AiStatus } from "../../constants/documentStatus";
import { documentApi } from "../../services/documentApi";
import type { DocumentListItemResponse } from "../../types/documents/types";

interface TrashDocument {
  id: number;
  name: string;
  category: string;
  type: string;
  aiStatus: AiStatus;
  fileSize: number;
  trashedAt: string | null;
  deleteAfter: string | null;
  remainingDays: number | null;
}

const viewToggleButtonBase =
  "flex h-9 w-9 items-center justify-center rounded-lg transition-all";

const statusBadgeClass: Record<AiStatus, string> = {
  UPLOADED:
    "rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-800",
  PROCESSING:
    "rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800",
  PROCESSED:
    "rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800",
  FAILED:
    "rounded-full bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-800",
};

const formatDateTime = (value: string | null): string => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getRemainingDays = (deleteAfter: string | null): number | null => {
  if (!deleteAfter) return null;
  const milliseconds = new Date(deleteAfter).getTime() - Date.now();
  if (Number.isNaN(milliseconds)) return null;
  return Math.max(0, Math.ceil(milliseconds / 86_400_000));
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};

const getFileExtension = (document: TrashDocument): string => {
  const extensionFromName = document.name.split(".").pop()?.toUpperCase();
  const extensionFromType = document.type.split("/").pop()?.toUpperCase();
  return extensionFromName && extensionFromName !== document.name.toUpperCase()
    ? extensionFromName
    : extensionFromType || "FILE";
};

const getFileIcon = (document: TrashDocument): LucideIcon => {
  const extension = getFileExtension(document);
  if (extension.includes("PDF")) return FileText;
  if (extension.includes("DOC")) return FileText;
  if (extension.includes("PPT")) return Presentation;
  if (extension.includes("TXT")) return File;
  if (extension.includes("MP4")) return FileVideo;
  return FileText;
};

const toTrashDocument = (document: DocumentListItemResponse): TrashDocument => ({
  id: document.id,
  name: document.title || document.originalName || document.fileName,
  category: document.categoryName || "Uncategorized",
  type: document.type || document.fileType || "FILE",
  aiStatus: document.aiStatus,
  fileSize: document.fileSize ?? 0,
  trashedAt: document.trashedAt ?? null,
  deleteAfter: document.deleteAfter ?? null,
  remainingDays: getRemainingDays(document.deleteAfter ?? null),
});

export function TrashPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [documents, setDocuments] = useState<TrashDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [aiStatusFilter, setAiStatusFilter] = useState<AiStatus | "ALL">("ALL");
  const [showAiStatusMenu, setShowAiStatusMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [deleteDocument, setDeleteDocument] = useState<TrashDocument | null>(null);

  const loadTrashDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await documentApi.getTrashDocuments();
      // GET /api/documents/trash already returns only trashed documents.
      // Do not filter again on the client, because older backend builds may
      // serialize the boolean property as `trashed` instead of `isTrashed`.
      setDocuments(response.data.map(toTrashDocument));
    } catch (error) {
      console.error("Cannot load trash documents:", error);
      toast.error(getErrorMessage(error, "Cannot load trash documents."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTrashDocuments();
  }, [loadTrashDocuments]);

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    let result = [...documents];

    if (normalizedQuery) {
      result = result.filter((document) =>
        [document.name, document.category, document.type, document.aiStatus].some(
          (value) => value.toLowerCase().includes(normalizedQuery),
        ),
      );
    }

    if (aiStatusFilter !== "ALL") {
      result = result.filter((document) => document.aiStatus === aiStatusFilter);
    }

    result.sort((first, second) => {
      const firstTime = new Date(first.trashedAt ?? 0).getTime();
      const secondTime = new Date(second.trashedAt ?? 0).getTime();
      return sortOrder === "newest" ? secondTime - firstTime : firstTime - secondTime;
    });

    return result;
  }, [documents, searchQuery, aiStatusFilter, sortOrder]);

  const handleRestore = async (document: TrashDocument) => {
    if (pendingId !== null) return;

    setPendingId(document.id);
    try {
      await documentApi.restoreDocument(document.id);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
    } catch (error) {
      toast.error(getErrorMessage(error, "Cannot restore this document."));
      if (axios.isAxiosError(error) && [404, 409].includes(error.response?.status ?? 0)) {
        void loadTrashDocuments();
      }
    } finally {
      setPendingId(null);
    }
  };

  const handleDeleteForever = async () => {
    if (!deleteDocument || pendingId !== null) return;

    const document = deleteDocument;
    setPendingId(document.id);
    try {
      await documentApi.permanentlyDeleteDocument(document.id);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      setDeleteDocument(null);
      toast.success("Document permanently deleted.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Cannot permanently delete this document."));
      if (axios.isAxiosError(error) && [404, 409].includes(error.response?.status ?? 0)) {
        setDeleteDocument(null);
        void loadTrashDocuments();
      }
    } finally {
      setPendingId(null);
    }
  };

  const renderRetentionText = (document: TrashDocument) => {
    if (document.remainingDays === null) return "Deletion date unavailable";
    if (document.remainingDays === 0) return "Expired; pending scheduled cleanup";
    return `${document.remainingDays} day${document.remainingDays === 1 ? "" : "s"} remaining`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Trash</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Documents are permanently deleted after 30 days.
          </p>
        </div>
        <div className="inline-flex h-10 shrink-0 items-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
          <button aria-label="Grid view" onClick={() => setView("grid")} className={`${viewToggleButtonBase} ${view === "grid" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 dark:text-slate-400"}`}><Grid className="h-4.5 w-4.5" /></button>
          <button aria-label="List view" onClick={() => setView("list")} className={`${viewToggleButtonBase} ${view === "list" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 dark:text-slate-400"}`}><List className="h-4.5 w-4.5" /></button>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Deleted Documents</h2>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{filteredDocuments.length} files</p>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search trash..." className="h-12 w-full rounded-xl border border-slate-100 bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <div className="relative">
              <button onClick={() => setShowAiStatusMenu((current) => !current)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 hover:border-blue-200 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><SlidersHorizontal className="h-4 w-4" />{aiStatusFilter === "ALL" ? "AI Status" : aiStatusFilter}<ChevronDown className="h-4 w-4" /></button>
              {showAiStatusMenu && <div className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">{(["ALL", "UPLOADED", "PROCESSING", "PROCESSED", "FAILED"] as const).map((status) => <button key={status} onClick={() => { setAiStatusFilter(status); setShowAiStatusMenu(false); }} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800">{status === "ALL" ? "All AI" : status}</button>)}</div>}
            </div>
            <button onClick={() => setSortOrder((current) => current === "newest" ? "oldest" : "newest")} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 hover:border-blue-200 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><SortDesc className="h-4 w-4" />{sortOrder === "newest" ? "Newest first" : "Oldest first"}<ChevronDown className="h-4 w-4" /></button>
          </div>
        </div>

        {loading ? (
          <div className="mt-4 rounded-2xl border border-slate-100 bg-white px-4 py-16 text-center text-sm font-semibold text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">Loading trash...</div>
        ) : filteredDocuments.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-100 bg-white px-4 py-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 dark:bg-slate-800"><Trash2 className="h-6 w-6" /></div><h3 className="font-bold text-slate-900 dark:text-slate-100">Trash is empty</h3><p className="text-sm text-slate-500 dark:text-slate-400">Documents moved to trash will appear here.</p></div>
        ) : view === "grid" ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredDocuments.map((document) => { const FileIcon = getFileIcon(document); return <motion.div key={document.id} whileHover={{ y: -3 }} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-4 flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300"><FileIcon className="h-5 w-5" /></div><RowActionMenu><ActionMenuItem icon={RotateCcw} label={pendingId === document.id ? "Working..." : "Restore"} onClick={() => void handleRestore(document)} /><ActionMenuItem icon={Trash2} label="Delete forever" onClick={() => setDeleteDocument(document)} danger /></RowActionMenu></div><h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{document.name}</h3><p className="mt-1 text-xs font-semibold text-slate-500">Trashed {formatDateTime(document.trashedAt)}</p><div className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300"><AlertTriangle className="h-3.5 w-3.5" />{renderRetentionText(document)}</div><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800"><span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{document.category}</span><span className={`rounded-full px-2 py-1 text-[11px] font-extrabold ring-1 ${statusBadgeClass[document.aiStatus]}`}>{document.aiStatus}</span></div></motion.div>; })}
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="hidden bg-slate-50 px-4 py-3 text-[11px] font-extrabold uppercase text-slate-400 md:grid md:grid-cols-[minmax(240px,2fr)_minmax(150px,1fr)_minmax(180px,1fr)_minmax(120px,0.8fr)_72px]"><span>Document</span><span>Trashed At</span><span>Auto Delete</span><span>Size</span><span className="text-center">Actions</span></div>
            {filteredDocuments.map((document) => { const FileIcon = getFileIcon(document); return <div key={document.id} className="grid gap-3 border-t border-slate-100 p-4 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/70 md:grid-cols-[minmax(240px,2fr)_minmax(150px,1fr)_minmax(180px,1fr)_minmax(120px,0.8fr)_72px] md:items-center"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"><FileIcon className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{document.name}</p><p className="text-[11px] font-bold uppercase text-slate-400">{getFileExtension(document)}</p></div></div><p className="text-sm font-semibold text-slate-500">{formatDateTime(document.trashedAt)}</p><div><p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{formatDateTime(document.deleteAfter)}</p><p className="text-xs text-amber-600">{renderRetentionText(document)}</p></div><p className="text-sm font-semibold text-slate-500">{(document.fileSize / 1024).toFixed(1)} KB</p><div className="flex min-w-[72px] items-center justify-center"><RowActionMenu><ActionMenuItem icon={RotateCcw} label="Restore" onClick={() => void handleRestore(document)} /><ActionMenuItem icon={Trash2} label="Delete forever" onClick={() => setDeleteDocument(document)} danger /></RowActionMenu></div></div>; })}
          </div>
        )}
      </section>

      {deleteDocument !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && pendingId === null) {
              setDeleteDocument(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-trash-document-title"
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
              <Trash2 className="h-6 w-6" />
            </div>

            <h2
              id="delete-trash-document-title"
              className="mt-5 text-2xl font-extrabold text-slate-950 dark:text-white"
            >
              Delete document permanently?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              <span className="break-all font-bold text-slate-800 dark:text-slate-200">
                {deleteDocument.name}
              </span>{" "}
              will be permanently deleted. This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={pendingId !== null}
                onClick={() => setDeleteDocument(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pendingId !== null}
                onClick={() => void handleDeleteForever()}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingId === deleteDocument.id ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
