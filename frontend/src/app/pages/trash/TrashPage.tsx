import {
  Search,
  Grid,
  List,
  FileText,
  File,
  FileVideo,
  Presentation,
  SlidersHorizontal,
  SortDesc,
  RotateCcw,
  Trash2,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { documentApi } from "../../services/documentApi";
import { getCurrentUserId } from "../../services/apiClient";
import type { AiStatus } from "../../constants/documentStatus";

interface TrashDocument {
  id: number;
  categoryId: number;
  name: string;
  folder: string;
  date: string;
  createdAt: string;
  type: string;
  aiStatus: AiStatus;
  documentStatus: string;
  fileSize: number;
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

const formatDocumentDate = (date: string | undefined) => {
  if (!date) return "";

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return date;

  return parsedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getFileExtension = (document: TrashDocument) => {
  const extensionFromName = document.name.split(".").pop()?.toUpperCase();
  const extensionFromType = document.type.split("/").pop()?.toUpperCase();

  return extensionFromName && extensionFromName !== document.name.toUpperCase()
    ? extensionFromName
    : extensionFromType || "FILE";
};

const getFileIcon = (document: TrashDocument): LucideIcon => {
  const extension = getFileExtension(document);

  if (extension.includes("PDF")) return FileText;
  if (extension.includes("DOC") || extension.includes("DOCX")) return FileText;
  if (extension.includes("PPT") || extension.includes("PPTX")) {
    return Presentation;
  }
  if (extension.includes("TXT")) return File;
  if (extension.includes("MP4")) return FileVideo;

  return FileText;
};

export function TrashPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [documents, setDocuments] = useState<TrashDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [aiStatusFilter, setAiStatusFilter] = useState<AiStatus | "ALL">("ALL");
  const [showAiStatusMenu, setShowAiStatusMenu] = useState(false);

  useEffect(() => {
    const loadTrashDocuments = async () => {
      try {
        const userId = getCurrentUserId();

        if (!userId) {
          toast.error("Please log in again to view trash.");
          return;
        }

        const response = await documentApi.getDocuments({
          page: 0,
          size: 100,
          processStatus: undefined,
        });

        const deletedDocuments = response.data.content.filter(
          (document) => document.documentStatus === "DELETED",
        );

        setDocuments(
          deletedDocuments.map((document) => ({
            id: document.id,
            categoryId: document.categoryId,
            name: document.title || document.originalName || document.fileName,
            folder: document.categoryName || "Uncategorized",
            date: formatDocumentDate(document.createdAt),
            createdAt: document.createdAt,
            type: document.type,
            aiStatus: document.aiStatus,
            documentStatus: document.documentStatus,
            fileSize: document.fileSize ?? 0,
          })),
        );
      } catch (error) {
        console.error("Cannot load trash documents:", error);
        toast.error("Cannot load trash documents.");
      }
    };

    loadTrashDocuments();
  }, []);

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    let result = [...documents];

    if (normalizedQuery) {
      result = result.filter((document) =>
        [
          document.name,
          document.folder,
          document.type,
          document.aiStatus,
          document.documentStatus,
          String(document.fileSize),
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(normalizedQuery),
        ),
      );
    }

    if (aiStatusFilter !== "ALL") {
      result = result.filter(
        (document) => document.aiStatus === aiStatusFilter,
      );
    }

    result.sort((a, b) => {
      const firstTime = new Date(a.createdAt).getTime();
      const secondTime = new Date(b.createdAt).getTime();

      return sortOrder === "newest"
        ? secondTime - firstTime
        : firstTime - secondTime;
    });

    return result;
  }, [documents, searchQuery, aiStatusFilter, sortOrder]);

  const handleRestore = (documentId: number) => {
    toast.info(`Restore document ${documentId} - cần BE API restore.`);
  };

  const handleDeleteForever = (documentId: number) => {
    toast.info(
      `Delete forever document ${documentId} - cần BE API permanent delete.`,
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            Trash
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Deleted documents will appear here
          </p>
        </div>

        <div className="inline-flex h-10 shrink-0 items-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
          <button
            onClick={() => setView("grid")}
            className={`${viewToggleButtonBase} ${
              view === "grid"
                ? "bg-white shadow-sm text-blue-600"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <Grid className="h-4.5 w-4.5" />
          </button>

          <button
            onClick={() => setView("list")}
            className={`${viewToggleButtonBase} ${
              view === "list"
                ? "bg-white shadow-sm text-blue-600"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <List className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Deleted Documents
          </h2>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {filteredDocuments.length} files
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search deleted document..."
              className="h-12 w-full rounded-xl border border-slate-100 bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <div className="relative">
              <button
                onClick={() => setShowAiStatusMenu(!showAiStatusMenu)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 hover:border-blue-200 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {aiStatusFilter === "ALL" ? "AI Status" : aiStatusFilter}
                <ChevronDown className="h-4 w-4" />
              </button>

              {showAiStatusMenu && (
                <div className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  {["ALL", "UPLOADED", "PROCESSING", "PROCESSED", "FAILED"].map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setAiStatusFilter(status as AiStatus | "ALL");
                          setShowAiStatusMenu(false);
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        {status === "ALL" ? "All AI" : status}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() =>
                setSortOrder((current) =>
                  current === "newest" ? "oldest" : "newest",
                )
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 hover:border-blue-200 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <SortDesc className="h-4 w-4" />
              {sortOrder === "newest" ? "Newest first" : "Oldest first"}
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {view === "grid" ? (
          filteredDocuments.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-100 bg-white px-4 py-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 dark:bg-slate-800">
                <Trash2 className="h-6 w-6" />
              </div>

              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                Trash is empty
              </h3>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Deleted documents will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredDocuments.map((document) => {
                const FileIcon = getFileIcon(document);

                return (
                  <motion.div
                    key={document.id}
                    whileHover={{ y: -3 }}
                    className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300">
                        <FileIcon className="h-5 w-5" />
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleRestore(document.id)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteForever(document.id)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                      {document.name}
                    </h3>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {getFileExtension(document)}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {document.folder}
                      </span>

                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-extrabold ring-1 ${statusBadgeClass[document.aiStatus]}`}
                      >
                        {document.aiStatus}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="hidden bg-slate-50 px-4 py-3 text-[11px] font-extrabold uppercase text-slate-400 md:grid md:grid-cols-[minmax(260px,2fr)_minmax(130px,0.8fr)_minmax(130px,0.8fr)_minmax(90px,0.6fr)_minmax(150px,1fr)_minmax(120px,auto)]">
              <span>Document Name</span>
              <span>Category</span>
              <span>Deleted Date</span>
              <span>Size</span>
              <span>AI Status</span>
              <span className="text-right">Actions</span>
            </div>

            {filteredDocuments.map((document) => {
              const FileIcon = getFileIcon(document);

              return (
                <div
                  key={document.id}
                  className="grid gap-3 border-t border-slate-100 bg-white p-4 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/70 md:grid-cols-[minmax(260px,2fr)_minmax(130px,0.8fr)_minmax(130px,0.8fr)_minmax(90px,0.6fr)_minmax(150px,1fr)_minmax(120px,auto)] md:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300">
                      <FileIcon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                        {document.name}
                      </p>
                      <p className="text-[11px] font-bold uppercase text-slate-400">
                        {getFileExtension(document)}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex w-fit rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {document.folder || "Uncategorized"}
                  </span>

                  <p className="text-sm font-semibold text-slate-500">
                    {document.date || "Unknown"}
                  </p>

                  <p className="text-sm font-semibold text-slate-500">
                    {(document.fileSize / 1024).toFixed(1)} KB
                  </p>

                  <span
                    className={`inline-flex w-fit px-2.5 py-1 text-[11px] font-extrabold ${statusBadgeClass[document.aiStatus]}`}
                  >
                    {document.aiStatus}
                  </span>

                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleRestore(document.id)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteForever(document.id)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredDocuments.length === 0 && (
              <div className="border-t border-slate-100 px-4 py-16 text-center dark:border-slate-800">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 dark:bg-slate-800">
                  <Trash2 className="h-6 w-6" />
                </div>

                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  Trash is empty
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Deleted documents will appear here.
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
