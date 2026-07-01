import {
  Library,
  Search,
  Grid,
  List,
  FolderPlus,
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
import { getCurrentUserId } from "../../services/apiClient";
import type { AiStatus } from "../../constants/documentStatus";
import { filterMyDocuments } from "../../utils/documentOwnership";

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
  description: string;
  userId: number;
  count: number;
  color: string;
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
}: {
  category: LibraryCategory;
  onClick: () => void;
  onEdit: (category: LibraryCategory) => void;
  onDelete: (categoryId: number) => void;
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
  onViewFile,
  onEdit,
}: {
  document: LibraryDocument;
  onToggleFavorite: (documentId: number) => void | Promise<void>;
  onDelete: (documentId: number) => void;
  onReprocess: (documentId: number) => void;
  onDownload: (documentId: number, fileName: string) => void;
  onViewFile: (documentId: number) => void;
  onEdit: (document: LibraryDocument) => void;
}) {
  const FileIcon = getFileIcon(document);
  const extension = getFileExtension(document);

  return (
    <div className="grid grid-cols-[320px_150px_150px_120px_150px_150px_220px] items-center border-t border-slate-100 bg-white px-4 py-4 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/70">
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
        {document.folder || "Uncategorized"}
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
      <div className="flex min-w-[220px] items-center justify-end gap-1">
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

export function MyLibrary() {
  const navigate = useNavigate();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [uploadStatusFilter, setUploadStatusFilter] = useState<string>("ALL");
  const [aiStatusFilter, setAiStatusFilter] = useState<AiStatus | "ALL">("ALL");
  const [showUploadStatusMenu, setShowUploadStatusMenu] = useState(false);
  const [showAiStatusMenu, setShowAiStatusMenu] = useState(false);
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
  const mapLibraryDocument = (
    document: any,
    favoriteMap: Record<number, boolean> = {},
  ): LibraryDocument => ({
    id: document.id,
    categoryId: document.categoryId,
    name: document.title || document.originalName || document.fileName,
    folder: document.categoryName || "Uncategorized",
    date: formatDocumentDate(document.createdAt),
    createdAt: document.createdAt,
    type: document.type || document.fileType,
    aiStatus: document.aiStatus,
    documentStatus: document.documentStatus,
    fileSize: document.fileSize ?? 0,
    fav: Boolean(favoriteMap[document.id]),
  });

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

        const keyword = searchQuery.trim();

        const [documentResponse, favoriteResponse] = await Promise.all([
          keyword
            ? documentApi.searchDocuments({
                keyword,
                page: 0,
                size: 100,
              })
            : documentApi.getDocuments({
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

    const timeoutId = window.setTimeout(() => {
      loadDocuments();
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

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

  const categories = useMemo<LibraryCategory[]>(() => {
    return allCategories.map((category, index) => {
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
  }, [allCategories, documents]);

  const deletingCategory = categories.find(
    (category) => category.id === deleteCategoryId,
  );

  const deletingCategoryItemCount = deletingCategory?.count ?? 0;

  const filteredDocuments = useMemo(() => {
    let result = [...documents];

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
      <div className="grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
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
      {/* Categories Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Categories
          </h2>
        </div>
        {categories.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onClick={() =>
                  navigate(`/app/categories/${category.id}`, {
                    state: { from: "/app/library" },
                  })
                }
                onEdit={handleOpenEditCategory}
                onDelete={setDeleteCategoryId}
              />
            ))}
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
                        onClick={() =>
                          handleDownload(document.id, document.name)
                        }
                        className={actionIconButtonClass}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
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
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="min-w-[1260px]">
              <div className="grid grid-cols-[320px_150px_150px_120px_150px_150px_220px] items-center border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:bg-slate-900/60">
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
                    onDelete={setDeleteId}
                    onReprocess={handleReprocess}
                    onDownload={handleDownload}
                    onViewFile={handleViewFile}
                    onEdit={handleOpenEdit}
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
          </div>
        )}
      </section>
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
                Please move or delete those documents first.
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
