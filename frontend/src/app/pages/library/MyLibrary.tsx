import {
  Library,
  Search,
  Grid,
  List,
  FolderPlus,
  MoreHorizontal,
  FileText,
  ChevronDown,
  ChevronRight,
  File,
  FileVideo,
  Presentation,
  SlidersHorizontal,
  SortDesc,
  Star,
  RotateCcw,
  Trash2,
  Download,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useNavigate } from "react-router";

import { documentApi } from "../../services/documentApi";
import type { AiStatus } from "../../constants/documentStatus";

interface LibraryDocument {
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
  fav: boolean;
}

interface LibraryCategory {
  id: number;
  name: string;
  count: number;
  color: string;
}

const categoryColors = ["blue", "emerald", "purple", "amber"];
const viewToggleButtonBase =
  "flex h-9 w-9 items-center justify-center rounded-lg transition-all";
const categoryIconColorClass: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600 dark:bg-slate-800",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-slate-800",
  purple: "bg-purple-50 text-purple-600 dark:bg-slate-800",
  amber: "bg-amber-50 text-amber-600 dark:bg-slate-800",
};

const statusBadgeClass: Record<AiStatus, string> = {
  UPLOADED:
    "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-800",
  PROCESSING:
    "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:ring-orange-800",
  PROCESSED:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800",
  FAILED:
    "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-800",
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

const getFileExtension = (document: LibraryDocument) => {
  const extensionFromName = document.name.split(".").pop()?.toUpperCase();
  const extensionFromType = document.type.split("/").pop()?.toUpperCase();
  return extensionFromName && extensionFromName !== document.name.toUpperCase()
    ? extensionFromName
    : extensionFromType || "FILE";
};

const getFileIcon = (document: LibraryDocument): LucideIcon => {
  const extension = getFileExtension(document);

  if (extension.includes("PDF")) return FileText;
  if (extension.includes("DOC") || extension.includes("DOCX")) return FileText;
  if (extension.includes("PPT") || extension.includes("PPTX"))
    return Presentation;
  if (extension.includes("TXT")) return File;
  if (extension.includes("MP4")) return FileVideo;
  return FileText;
};

function CategoryCard({ category }: { category: LibraryCategory }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-colors hover:border-blue-100 hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/20"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${categoryIconColorClass[category.color]}`}
      >
        <Library className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
          {category.name}
        </h3>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {category.count} items
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
    </motion.div>
  );
}

