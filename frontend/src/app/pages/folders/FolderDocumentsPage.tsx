import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Folder,
  FolderPlus,
  Grid3X3,
  List,
  Pencil,
  RotateCcw,
  Save,
  Search,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { folderApi, type FolderResponse } from "../../services/folderApi";
import { categoryApi, type CategoryResponse } from "../../services/categoryApi";
import { documentApi } from "../../services/documentApi";
import { getCurrentUserId } from "../../services/apiClient";
import { filterMyDocuments } from "../../utils/documentOwnership";
import type { DocumentListItemResponse } from "../../types/documents/types";
import type { AiStatus } from "../../constants/documentStatus";
import { useTheme } from "../../../layouts/ThemeProvider";

type ListResponse<T> = T[] | { content?: T[] };

interface LibraryDocument {
  id: number;
  categoryId: number;
  name: string;
  category: string;
  date: string;
  createdAt: string;
  type: string;
  aiStatus: AiStatus;
  documentStatus: string;
  fileSize: number;
  fav: boolean;
}

type DocumentApiItem = DocumentListItemResponse & {
  title?: string;
  originalName?: string;
  fileName?: string;
  categoryName?: string;
  uploadedAt?: string;
  createdAt?: string;
  documentStatus?: string;
  fileSize?: number;
};

const normalizeList = <T,>(data: ListResponse<T> | null | undefined): T[] => {
  if (Array.isArray(data)) return data;
  return data?.content ?? [];
};

const formatDate = (value?: string) => {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
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

const getSafeUserId = (): number | null => {
  const rawUserId = getCurrentUserId();
  const userId = Number(rawUserId);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return userId;
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

const documentListGridClass =
  "grid grid-cols-[320px_150px_150px_120px_150px_150px_220px] items-center";

const actionIconButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300";

const deleteIconButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-950/30 dark:hover:text-red-300";

const getFileExtension = (document: LibraryDocument) => {
  const extensionFromName = document.name.split(".").pop()?.toUpperCase();
  const extensionFromType = document.type.split("/").pop()?.toUpperCase();

  return extensionFromName && extensionFromName !== document.name.toUpperCase()
    ? extensionFromName
    : extensionFromType || "FILE";
};

function DocumentRow({
  document,
  onToggleFavorite,
  onDelete,
  onReprocess,
  onDownload,
  onViewFile,
  onEdit,
}: {
  document: LibraryDocument;
  onToggleFavorite: (documentId: number) => void;
  onDelete: (documentId: number) => void;
  onReprocess: (documentId: number) => void;
  onDownload: (documentId: number, fileName: string) => void;
  onViewFile: (documentId: number) => void;
  onEdit: (document: LibraryDocument) => void;
}) {
  return (
    <div
      className={`${documentListGridClass} border-t border-slate-100 bg-white px-4 py-4 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/70`}
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

      <span className="inline-flex w-fit max-w-[140px] rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <span className="truncate">{document.category || "Uncategorized"}</span>
      </span>

      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {document.date}
      </p>

      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {(document.fileSize / 1024).toFixed(1)} KB
      </p>

      <span className="inline-flex w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800">
        {document.documentStatus}
      </span>

      <span
        className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${statusBadgeClass[document.aiStatus]}`}
      >
        {document.aiStatus}
      </span>

      <div className="flex min-w-[220px] items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => onToggleFavorite(document.id)}
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
            document.fav
              ? "text-amber-400"
              : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          }`}
          title="Favorite"
        >
          <Star className={`h-4 w-4 ${document.fav ? "fill-amber-400" : ""}`} />
        </button>

        <button
          type="button"
          onClick={() => onViewFile(document.id)}
          className={actionIconButtonClass}
          title="View file"
        >
          <Eye className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onEdit(document)}
          className={actionIconButtonClass}
          title="Rename"
        >
          <Pencil className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onDownload(document.id, document.name)}
          className={actionIconButtonClass}
          title="Download"
        >
          <Download className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onReprocess(document.id)}
          className={actionIconButtonClass}
          title="Reprocess"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          type="button"
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

