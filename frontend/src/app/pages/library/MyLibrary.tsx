import {
  Library,
  Grid,
  List,
  Folder,
  FolderPlus,
  MoveRight,
  FileText,
  ChevronRight,
  File,
  FileVideo,
  Presentation,
  Star,
  RotateCcw,
  Trash2,
  Download,
  Share2,
  Upload,
  Eye,
  Pencil,
  Save,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useNavigate } from "react-router";

import { favoriteApi, type FavoriteDocument } from "../../services/favoriteApi";

import { categoryApi, type CategoryResponse } from "../../services/categoryApi";
import { documentApi } from "../../services/documentApi";
import { folderApi } from "../../services/folderApi";
import { getCurrentUserId } from "../../services/apiClient";
import type { AiStatus } from "../../constants/documentStatus";
import { filterMyDocuments } from "../../utils/documentOwnership";
import { useCreatePublicLink } from "../../hooks/useCreatePublicLink";
import { FolderShareModal } from "./components/FolderShareModal";

interface LibraryDocument {
  id: number;
  categoryId: number | null;
  categoryName: string;
  folderId: number | null;
  folderName: string;
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
  description: string;
  userId: number;
  count: number;
  color: string;
}

interface LibraryFolder {
  id: number;
  name: string;
  description: string;
  userId: number;
  parentFolderId: number | null;
  parentFolderName: string | null;
  documentCount: number;
  childFolderCount: number;
  createdAt: string;
  updatedAt: string;
}

const categoryColors = ["blue", "emerald", "purple", "amber"];
const viewToggleButtonBase =
  "flex h-9 w-9 items-center justify-center rounded-lg transition-all";
const actionIconButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-blue-300";

const deleteIconButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-950/30 dark:hover:text-red-300";
const categoryIconColorClass: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600 dark:bg-slate-800",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-slate-800",
  purple: "bg-purple-50 text-purple-600 dark:bg-slate-800",
  amber: "bg-amber-50 text-amber-600 dark:bg-slate-800",
};

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

