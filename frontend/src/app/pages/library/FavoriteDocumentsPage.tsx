import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Grid3X3,
  List,
  Pencil,
  RotateCcw,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { documentApi } from "../../services/documentApi";
import {
  favoriteApi,
  type FavoriteDocument,
  type FavoriteDocumentPageResponse,
} from "../../services/favoriteApi";
import type { AiStatus } from "../../constants/documentStatus";
import { useTheme } from "../../../layouts/ThemeProvider";
import { getCurrentUserId } from "../../services/apiClient";
import { filterMyDocuments } from "../../utils/documentOwnership";

interface FavoriteLibraryDocument {
  favoriteId: number;
  id: number;
  name: string;
  description: string;
  folder: string;
  date: string;
  type: string;
  aiStatus: AiStatus;
  documentStatus: string;
  visibility: string;
  ownerName: string;
  fav: boolean;
}

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

const favoriteListGridClass =
  "grid grid-cols-[320px_180px_150px_150px_150px_220px] items-center";

const actionIconButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300";

const deleteIconButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-950/30 dark:hover:text-red-300";

const mapAiStatus = (status: string | undefined): AiStatus => {
  if (status === "PROCESSING") return "PROCESSING";
  if (status === "PROCESSED") return "PROCESSED";
  if (status === "FAILED") return "FAILED";
  return "UPLOADED";
};