function DocumentCard({
  document,
  onToggleFavorite,
  onDelete,
  onReprocess,
  onDownload,
  onViewFile,
  onEdit,
}: {
  document: LibraryDocument;
  onToggleFavorite: (documentId: number) => void;
  onDelete: (documentId: number) => void;
  onReprocess: (documentId: number) => void;
  onDownload: (documentId: number, fileName: string) => void;
  onViewFile: (documentId: number) => void;
  onEdit: (document: LibraryDocument) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
          <FileText className="h-6 w-6" />
        </div>

        <button
          type="button"
          onClick={() => onToggleFavorite(document.id)}
          className={`rounded-lg p-2 transition-colors ${
            document.fav ? "text-amber-400" : "text-slate-400"
          }`}
          title="Favorite"
        >
          <Star className={`h-4 w-4 ${document.fav ? "fill-amber-400" : ""}`} />
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
          <span className="text-slate-400">Category</span>
          <span className="truncate font-bold text-slate-600 dark:text-slate-300">
            {document.category || "Uncategorized"}
          </span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-slate-400">Date</span>
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {document.date}
          </span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-slate-400">Size</span>
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {(document.fileSize / 1024).toFixed(1)} KB
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-400">Upload Status</span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800">
            {document.documentStatus}
          </span>
        </div>

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
          type="button"
          onClick={() => onViewFile(document.id)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          title="View file"
        >
          <Eye className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onEdit(document)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          title="Rename"
        >
          <Pencil className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onDownload(document.id, document.name)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onReprocess(document.id)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          title="Reprocess"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          type="button"
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

function EmptyDocuments({
  onUpload,
}: {
  onUpload: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        <FileText className="h-7 w-7" />
      </div>

      <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-200">
        No documents in this folder.
      </p>

      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Upload a document and choose this folder.
      </p>

      <button
        type="button"
        onClick={onUpload}
        className="mt-4 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
      >
        Upload Document
      </button>
    </div>
  );
}

export function FolderDocumentsPage() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const currentFolderId = Number(folderId);

  const [folder, setFolder] = useState<FolderResponse | null>(null);
  const [folders, setFolders] = useState<FolderResponse[]>([]);
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [search, setSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [deleteDocumentId, setDeleteDocumentId] = useState<number | null>(null);
  const [editingDocument, setEditingDocument] =
    useState<LibraryDocument | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const goToUploadWithCurrentFolder = () => {
    navigate(`/app/upload?folderId=${currentFolderId}`);
  };

  const loadData = useCallback(async () => {
    if (!Number.isInteger(currentFolderId) || currentFolderId <= 0) {
      toast.error("Invalid folder id.");
      navigate("/app/folders");
      return;
    }

    const userId = getSafeUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    try {
      setIsLoading(true);

const [folderResponse, foldersResponse, categoriesResponse, documentsResponse] =
  await Promise.all([
    folderApi.getFolderById(currentFolderId, userId),
    folderApi.getFolders(userId),
    categoryApi.getCategories(),
    documentApi.getDocuments({
      page: 0,
      size: 1000,
      folderId: currentFolderId,
    }),
  ]);

      const currentFolder = folderResponse.data;

      setFolder(currentFolder);

      const folderData = normalizeList<FolderResponse>(
        foldersResponse.data as ListResponse<FolderResponse>,
      ).filter((item) => Number(item.userId) === userId);

      setFolders(folderData);

      const categoryData = normalizeList<CategoryResponse>(
        categoriesResponse.data as ListResponse<CategoryResponse>,
      );

      const categoryNameById = new Map(
        categoryData.map((category) => [Number(category.id), category.name]),
      );

      const rawDocuments = filterMyDocuments(
        normalizeList<DocumentApiItem>(
          documentsResponse.data as ListResponse<DocumentApiItem>,
        ),
        userId,
      );

      setDocuments(
        rawDocuments.map((document) => ({
          id: document.id,
          categoryId: document.categoryId,
          name:
            document.title ||
            document.originalName ||
            document.fileName ||
            document.name ||
            "Untitled document",
          category:
            document.categoryName ||
            categoryNameById.get(Number(document.categoryId)) ||
            "Uncategorized",
          date: formatDocumentDate(document.createdAt || document.uploadedAt),
          createdAt: document.createdAt || document.uploadedAt || "",
          type: document.type || "FILE",
          aiStatus: document.aiStatus,
          documentStatus: document.documentStatus || "UPLOADED",
          fileSize: document.fileSize ?? 0,
          fav: false,
        })),
      );
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot load folder.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentFolderId, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const subfolders = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return folders
      .filter((item) => Number(item.parentFolderId) === currentFolderId)
      .filter((item) => {
        if (!keyword) return true;

        return (
          item.name?.toLowerCase().includes(keyword) ||
          item.description?.toLowerCase().includes(keyword)
        );
      });
  }, [folders, currentFolderId, search]);

  const filteredDocuments = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return documents;

    return documents.filter((document) => {
      return (
        document.name?.toLowerCase().includes(keyword) ||
        document.type?.toLowerCase().includes(keyword) ||
        document.category?.toLowerCase().includes(keyword) ||
        document.aiStatus?.toLowerCase().includes(keyword) ||
        document.documentStatus?.toLowerCase().includes(keyword)
      );
    });
  }, [documents, search]);

  const handleCreateSubfolder = async () => {
    if (!name.trim()) {
      toast.error("Please enter folder name.");
      return;
    }

    const userId = getSafeUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    try {
      await folderApi.createFolder({
        name: name.trim(),
        description: description.trim(),
        userId,
        parentFolderId: currentFolderId,
      });

      toast.success("Subfolder created.");
      setName("");
      setDescription("");
      await loadData();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot create subfolder.",
      );
    }
  };

  const openEditModal = async (id: number) => {
    const userId = getSafeUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    try {
      const response = await folderApi.getFolderById(id, userId);
      const selectedFolder = response.data;

      setEditId(selectedFolder.id);
      setEditName(selectedFolder.name ?? "");
      setEditDescription(selectedFolder.description ?? "");
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot load folder detail.",
      );
    }
  };

  const handleUpdateFolder = async () => {
    if (editId === null) return;

    if (!editName.trim()) {
      toast.error("Please enter folder name.");
      return;
    }

    const userId = getSafeUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    const currentItem = folders.find((item) => item.id === editId);

    try {
      await folderApi.updateFolder(editId, {
        name: editName.trim(),
        description: editDescription.trim(),
        userId,
        parentFolderId: currentItem?.parentFolderId ?? null,
      });

      toast.success("Folder updated.");
      setEditId(null);
      setEditName("");
      setEditDescription("");
      await loadData();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot update folder.",
      );
    }
  };

  const handleDeleteFolder = async (id: number): Promise<boolean> => {
    const selectedFolder = folders.find((item) => item.id === id);

    if (!selectedFolder) {
      toast.error("Folder not found.");
      return false;
    }

    if (
      (selectedFolder.documentCount ?? 0) > 0 ||
      (selectedFolder.childFolderCount ?? 0) > 0
    ) {
      toast.error("Cannot delete folder that contains documents or subfolders.");
      return false;
    }

    const userId = getSafeUserId();

    if (!userId) {
      toast.error("Please login again.");
      return false;
    }

    try {
      await folderApi.deleteFolder(id, userId);

      toast.success("Folder deleted.");
      await loadData();
      return true;
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot delete folder.",
      );
      return false;
    }
  };

  const toggleFavorite = (documentId: number) => {
    setDocuments((current) =>
      current.map((document) =>
        document.id === documentId
          ? { ...document, fav: !document.fav }
          : document,
      ),
    );
  };

  const handleDeleteDocument = async (
    documentId: number,
  ): Promise<boolean> => {
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
      await loadData();
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

  const handleOpenEditDocument = (document: LibraryDocument) => {
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
      await loadData();
      toast.success("Document name updated successfully.");
      setEditingDocument(null);
      setEditTitle("");
    } catch (error) {
      console.error("Cannot update document name:", error);
      toast.error("Cannot update document name.");
    }
  };

  const deletingFolder =
    deleteId !== null ? folders.find((item) => item.id === deleteId) : null;

  const cannotDelete =
    (deletingFolder?.documentCount ?? 0) > 0 ||
    (deletingFolder?.childFolderCount ?? 0) > 0;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        Loading folder...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <button
            type="button"
            onClick={() =>
              folder?.parentFolderId
                ? navigate(`/app/folders/${folder.parentFolderId}`)
                : navigate("/app/folders")
            }
            className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
            Folder
          </p>

          <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">
            {folder?.name || "Folder"}
          </h1>

          <p className="mt-1 text-slate-500 dark:text-slate-400">
            {folder?.description?.trim() || "No description"}
          </p>

          <p className="mt-2 text-sm font-semibold text-slate-400 dark:text-slate-500">
            {documents.length}{" "}
            {documents.length === 1 ? "document" : "documents"} ·{" "}
            {subfolders.length}{" "}
            {subfolders.length === 1 ? "subfolder" : "subfolders"} · Updated{" "}
            {formatDate(folder?.updatedAt)}
          </p>
        </div>

        <button
          type="button"
          onClick={goToUploadWithCurrentFolder}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          <UploadCloud className="h-4 w-4" />
          Upload Document
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Subfolder name"
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />

          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description"
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <button
          type="button"
          onClick={handleCreateSubfolder}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          <FolderPlus className="h-4 w-4" />
          Create Subfolder
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
          <Search className="h-4 w-4 text-slate-400" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search folder, document, category, type, status..."
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-extrabold text-slate-950 dark:text-white">
          Subfolders
        </h2>

        {subfolders.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {subfolders.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/app/folders/${item.id}`)}
                className="group flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
                    <Folder className="h-6 w-6" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-extrabold text-slate-950 dark:text-white">
                      {item.name}
                    </p>

                    <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                      {item.description?.trim() || "No description"}
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-400 dark:text-slate-500">
                      {item.documentCount ?? 0}{" "}
                      {(item.documentCount ?? 0) === 1
                        ? "document"
                        : "documents"}{" "}
                      · {item.childFolderCount ?? 0}{" "}
                      {(item.childFolderCount ?? 0) === 1
                        ? "subfolder"
                        : "subfolders"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openEditModal(item.id);
                    }}
                    className="rounded-lg p-2 text-blue-500 opacity-100 transition hover:bg-blue-50 md:opacity-0 md:group-hover:opacity-100 dark:hover:bg-blue-950/30"
                    title="Edit folder"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeleteId(item.id);
                    }}
                    className="rounded-lg p-2 text-red-500 opacity-100 transition hover:bg-red-50 md:opacity-0 md:group-hover:opacity-100 dark:hover:bg-red-950/30"
                    title="Delete folder"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No subfolders in this folder.
            </p>
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">
            Documents
          </h2>

          <div className="inline-flex h-10 shrink-0 items-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
            <button
              type="button"
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
              type="button"
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

        {viewMode === "list" ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="min-w-[1260px]">
              <div
                className={`${documentListGridClass} border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:bg-slate-900/60`}
              >
                <div>Document Name</div>
                <div>Category</div>
                <div>Date Added</div>
                <div>Size</div>
                <div>Upload Status</div>
                <div>AI Status</div>
                <div className="text-right">Actions</div>
              </div>

              {filteredDocuments.length > 0 ? (
                filteredDocuments.map((document) => (
                  <DocumentRow
                    key={document.id}
                    document={document}
                    onToggleFavorite={toggleFavorite}
                    onDelete={setDeleteDocumentId}
                    onReprocess={handleReprocess}
                    onDownload={handleDownload}
                    onViewFile={handleViewFile}
                    onEdit={handleOpenEditDocument}
                  />
                ))
              ) : (
                <div className="border-t border-slate-100 px-4 py-16 text-center dark:border-slate-800">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    No documents found
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Upload a document to see it here.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : filteredDocuments.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredDocuments.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onToggleFavorite={toggleFavorite}
                onDelete={setDeleteDocumentId}
                onReprocess={handleReprocess}
                onDownload={handleDownload}
                onViewFile={handleViewFile}
                onEdit={handleOpenEditDocument}
              />
            ))}
          </div>
        ) : (
          <EmptyDocuments onUpload={goToUploadWithCurrentFolder} />
        )}
      </section>

      {editId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
              Edit Folder
            </h2>

            <div className="mt-5 space-y-4">
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                placeholder="Folder name"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              <input
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                placeholder="Description"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setEditName("");
                  setEditDescription("");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpdateFolder}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
              Delete Folder
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to delete this folder?
            </p>

            {cannotDelete && (
              <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">
                This folder contains {deletingFolder?.documentCount ?? 0}{" "}
                {(deletingFolder?.documentCount ?? 0) === 1
                  ? "document"
                  : "documents"}{" "}
                and {deletingFolder?.childFolderCount ?? 0}{" "}
                {(deletingFolder?.childFolderCount ?? 0) === 1
                  ? "subfolder"
                  : "subfolders"}
                . Please move or delete them first.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (deleteId === null) return;

                  const success = await handleDeleteFolder(deleteId);

                  if (success) {
                    setDeleteId(null);
                  }
                }}
                disabled={cannotDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300 dark:disabled:bg-red-900"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteDocumentId !== null && (
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
                type="button"
                onClick={() => setDeleteDocumentId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (deleteDocumentId === null) return;

                  const success = await handleDeleteDocument(deleteDocumentId);

                  if (success) {
                    setDeleteDocumentId(null);
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
                type="button"
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
                type="button"
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