function CategoryCard({
  category,
  onClick,
  onEdit,
  onDelete,
  allowActions = true,
}: {
  category: LibraryCategory;
  onClick: () => void;
  onEdit: (category: LibraryCategory) => void;
  onDelete: (categoryId: number) => void;
  allowActions?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      onClick={onClick}
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
        <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
          {category.description || "No description"}
        </p>
        <p className="mt-3 text-sm font-semibold text-slate-400">
          {category.count} items
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {allowActions && (
          <>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onEdit(category);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
              title="Edit category"
            >
              <Pencil className="h-4 w-4" />
            </button>

            <button
              onClick={(event) => {
                event.stopPropagation();
                onDelete(category.id);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
              title="Delete category"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}

        <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
      </div>
    </motion.div>
  );
}

function FolderCard({
  folder,
  isActive,
  onClick,
  onEdit,
  onDelete,
  onMove,
  onShare,
}: {
  folder: LibraryFolder;
  isActive: boolean;
  onClick: () => void;
  onEdit: (folder: LibraryFolder) => void;
  onDelete: (folderId: number) => void;
  onMove: (folder: LibraryFolder) => void;
  onShare: (folder: LibraryFolder) => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      onClick={onClick}
      className={`group flex cursor-pointer items-center gap-4 rounded-2xl border p-4 text-left shadow-sm transition-colors ${
        isActive
          ? "border-blue-200 bg-blue-50/70 dark:border-blue-800 dark:bg-blue-950/30"
          : "border-slate-100 bg-white hover:border-blue-100 hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/20"
      }`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-300">
        <Folder className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
          {folder.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
          {folder.description || "No description"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-400">
          <span>{folder.documentCount} documents</span>
          <span>•</span>
          <span>{folder.childFolderCount} subfolders</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onShare(folder);
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
          title="Share folder"
          aria-label="Share folder"
        >
          <Share2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onMove(folder);
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
          title="Move folder"
        >
          <MoveRight className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(folder);
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
          title="Edit folder"
        >
          <Pencil className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(folder.id);
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
          title="Delete folder"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
      </div>
    </motion.div>
  );
}

function DocumentRow({
  document,
  onToggleFavorite,
  onDelete,
  onReprocess,
  onDownload,
  onShare,
  sharingDocumentId,
  onViewFile,
  onEdit,
  onMove,
}: {
  document: LibraryDocument;
  onToggleFavorite: (documentId: number) => void | Promise<void>;
  onDelete: (documentId: number) => void;
  onReprocess: (documentId: number) => void;
  onDownload: (documentId: number, fileName: string) => void;
  onShare: (documentId: number) => void | Promise<void>;
  sharingDocumentId: number | null;
  onViewFile: (documentId: number) => void;
  onEdit: (document: LibraryDocument) => void;
  onMove: (document: LibraryDocument) => void;
}) {
  const FileIcon = getFileIcon(document);
  const extension = getFileExtension(document);

  return (
    <div className="grid grid-cols-[320px_150px_150px_150px_120px_150px_150px_300px] items-center border-t border-slate-100 bg-white px-4 py-4 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/70">
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

      <span className="inline-flex w-fit rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {document.categoryName || "Uncategorized"}
      </span>

      <span className="inline-flex w-fit rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
        {document.folderName || "Root"}
      </span>

      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {document.date || "Unknown"}
      </p>

      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {(document.fileSize / 1024).toFixed(1)} KB
      </p>

      <span className="inline-flex w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800">
        {document.documentStatus}
      </span>

      <span
        className={`inline-flex w-fit px-2.5 py-1 text-[11px] font-extrabold ${statusBadgeClass[document.aiStatus]}`}
      >
        {document.aiStatus}
      </span>
      <div className="flex min-w-[300px] items-center justify-end gap-1">
        <button
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
          onClick={() => onMove(document)}
          className={actionIconButtonClass}
          title="Move"
        >
          <Folder className="h-4 w-4" />
        </button>

        <button
          onClick={() => onDownload(document.id, document.name)}
          className={actionIconButtonClass}
          title="Download"
        >
          <Download className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onShare(document.id)}
          disabled={sharingDocumentId === document.id}
          className={actionIconButtonClass}
          title="Share document"
          aria-label="Share document"
        >
          <Share2
            className={`h-4 w-4 ${
              sharingDocumentId === document.id ? "animate-pulse" : ""
            }`}
          />
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

export function MyLibrary() {
  const navigate = useNavigate();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryResponse[]>([]);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editDocument, setEditDocument] = useState<LibraryDocument | null>(
    null,
  );
  const [editName, setEditName] = useState("");
  const [editingCategory, setEditingCategory] =
    useState<CategoryResponse | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryDescription, setEditCategoryDescription] = useState("");
  const [deleteCategoryId, setDeleteCategoryId] = useState<number | null>(null);
  const { createAndCopyPublicLink, loadingDocumentId } = useCreatePublicLink();
  const [editingFolder, setEditingFolder] = useState<LibraryFolder | null>(
    null,
  );
  const [editFolderName, setEditFolderName] = useState("");
  const [editFolderDescription, setEditFolderDescription] = useState("");
  const [deleteFolderId, setDeleteFolderId] = useState<number | null>(null);
  const [movingFolder, setMovingFolder] = useState<LibraryFolder | null>(null);
  const [moveFolderTargetId, setMoveFolderTargetId] = useState<string>("root");
  const [movingDocument, setMovingDocument] = useState<LibraryDocument | null>(
    null,
  );
  const [sharingFolder, setSharingFolder] = useState<LibraryFolder | null>(null);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string>("root");

  const mapLibraryDocument = (
    document: any,
    favoriteMap: Record<number, boolean> = {},
  ): LibraryDocument => ({
    id: document.id,
    categoryId: document.categoryId ?? document.category?.id ?? null,
    categoryName:
      document.categoryName || document.category?.name || "Uncategorized",
    folderId: document.folderId ?? document.folder?.id ?? null,
    folderName: document.folderName || document.folder?.name || "Root",
    name: document.title || document.originalName || document.fileName,
    folder: document.folderName || document.folder?.name || "Root",
    date: formatDocumentDate(document.createdAt),
    createdAt: document.createdAt,
    type: document.type || document.fileType,
    aiStatus: document.aiStatus,
    documentStatus: document.documentStatus,
    fileSize: document.fileSize ?? 0,
    fav: Boolean(favoriteMap[document.id]),
  });

  const loadFolders = async () => {
    try {
      const rawUserId = getCurrentUserId();
      const userId = Number(rawUserId);

      if (!Number.isInteger(userId) || userId <= 0) {
        toast.error("Please log in again to view your folders.");
        setFolders([]);
        return;
      }

      const response = await folderApi.getFolders(userId);
      setFolders(response.data ?? []);
    } catch (error) {
      console.error("Cannot load folders:", error);
      toast.error("Cannot load folders.");
    }
  };

  const loadCategories = async () => {
    try {
      const rawUserId = getCurrentUserId();
      const userId = Number(rawUserId);

      console.log("Current user id:", rawUserId, userId);

      if (!Number.isInteger(userId) || userId <= 0) {
        toast.error("Please log in again to view your categories.");
        setAllCategories([]);
        return;
      }

      const response = await categoryApi.getCategories();

      console.log("All categories from API:", response.data);

      const myCategories = (response.data ?? []).filter(
        (category) => Number(category.userId) === userId,
      );

      console.log("My categories after filter:", myCategories);

      setAllCategories(myCategories);
    } catch (error) {
      console.error("Cannot load categories:", error);
      toast.error("Cannot load categories.");
    }
  };

  useEffect(() => {
    loadCategories();
    loadFolders();
  }, []);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const userId = getCurrentUserId();

        if (!userId) {
          toast.error("Please log in again to view your documents.");
          setDocuments([]);
          return;
        }

        const [documentResponse, favoriteResponse] = await Promise.all([
          documentApi.getDocuments({
            page: 0,
            size: 100,
          }),
          favoriteApi.getFavorites(0, 100),
        ]);

        const favoriteDocuments = favoriteResponse.data.content ?? [];
        const myFavoriteDocuments = filterMyDocuments(
          favoriteDocuments,
          userId,
        );
        const myDocuments = filterMyDocuments(
          documentResponse.data.content ?? [],
          userId,
        );

        const favoriteMap = myFavoriteDocuments.reduce<Record<number, boolean>>(
          (current, favorite: FavoriteDocument) => {
            current[favorite.documentId] = true;
            return current;
          },
          {},
        );

        setDocuments(
          myDocuments.map((document) =>
            mapLibraryDocument(document, favoriteMap),
          ),
        );
      } catch (error) {
        console.error("Cannot load library documents:", error);
        toast.error("Cannot load library documents.");
      }
    };

    loadDocuments();
  }, []);

  const toggleFavorite = async (documentId: number) => {
    const currentDocument = documents.find(
      (document) => document.id === documentId,
    );

    if (!currentDocument) return;

    try {
      if (currentDocument.fav) {
        await favoriteApi.removeFavorite(documentId);

        setDocuments((current) =>
          current.map((document) =>
            document.id === documentId ? { ...document, fav: false } : document,
          ),
        );

        toast.success("Removed from favorites");
      } else {
        await favoriteApi.addFavorite(documentId);

        setDocuments((current) =>
          current.map((document) =>
            document.id === documentId ? { ...document, fav: true } : document,
          ),
        );

        toast.success("Added to favorites");
      }
    } catch (error) {
      console.error("Cannot update favorite:", error);
      toast.error("Cannot update favorite.");
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

  const handleOpenEdit = (document: LibraryDocument) => {
    setEditDocument(document);
    setEditName(document.name);
  };

  const handleOpenMoveDocument = (document: LibraryDocument) => {
    setMovingDocument(document);
    setMoveTargetFolderId(
      document.folderId === null || document.folderId === undefined
        ? "root"
        : String(document.folderId),
    );
  };

  const handleMoveDocument = async () => {
    if (!movingDocument) return;

    const rawUserId = getCurrentUserId();
    const userId = Number(rawUserId);

    if (!Number.isInteger(userId) || userId <= 0) {
      toast.error("Please log in again to move this document.");
      return;
    }

    const folderId =
      moveTargetFolderId === "root" ? null : Number(moveTargetFolderId);

    if (folderId !== null && !Number.isInteger(folderId)) {
      toast.error("Invalid folder selected.");
      return;
    }

    const targetFolder = folders.find(
      (folder) => Number(folder.id) === Number(folderId),
    );

    try {
      await documentApi.moveDocumentToFolder(movingDocument.id, {
        userId,
        folderId,
      });

      setDocuments((current) =>
        current.map((document) =>
          document.id === movingDocument.id
            ? {
                ...document,
                folderId,
                folderName: targetFolder?.name || "Root",
                folder: targetFolder?.name || "Root",
              }
            : document,
        ),
      );

      toast.success(
        folderId === null
          ? "Document moved to Root."
          : `Document moved to ${targetFolder?.name || "folder"}.`,
      );

      setMovingDocument(null);
      setMoveTargetFolderId("root");
      await loadFolders();
    } catch (error: any) {
      console.error("Cannot move document:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot move document.",
      );
    }
  };

  const handleUpdateDocumentName = async () => {
    if (!editDocument) return;

    const newName = editName.trim();

    if (!newName) {
      toast.error("Document name cannot be empty.");
      return;
    }

    try {
      const response = await documentApi.updateDocument(editDocument.id, {
        title: newName,
      });

      setDocuments((current) =>
        current.map((document) =>
          document.id === editDocument.id
            ? {
                ...document,
                name: response.data.name || newName,
              }
            : document,
        ),
      );

      toast.success("Document name updated successfully.");
      setEditDocument(null);
      setEditName("");
    } catch (error) {
      console.error("Cannot update document name:", error);
      toast.error("Cannot update document name.");
    }
  };

  const handleOpenEditCategory = (category: LibraryCategory) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setEditCategoryDescription(category.description ?? "");
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    if (!editCategoryName.trim()) {
      toast.error("Category name is required.");
      return;
    }

    try {
      await categoryApi.updateCategory(editingCategory.id, {
        name: editCategoryName.trim(),
        description: editCategoryDescription.trim(),
        userId: editingCategory.userId,
      });

      toast.success("Category updated.");
      setEditingCategory(null);
      setEditCategoryName("");
      setEditCategoryDescription("");
      await loadCategories();
    } catch (error) {
      console.error("Cannot update category:", error);
      toast.error("Cannot update category.");
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return;

    const itemCount = documents.filter(
      (document) => Number(document.categoryId) === Number(deleteCategoryId),
    ).length;

    if (itemCount > 0) {
      toast.error("Cannot delete category that contains documents.");
      return;
    }

    try {
      await categoryApi.deleteCategory(deleteCategoryId);

      toast.success("Category deleted.");
      setDeleteCategoryId(null);
      await loadCategories();
    } catch (error: any) {
      console.error("Cannot delete category:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot delete category.",
      );
    }
  };

  const handleOpenEditFolder = (folder: LibraryFolder) => {
    setEditingFolder(folder);
    setEditFolderName(folder.name);
    setEditFolderDescription(folder.description ?? "");
  };

  const handleOpenMoveFolder = (folder: LibraryFolder) => {
    setMovingFolder(folder);
    setMoveFolderTargetId(
      folder.parentFolderId === null || folder.parentFolderId === undefined
        ? "root"
        : String(folder.parentFolderId),
    );
  };

  const handleMoveFolder = async () => {
    if (!movingFolder) return;

    const rawUserId = getCurrentUserId();
    const userId = Number(rawUserId);

    if (!Number.isInteger(userId) || userId <= 0) {
      toast.error("Please log in again to move this folder.");
      return;
    }

    const parentFolderId =
      moveFolderTargetId === "root" ? null : Number(moveFolderTargetId);

    if (
      parentFolderId !== null &&
      Number(parentFolderId) === Number(movingFolder.id)
    ) {
      toast.error("Cannot move folder into itself.");
      return;
    }

    try {
      await folderApi.updateFolder(movingFolder.id, {
        name: movingFolder.name,
        description: movingFolder.description ?? "",
        userId,
        parentFolderId,
      });

      toast.success(
        parentFolderId === null
          ? "Folder moved to Root."
          : "Folder moved successfully.",
      );

      setMovingFolder(null);
      setMoveFolderTargetId("root");
      await loadFolders();
    } catch (error: any) {
      console.error("Cannot move folder:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot move folder.",
      );
    }
  };

  const handleUpdateFolder = async () => {
    if (!editingFolder) return;

    if (!editFolderName.trim()) {
      toast.error("Folder name is required.");
      return;
    }

    try {
      await folderApi.updateFolder(editingFolder.id, {
        name: editFolderName.trim(),
        description: editFolderDescription.trim(),
        userId: editingFolder.userId,
        parentFolderId: editingFolder.parentFolderId ?? null,
      });

      toast.success("Folder updated.");
      setEditingFolder(null);
      setEditFolderName("");
      setEditFolderDescription("");
      await loadFolders();
    } catch (error: any) {
      console.error("Cannot update folder:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot update folder.",
      );
    }
  };

  const moveFolderContentToRoot = async (folderId: number, userId: number) => {
    const documentsInFolder = documents.filter(
      (document) => Number(document.folderId) === Number(folderId),
    );

    await Promise.all(
      documentsInFolder.map((document) =>
        documentApi.moveDocumentToFolder(document.id, {
          userId,
          folderId: null,
        }),
      ),
    );

    const childFolders = folders.filter(
      (folder) => Number(folder.parentFolderId) === Number(folderId),
    );

    await Promise.all(
      childFolders.map((folder) =>
        folderApi.updateFolder(folder.id, {
          name: folder.name,
          description: folder.description ?? "",
          userId,
          parentFolderId: null,
        }),
      ),
    );
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolderId) return;

    const folder = folders.find(
      (item) => Number(item.id) === Number(deleteFolderId),
    );

    if (!folder) {
      toast.error("Folder not found.");
      return;
    }

    const rawUserId = getCurrentUserId();
    const userId = Number(rawUserId);

    if (!Number.isInteger(userId) || userId <= 0) {
      toast.error("Please log in again to delete this folder.");
      return;
    }

    try {
      await moveFolderContentToRoot(deleteFolderId, userId);
      await folderApi.deleteFolder(deleteFolderId, userId);

      setDocuments((current) =>
        current.map((document) =>
          Number(document.folderId) === Number(deleteFolderId)
            ? {
                ...document,
                folderId: null,
                folderName: "Root",
                folder: "Root",
              }
            : document,
        ),
      );

      toast.success("Folder deleted. Documents and subfolders moved to Root.");
      setDeleteFolderId(null);
      await loadFolders();
    } catch (error: any) {
      console.error("Cannot delete folder:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot delete folder.",
      );
    }
  };

  const categories = useMemo<LibraryCategory[]>(() => {
    const mappedCategories = allCategories.map((category, index) => {
      const count = documents.filter(
        (document) => Number(document.categoryId) === Number(category.id),
      ).length;

      return {
        id: category.id,
        name: category.name,
        description: category.description ?? "",
        userId: category.userId,
        count,
        color: categoryColors[index % categoryColors.length],
      };
    });

    const noCategoryCount = documents.filter(
      (document) =>
        document.categoryId === null ||
        document.categoryId === undefined ||
        !allCategories.some(
          (category) => Number(category.id) === Number(document.categoryId),
        ),
    ).length;

    if (noCategoryCount > 0) {
      mappedCategories.push({
        id: 0,
        name: "Uncategorized",
        description: "Documents without category",
        userId: Number(getCurrentUserId()) || 0,
        count: noCategoryCount,
        color: "amber",
      });
    }

    return mappedCategories;
  }, [allCategories, documents]);

  const deletingCategory = categories.find(
    (category) => category.id === deleteCategoryId,
  );

  const deletingCategoryItemCount = deletingCategory?.count ?? 0;

  const deletingFolder = folders.find(
    (folder) => Number(folder.id) === Number(deleteFolderId),
  );

  const deletingFolderDocumentCount = deleteFolderId
    ? Math.max(
        deletingFolder?.documentCount ?? 0,
        documents.filter(
          (document) => Number(document.folderId) === Number(deleteFolderId),
        ).length,
      )
    : 0;

  const deletingFolderChildCount = deletingFolder?.childFolderCount ?? 0;

  const selectedFolder = folders.find(
    (folder) => folder.id === selectedFolderId,
  );
  const selectedCategory = categories.find(
    (category) => Number(category.id) === Number(selectedCategoryId),
  );

  const rootFolders = useMemo(() => {
    return folders.filter((folder) => folder.parentFolderId === null);
  }, [folders]);

  const filteredDocuments = useMemo(() => {
    let result = [...documents];

    if (selectedCategoryId !== null) {
      if (selectedCategoryId === 0) {
        result = result.filter(
          (document) =>
            document.categoryId === null ||
            document.categoryId === undefined ||
            !allCategories.some(
              (category) => Number(category.id) === Number(document.categoryId),
            ),
        );
      } else {
        result = result.filter(
          (document) =>
            Number(document.categoryId) === Number(selectedCategoryId),
        );
      }
    } else if (selectedFolderId !== null) {
      result = result.filter(
        (document) => Number(document.folderId) === Number(selectedFolderId),
      );
    } else {
      result = result.filter(
        (document) =>
          document.folderId === null || document.folderId === undefined,
      );
    }

    result.sort((a, b) => {
      const firstTime = new Date(a.createdAt).getTime();
      const secondTime = new Date(b.createdAt).getTime();

      return secondTime - firstTime;
    });

    return result;
  }, [documents, selectedCategoryId, selectedFolderId, allCategories]);

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
            onClick={() => navigate("/app/folders")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700"
          >
            <FolderPlus className="h-4.5 w-4.5" />
            New Folder
          </button>

          <button
            onClick={() => navigate("/app/categories")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700"
          >
            <Library className="h-4.5 w-4.5" />
            New Category
          </button>
        </div>
      </div>
      <div className="grid w-full max-w-6xl grid-cols-1 gap-4 md:grid-cols-4">
        {/* Categories */}
        <motion.button
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/app/categories")}
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

        {/* Folders */}
        <motion.button
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/app/folders")}
          className="rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
            <Folder className="h-4.5 w-4.5" />
          </div>

          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {folders.length}
          </p>

          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Folders
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

        {/* Favorites */}
        <motion.button
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/app/library/favorites")}
          className="rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition-all hover:border-amber-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-950/30 dark:text-amber-300">
            <Star className="h-4.5 w-4.5 fill-amber-400" />
          </div>

          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {documents.filter((document) => document.fav).length}
          </p>

          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Favorites
          </p>
        </motion.button>
      </div>
      {/* Folders Section */}
      <section>
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Folders
            </h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Organize your documents into folders
            </p>
          </div>
        </div>

        {rootFolders.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rootFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                isActive={false}
                onClick={() => navigate(`/app/folders/${folder.id}`)}
                onEdit={handleOpenEditFolder}
                onDelete={setDeleteFolderId}
                onMove={handleOpenMoveFolder}
                onShare={setSharingFolder}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            No folders yet. Use the New Folder button above to add one.
          </div>
        )}
      </section>

      {/* Categories Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Categories
          </h2>
        </div>
        {categories.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {categories.map((category) => {
              const isNoCategory = Number(category.id) === 0;

              return (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onClick={() => {
                    if (isNoCategory) {
                      setSelectedCategoryId(0);
                      setSelectedFolderId(null);
                      return;
                    }

                    navigate(`/app/categories/${category.id}`, {
                      state: { from: "/app/library" },
                    });
                  }}
                  onEdit={handleOpenEditCategory}
                  onDelete={setDeleteCategoryId}
                  allowActions={!isNoCategory}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            No categories yet.
          </div>
        )}
      </section>
      {/* Documents Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Documents
          </h2>
          <div className="flex items-center gap-3">
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategoryId(null)}
                className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300"
              >
                {selectedCategory.name} ×
              </button>
            )}
            {selectedFolder && (
              <button
                onClick={() => setSelectedFolderId(null)}
                className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300"
              >
                {selectedFolder.name} ×
              </button>
            )}
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {filteredDocuments.length} files
            </p>
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
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
                      <FileIcon className="h-5 w-5" />
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                      <button
                        onClick={() => toggleFavorite(document.id)}
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          document.fav
                            ? "text-amber-400"
                            : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                        }`}
                        title="Favorite"
                      >
                        <Star
                          className={`h-4 w-4 ${document.fav ? "fill-amber-400" : ""}`}
                        />
                      </button>

                      <button
                        onClick={() => handleViewFile(document.id)}
                        className={actionIconButtonClass}
                        title="View file"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleOpenEdit(document)}
                        className={actionIconButtonClass}
                        title="Rename"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleOpenMoveDocument(document)}
                        className={actionIconButtonClass}
                        title="Move"
                      >
                        <Folder className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() =>
                          handleDownload(document.id, document.name)
                        }
                        className={actionIconButtonClass}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => createAndCopyPublicLink(document.id)}
                        disabled={loadingDocumentId === document.id}
                        className={actionIconButtonClass}
                        title="Share document"
                        aria-label="Share document"
                      >
                        <Share2
                          className={`h-4 w-4 ${
                            loadingDocumentId === document.id
                              ? "animate-pulse"
                              : ""
                          }`}
                        />
                      </button>

                      <button
                        onClick={() => handleReprocess(document.id)}
                        className={actionIconButtonClass}
                        title="Reprocess"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => setDeleteId(document.id)}
                        className={deleteIconButtonClass}
                        title="Delete"
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
                    <div className="flex min-w-0 flex-wrap gap-2">
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {document.categoryName || "Uncategorized"}
                      </span>

                      <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                        {document.folderName || "Root"}
                      </span>
                    </div>

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
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="min-w-[1500px]">
              <div className="grid grid-cols-[320px_150px_150px_150px_120px_150px_150px_300px] items-center border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:bg-slate-900/60">
                <div>Document Name</div>
                <div>Category</div>
                <div>Folder</div>
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
                    onDelete={setDeleteId}
                    onReprocess={handleReprocess}
                    onDownload={handleDownload}
                    onShare={createAndCopyPublicLink}
                    sharingDocumentId={loadingDocumentId}
                    onViewFile={handleViewFile}
                    onEdit={handleOpenEdit}
                    onMove={handleOpenMoveDocument}
                  />
                ))
              ) : (
                <div className="border-t border-slate-100 px-4 py-16 text-center dark:border-slate-800">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 dark:bg-slate-800">
                    <FileText className="h-6 w-6" />
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    No documents found
                  </h3>

                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No files match the current category or folder.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {sharingFolder && (
        <FolderShareModal
          folder={sharingFolder}
          onClose={() => setSharingFolder(null)}
        />
      )}

      {movingDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
              Move Document
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Choose a folder or move this document back to Root.
            </p>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                Destination
              </label>

              <select
                value={moveTargetFolderId}
                onChange={(event) => setMoveTargetFolderId(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-800"
              >
                <option value="root">Root</option>

                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setMovingDocument(null);
                  setMoveTargetFolderId("root");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleMoveDocument}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                Move
              </button>
            </div>
          </div>
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

      {editDocument && (
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
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-800"
                placeholder="Enter document name"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditDocument(null);
                  setEditName("");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                onClick={handleUpdateDocumentName}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {movingFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Move Folder
              </h2>

              <button
                onClick={() => {
                  setMovingFolder(null);
                  setMoveFolderTargetId("root");
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Move "{movingFolder.name}" into another folder or back to Root.
            </p>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                Destination
              </label>

              <select
                value={moveFolderTargetId}
                onChange={(event) => setMoveFolderTargetId(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-800"
              >
                <option value="root">Root</option>

                {folders
                  .filter(
                    (folder) => Number(folder.id) !== Number(movingFolder.id),
                  )
                  .map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setMovingFolder(null);
                  setMoveFolderTargetId("root");
                }}
                className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                onClick={handleMoveFolder}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                <MoveRight className="h-4 w-4" />
                Move
              </button>
            </div>
          </div>
        </div>
      )}

      {editingFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Edit Folder
              </h2>

              <button
                onClick={() => setEditingFolder(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Name
                </label>
                <input
                  value={editFolderName}
                  onChange={(event) => setEditFolderName(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  placeholder="Folder name"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Description
                </label>
                <textarea
                  value={editFolderDescription}
                  onChange={(event) =>
                    setEditFolderDescription(event.target.value)
                  }
                  className="mt-2 min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  placeholder="Folder description"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditingFolder(null)}
                className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                onClick={handleUpdateFolder}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                <Save className="h-4 w-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteFolderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Delete Folder?
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to delete this folder? Documents and
              subfolders inside it will be moved to Root.
            </p>

            {(deletingFolderDocumentCount > 0 ||
              deletingFolderChildCount > 0) && (
              <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                This folder contains {deletingFolderDocumentCount}{" "}
                {deletingFolderDocumentCount === 1 ? "document" : "documents"}{" "}
                and {deletingFolderChildCount}{" "}
                {deletingFolderChildCount === 1 ? "subfolder" : "subfolders"}.
                They will be moved to Root after deleting this folder.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteFolderId(null)}
                className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteFolder}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Edit Category
              </h2>

              <button
                onClick={() => setEditingCategory(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Name
                </label>
                <input
                  value={editCategoryName}
                  onChange={(event) => setEditCategoryName(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  placeholder="Category name"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Description
                </label>
                <textarea
                  value={editCategoryDescription}
                  onChange={(event) =>
                    setEditCategoryDescription(event.target.value)
                  }
                  className="mt-2 min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  placeholder="Category description"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditingCategory(null)}
                className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                onClick={handleUpdateCategory}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                <Save className="h-4 w-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteCategoryId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Delete Category?
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to delete this category? This action cannot
              be undone.
            </p>

            {deletingCategoryItemCount > 0 && (
              <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">
                This category contains {deletingCategoryItemCount}{" "}
                {deletingCategoryItemCount === 1 ? "document" : "documents"}.
                Please move those documents to another category or Uncategorized
                before deleting this category.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteCategoryId(null)}
                className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteCategory}
                disabled={deletingCategoryItemCount > 0}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300 dark:disabled:bg-red-900"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