const formatDocumentDate = (date: string | undefined) => {
  if (!date) return "Unknown";

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return date;

  return parsedDate.toLocaleDateString("vi-VN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getFileExtension = (document: FavoriteLibraryDocument) => {
  const extensionFromName = document.name.split(".").pop()?.toUpperCase();
  const extensionFromType = document.type?.split("/").pop()?.toUpperCase();

  return extensionFromName && extensionFromName !== document.name.toUpperCase()
    ? extensionFromName
    : extensionFromType || "FILE";
};

const mapFavoriteDocument = (
  document: FavoriteDocument,
): FavoriteLibraryDocument => ({
  favoriteId: document.favoriteId,
  id: document.documentId,
  name: document.title || "Untitled document",
  description: document.description || "",
  folder: "Favorite",
  date: formatDocumentDate(document.favoritedAt),
  type: document.fileType || "",
  aiStatus: mapAiStatus(document.processStatus),
  documentStatus: "ACTIVE",
  visibility: document.visibility || "PRIVATE",
  ownerName: document.ownerName || "Unknown",
  fav: true,
});

function FavoriteDocumentRow({
  document,
  onToggleFavorite,
  onDelete,
  onReprocess,
  onDownload,
  onViewFile,
  onEdit,
}: {
  document: FavoriteLibraryDocument;
  onToggleFavorite: (documentId: number) => void | Promise<void>;
  onDelete: (documentId: number) => void;
  onReprocess: (documentId: number) => void;
  onDownload: (documentId: number, fileName: string) => void;
  onViewFile: (documentId: number) => void;
  onEdit: (document: FavoriteLibraryDocument) => void;
}) {
  return (
    <div
      className={`${favoriteListGridClass} border-t border-slate-100 bg-white px-4 py-4 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/70`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
          <FileText className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
            {document.name}
          </p>
          <p className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500">
            {getFileExtension(document)}
          </p>
        </div>
      </div>

      <p className="truncate text-sm font-semibold text-slate-500 dark:text-slate-400">
        {document.ownerName}
      </p>

      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {document.date}
      </p>

      <span className="inline-flex w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
        {document.visibility}
      </span>

      <span
        className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${statusBadgeClass[document.aiStatus]}`}
      >
        {document.aiStatus}
      </span>

      <div className="flex min-w-[220px] items-center justify-end gap-1">
        <button
          onClick={() => onToggleFavorite(document.id)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-amber-400 transition-colors hover:bg-amber-50 dark:hover:bg-amber-950/30"
          title="Remove from favorites"
        >
          <Star className="h-4 w-4 fill-amber-400" />
        </button>

        <button
          onClick={() => onViewFile(document.id)}
          className={actionIconButtonClass}
          title="View file"
        >
          <Eye className="h-4 w-4" />
        </button>

        <button
          onClick={() => onEdit(document)}
          className={actionIconButtonClass}
          title="Rename"
        >
          <Pencil className="h-4 w-4" />
        </button>

        <button
          onClick={() => onDownload(document.id, document.name)}
          className={actionIconButtonClass}
          title="Download"
        >
          <Download className="h-4 w-4" />
        </button>

        <button
          onClick={() => onReprocess(document.id)}
          className={actionIconButtonClass}
          title="Reprocess"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          onClick={() => onDelete(document.id)}
          className={deleteIconButtonClass}
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function FavoriteDocumentCard({
  document,
  onToggleFavorite,
  onDelete,
  onReprocess,
  onDownload,
  onViewFile,
  onEdit,
}: {
  document: FavoriteLibraryDocument;
  onToggleFavorite: (documentId: number) => void | Promise<void>;
  onDelete: (documentId: number) => void;
  onReprocess: (documentId: number) => void;
  onDownload: (documentId: number, fileName: string) => void;
  onViewFile: (documentId: number) => void;
  onEdit: (document: FavoriteLibraryDocument) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
          <FileText className="h-6 w-6" />
        </div>

        <button
          onClick={() => onToggleFavorite(document.id)}
          className="rounded-lg p-2 text-amber-400 transition-colors hover:bg-amber-50 dark:hover:bg-amber-950/30"
          title="Remove from favorites"
        >
          <Star className="h-4 w-4 fill-amber-400" />
        </button>
      </div>

      <div className="mt-4">
        <h3 className="line-clamp-2 min-h-[40px] text-sm font-extrabold text-slate-900 dark:text-slate-100">
          {document.name}
        </h3>

        <p className="mt-1 text-[11px] font-bold uppercase text-slate-400">
          {getFileExtension(document)}
        </p>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-slate-400">Owner</span>
          <span className="truncate font-bold text-slate-600 dark:text-slate-300">
            {document.ownerName}
          </span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-slate-400">Favorited</span>
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {document.date}
          </span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-slate-400">Visibility</span>
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {document.visibility}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-400">AI Status</span>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${statusBadgeClass[document.aiStatus]}`}
          >
            {document.aiStatus}
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-1 border-t border-slate-100 pt-4 dark:border-slate-800">
        <button
          onClick={() => onViewFile(document.id)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          title="View file"
        >
          <Eye className="h-4 w-4" />
        </button>

        <button
          onClick={() => onEdit(document)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          title="Rename"
        >
          <Pencil className="h-4 w-4" />
        </button>

        <button
          onClick={() => onDownload(document.id, document.name)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </button>

        <button
          onClick={() => onReprocess(document.id)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          title="Reprocess"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          onClick={() => onDelete(document.id)}
          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function EmptyFavorites() {
  return (
    <div className="border-t border-slate-100 px-4 py-16 text-center dark:border-slate-800">
      <Star className="mx-auto mb-3 h-10 w-10 text-slate-300" />
      <h3 className="font-bold text-slate-900 dark:text-slate-100">
        No favorite documents yet
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Click the star icon on a document to add it here.
      </p>
    </div>
  );
}

export function FavoriteDocumentsPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [documents, setDocuments] = useState<FavoriteLibraryDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [editingDocument, setEditingDocument] =
    useState<FavoriteLibraryDocument | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const loadFavorites = async () => {
    try {
      setIsLoading(true);

      const userId = getCurrentUserId();

      if (!userId) {
        toast.error("Please log in again to view favorite documents.");
        setDocuments([]);
        return;
      }

      const response = await favoriteApi.getFavorites(0, 100);
      const data = response.data as FavoriteDocumentPageResponse;
      const myFavorites = filterMyDocuments(data.content ?? [], userId);

      setDocuments(myFavorites.map(mapFavoriteDocument));
    } catch (error) {
      console.error(error);
      toast.error("Failed to load favorite documents");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleRemoveFavorite = async (documentId: number) => {
    try {
      await favoriteApi.removeFavorite(documentId);

      setDocuments((current) =>
        current.filter((document) => document.id !== documentId),
      );

      toast.success("Removed from favorites");
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove favorite");
    }
  };

  const handleDelete = async (documentId: number): Promise<boolean> => {
    try {
      await documentApi.deleteDocument(documentId);

      setDocuments((current) =>
        current.filter((document) => document.id !== documentId),
      );

      toast.success("Document deleted successfully.");
      return true;
    } catch (error) {
      console.error("Cannot delete document:", error);
      toast.error("Cannot delete document.");
      return false;
    }
  };

  const handleReprocess = async (documentId: number) => {
    try {
      await documentApi.reprocessDocument(documentId);
      toast.success("Document reprocess started.");
      await loadFavorites();
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

  const handleViewFile = (documentId: number) => {
    navigate(`/app/library/${documentId}/preview`);
  };

  const handleOpenEdit = (document: FavoriteLibraryDocument) => {
    setEditingDocument(document);
    setEditTitle(document.name);
  };

  const handleUpdateDocumentName = async () => {
    if (!editingDocument) return;

    const title = editTitle.trim();

    if (!title) {
      toast.error("Document name cannot be empty.");
      return;
    }

    try {
      await documentApi.updateDocument(editingDocument.id, { title });
      await loadFavorites();
      toast.success("Document name updated successfully.");
      setEditingDocument(null);
      setEditTitle("");
    } catch (error) {
      console.error("Cannot update document name:", error);
      toast.error("Cannot update document name.");
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/app/library")}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Library
      </button>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100">
            Favorite Documents
          </h1>

          <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">
            Documents you marked as favorite.
          </p>
        </div>

        <div className="inline-flex w-full flex-wrap items-center gap-2 sm:w-auto md:justify-end">
          <div className="inline-flex h-10 shrink-0 items-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                viewMode === "grid"
                  ? theme === "dark"
                    ? "bg-slate-700 text-blue-300 shadow-none"
                    : "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Grid3X3 className="h-4.5 w-4.5" />
            </button>

            <button
              onClick={() => setViewMode("list")}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                viewMode === "list"
                  ? theme === "dark"
                    ? "bg-slate-700 text-blue-300 shadow-none"
                    : "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <List className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="min-w-[1170px]">
            <div
              className={`${favoriteListGridClass} border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:bg-slate-900/60`}
            >
              <div>Document Name</div>
              <div>Owner</div>
              <div>Favorited At</div>
              <div>Visibility</div>
              <div>AI Status</div>
              <div className="text-right">Actions</div>
            </div>

            {isLoading ? (
              <div className="border-t border-slate-100 px-4 py-16 text-center dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Loading favorite documents...
                </p>
              </div>
            ) : documents.length > 0 ? (
              documents.map((document) => (
                <FavoriteDocumentRow
                  key={document.favoriteId}
                  document={document}
                  onToggleFavorite={handleRemoveFavorite}
                  onDelete={setDeleteId}
                  onReprocess={handleReprocess}
                  onDownload={handleDownload}
                  onViewFile={handleViewFile}
                  onEdit={handleOpenEdit}
                />
              ))
            ) : (
              <EmptyFavorites />
            )}
          </div>
        </div>
      ) : (
        <div>
          {isLoading ? (
            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Loading favorite documents...
              </p>
            </div>
          ) : documents.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {documents.map((document) => (
                <FavoriteDocumentCard
                  key={document.favoriteId}
                  document={document}
                  onToggleFavorite={handleRemoveFavorite}
                  onDelete={setDeleteId}
                  onReprocess={handleReprocess}
                  onDownload={handleDownload}
                  onViewFile={handleViewFile}
                  onEdit={handleOpenEdit}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <EmptyFavorites />
            </div>
          )}
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
              Delete Document
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to delete this document? This action cannot
              be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  if (deleteId === null) return;

                  const success = await handleDelete(deleteId);

                  if (success) {
                    setDeleteId(null);
                  }
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {editingDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
              Rename Document
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Only the document name can be changed.
            </p>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                Document name
              </label>

              <input
                type="text"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-800"
                placeholder="Enter document name"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingDocument(null);
                  setEditTitle("");
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>

              <button
                onClick={handleUpdateDocumentName}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                <Save className="h-4 w-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