function DocumentRow({
  document,
  onToggleFavorite,
  onDelete,
  onReprocess,
  onDownload,
}: {
  document: LibraryDocument;
  onToggleFavorite: (documentId: number) => void;
  onDelete: (documentId: number) => void;
  onReprocess: (documentId: number) => void;
  onDownload: (documentId: number, fileName: string) => void;
}) {
  const FileIcon = getFileIcon(document);
  const extension = getFileExtension(document);

  return (
    <div className="grid gap-3 border-t border-slate-100 bg-white p-4 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/70 md:grid-cols-[minmax(260px,2fr)_minmax(130px,0.8fr)_minmax(130px,0.8fr)_minmax(90px,0.6fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(120px,auto)] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
          <FileIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
            {document.name}
          </p>
          <p className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500">
            {extension}
          </p>
        </div>
      </div>

      <span className="inline-flex max-w-full rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <span className="truncate">{document.folder}</span>
      </span>

      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {document.date || "Unknown"}
      </p>

      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {(document.fileSize / 1024).toFixed(1)} KB
      </p>

      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800">
        {document.documentStatus}
      </span>

      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${statusBadgeClass[document.aiStatus]}`}
      >
        {document.aiStatus}
      </span>
      <div className="flex min-w-[120px] items-center justify-end gap-1">
        <button
          onClick={() => onToggleFavorite(document.id)}
          className={`rounded-lg p-2 transition-colors ${
            document.fav
              ? "text-amber-400"
              : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <Star className={`h-4 w-4 ${document.fav ? "fill-amber-400" : ""}`} />
        </button>

        <button onClick={() => onDownload(document.id, document.name)}>
          <Download className="h-4 w-4" />
        </button>

        <button onClick={() => onReprocess(document.id)}>
          <RotateCcw className="h-4 w-4" />
        </button>

        <button onClick={() => onDelete(document.id)}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function MyLibrary() {
  const navigate = useNavigate();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [statusFilter, setStatusFilter] = useState<AiStatus | "ALL">("ALL");
  const [uploadStatusFilter, setUploadStatusFilter] = useState<string>("ALL");
  const [aiStatusFilter, setAiStatusFilter] = useState<AiStatus | "ALL">("ALL");
  const [showUploadStatusMenu, setShowUploadStatusMenu] = useState(false);
  const [showAiStatusMenu, setShowAiStatusMenu] = useState(false);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await documentApi.getDocuments({
          page: 0,
          size: 100,
        });

        setDocuments(
          response.data.content.map((document) => ({
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
            fav: false,
          })),
        );
      } catch (error) {
        console.error("Cannot load library documents:", error);
        toast.error("Cannot load library documents.");
      }
    };

    loadDocuments();
  }, []);

  const toggleFavorite = (documentId: number) => {
    setDocuments((current) =>
      current.map((document) =>
        document.id === documentId
          ? { ...document, fav: !document.fav }
          : document,
      ),
    );
  };

  const handleDelete = async (documentId: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this document?",
    );
    if (!confirmed) return;

    try {
      await documentApi.deleteDocument(documentId);

      setDocuments((current) =>
        current.filter((document) => document.id !== documentId),
      );

      toast.success("Document deleted successfully.");
    } catch (error) {
      console.error("Cannot delete document:", error);
      toast.error("Cannot delete document.");
    }
  };

  const handleReprocess = async (documentId: number) => {
    try {
      await documentApi.reprocessDocument(documentId);
      toast.success("Document reprocess started.");
    } catch (error) {
      console.error("Cannot reprocess document:", error);
      toast.error("Cannot reprocess document.");
    }
  };

  const handleDownload = async (documentId: number, fileName: string) => {
    try {
      const response = await documentApi.downloadDocument(documentId);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement("a");

      link.href = url;
      link.download = fileName || "document";
      link.click();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Cannot download document:", error);
      toast.error("Cannot download document.");
    }
  };

  const categories = useMemo<LibraryCategory[]>(() => {
    const categoryMap = documents.reduce<Record<string, LibraryCategory>>(
      (map, document) => {
        const key = String(document.categoryId);

        if (!map[key]) {
          map[key] = {
            id: document.categoryId,
            name: document.folder,
            count: 0,
            color:
              categoryColors[Object.keys(map).length % categoryColors.length],
          };
        }

        map[key].count += 1;
        return map;
      },
      {},
    );

    return Object.values(categoryMap);
  }, [documents]);

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

    if (uploadStatusFilter !== "ALL") {
      result = result.filter(
        (document) => document.documentStatus === uploadStatusFilter,
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
  }, [documents, searchQuery, uploadStatusFilter, aiStatusFilter, sortOrder]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            My Library
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Your personalized knowledge base
          </p>
        </div>
        <div className="inline-flex w-full flex-wrap items-center gap-2 sm:w-auto md:justify-end">
          <div className="inline-flex h-10 shrink-0 items-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
            <button
              onClick={() => setView("grid")}
              className={`${viewToggleButtonBase} ${view === "grid" ? "bg-white shadow-sm text-blue-600" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
            >
              <Grid className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`${viewToggleButtonBase} ${view === "list" ? "bg-white shadow-sm text-blue-600" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
            >
              <List className="h-4.5 w-4.5" />
            </button>
          </div>
          <button
            onClick={() => navigate("/app/upload")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700"
          >
            <Upload className="h-4.5 w-4.5" />
            Upload Document
          </button>

          <button
            onClick={() => navigate("/app/categories")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700"
          >
            <FolderPlus className="h-4.5 w-4.5" />
            New Category
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Categories */}
        <motion.button
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/app/library/categories")}
          className="rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition-all hover:border-purple-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-300">
            <Library className="h-4.5 w-4.5" />
          </div>

          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {categories.length}
          </p>

          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Categories
          </p>
        </motion.button>
        {/* Total Documents */}
        <motion.button
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/app/library/documents")}
          className="rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
            <FileText className="h-4.5 w-4.5" />
          </div>

          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {documents.length}
          </p>

          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Total Documents
          </p>
        </motion.button>
      </div>

      {/* Categories Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Categories
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => navigate(`/app/library/categories/${category.id}`)}
              className="text-left"
            >
              <CategoryCard category={category} />
            </button>
          ))}
        </div>
      </section>
      {/* Documents Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Documents
          </h2>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {filteredDocuments.length} files
          </p>
        </div>
        {/* Search */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search document name..."
              className="h-12 w-full rounded-xl border border-slate-100 bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-800 dark:focus:bg-slate-900"
            />
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <div className="relative">
              <button
                onClick={() => setShowUploadStatusMenu(!showUploadStatusMenu)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {uploadStatusFilter === "ALL"
                  ? "Document Status"
                  : uploadStatusFilter}
                <ChevronDown className="h-4 w-4" />
              </button>

              {showUploadStatusMenu && (
                <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  {["ALL", "ACTIVE", "DELETED"].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setUploadStatusFilter(status);
                        setShowUploadStatusMenu(false);
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {status === "ALL" ? "All Documents" : status}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowAiStatusMenu(!showAiStatusMenu)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
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
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-800 dark:hover:text-blue-300"
            >
              <SortDesc className="h-4 w-4" />
              {sortOrder === "newest" ? "Newest first" : "Oldest first"}
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {view === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredDocuments.map((document) => {
              const FileIcon = getFileIcon(document);

              return (
                <motion.div
                  key={document.id}
                  whileHover={{ y: -3 }}
                  className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
                      <FileIcon className="h-5 w-5" />
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleFavorite(document.id)}
                        className={`rounded-lg p-2 ${
                          document.fav ? "text-amber-400" : "text-slate-400"
                        }`}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            document.fav ? "fill-amber-400" : ""
                          }`}
                        />
                      </button>

                      <button
                        onClick={() =>
                          handleDownload(document.id, document.name)
                        }
                      >
                        <Download className="h-4 w-4" />
                      </button>

                      <button onClick={() => handleReprocess(document.id)}>
                        <RotateCcw className="h-4 w-4" />
                      </button>

                      <button onClick={() => handleDelete(document.id)}>
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
                      className={`rounded-full px-2 py-1 text-[11px] font-extrabold ring-1 ${
                        statusBadgeClass[document.aiStatus]
                      }`}
                    >
                      {document.aiStatus}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="hidden bg-slate-50 px-4 py-3 text-[11px] font-extrabold uppercase text-slate-400 md:grid md:grid-cols-[minmax(260px,2fr)_minmax(130px,0.8fr)_minmax(130px,0.8fr)_minmax(90px,0.6fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(120px,auto)]">
              <span>Document Name</span>
              <span>Category</span>
              <span>Date Added</span>
              <span>Size</span>
              <span>Upload Status</span>
              <span>AI Status</span>
              <span className="text-right">Actions</span>
            </div>

            {filteredDocuments.length > 0 ? (
              filteredDocuments.map((document) => (
                <DocumentRow
                  key={document.id}
                  document={document}
                  onToggleFavorite={toggleFavorite}
                  onDelete={handleDelete}
                  onReprocess={handleReprocess}
                  onDownload={handleDownload}
                />
              ))
            ) : (
              <div className="border-t border-slate-100 px-4 py-16 text-center dark:border-slate-800">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 dark:bg-slate-800">
                  <Search className="h-6 w-6" />
                </div>

                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  No documents found
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Try a different search term.
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
