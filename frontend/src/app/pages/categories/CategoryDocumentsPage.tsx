import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Pencil,
  RotateCcw,
  Save,
  Share2,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { documentApi } from "../../services/documentApi";
import { categoryApi } from "../../services/categoryApi";
import {
  favoriteApi,
  type FavoriteDocument,
} from "../../services/favoriteApi";
import type { AiStatus } from "../../constants/documentStatus";
import type { DocumentListItemResponse } from "../../types/documents/types";
import { getCurrentUserId } from "../../services/apiClient";
import { filterMyDocuments } from "../../utils/documentOwnership";
import { useCreatePublicLink } from "../../hooks/useCreatePublicLink";
import { ActionMenuItem, RowActionMenu } from "../../components/ui/RowActionMenu";
import { DocumentInformationModal } from "../../components/ui/DocumentInformationModal";

const statusBadgeClass: Record<AiStatus, string> = {
  UPLOADED: "bg-blue-50 text-blue-700 ring-blue-200",
  PROCESSING: "bg-orange-50 text-orange-700 ring-orange-200",
  PROCESSED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  FAILED: "bg-red-50 text-red-700 ring-red-200",
};

const actionIconButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-blue-300";

const deleteIconButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-950/30 dark:hover:text-red-300";

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

const getFileExtension = (document: DocumentListItemResponse) => {
  const extensionFromName = document.name?.split(".").pop()?.toUpperCase();
  const extensionFromType = document.type?.split("/").pop()?.toUpperCase();

  return extensionFromName && extensionFromName !== document.name?.toUpperCase()
    ? extensionFromName
    : extensionFromType || "FILE";
};

export function CategoryDocumentsPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backPath = location.state?.from ?? "/app/categories";

  const [categoryName, setCategoryName] = useState("");
  const [documents, setDocuments] = useState<DocumentListItemResponse[]>([]);
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewingDocumentInfo, setViewingDocumentInfo] = useState<DocumentListItemResponse | null>(null);

  const [editingDocument, setEditingDocument] =
    useState<DocumentListItemResponse | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const { createAndCopyPublicLink, loadingDocumentId } =
    useCreatePublicLink();

  const loadFavorites = async () => {
    try {
      const userId = getCurrentUserId();

      if (!userId) {
        setFavorites({});
        return;
      }

      const response = await favoriteApi.getFavorites(0, 100);
      const favoriteDocuments = filterMyDocuments(
        response.data.content ?? [],
        userId,
      );

      const favoriteMap = favoriteDocuments.reduce<Record<number, boolean>>(
        (current, favorite: FavoriteDocument) => {
          current[favorite.documentId] = true;
          return current;
        },
        {},
      );

      setFavorites(favoriteMap);
    } catch (error) {
      console.error(error);
    }
  };

  const loadDocuments = async () => {
    try {
      const currentCategoryId = Number(categoryId);
      const isUncategorized = currentCategoryId === 0;
      const userId = getCurrentUserId();

      if (!Number.isInteger(currentCategoryId) || currentCategoryId < 0) {
        toast.error("Invalid category.");
        navigate("/app/categories");
        return;
      }

      if (!userId) {
        toast.error("Please log in again to view category documents.");
        setDocuments([]);
        return;
      }

      const categoryResponse = await categoryApi.getCategories();

      const myCategories = (categoryResponse.data ?? []).filter(
        (category) => Number(category.userId) === Number(userId),
      );

      if (isUncategorized) {
        setCategoryName("Uncategorized");

        const response = await documentApi.getDocuments({
          page: 0,
          size: 100,
        });

        const myCategoryIds = new Set(
          myCategories.map((category) => Number(category.id)),
        );

        setDocuments(
          filterMyDocuments(response.data.content ?? [], userId).filter(
            (document) =>
              document.categoryId === null ||
              document.categoryId === undefined ||
              !myCategoryIds.has(Number(document.categoryId)),
          ),
        );

        return;
      }

      const currentCategory = myCategories.find(
        (category) => Number(category.id) === currentCategoryId,
      );

      if (!currentCategory) {
        toast.error("Category not found or you do not have permission.");
        navigate("/app/categories");
        return;
      }

      setCategoryName(currentCategory.name ?? "Unknown Category");

      const response = await documentApi.getDocuments({
        page: 0,
        size: 100,
        categoryId: currentCategoryId,
      });

      setDocuments(
        filterMyDocuments(response.data.content ?? [], userId).filter(
          (document) => Number(document.categoryId) === currentCategoryId,
        ),
      );
    } catch (error) {
      console.error(error);
      toast.error("Cannot load category documents.");
    }
  };

  useEffect(() => {
    loadDocuments();
    loadFavorites();
  }, [categoryId]);

  const toggleFavorite = async (documentId: number) => {
    const isFavorite = favorites[documentId];

    try {
      if (isFavorite) {
        await favoriteApi.removeFavorite(documentId);

        setFavorites((current) => ({
          ...current,
          [documentId]: false,
        }));

        toast.success("Removed from favorites");
      } else {
        await favoriteApi.addFavorite(documentId);

        setFavorites((current) => ({
          ...current,
          [documentId]: true,
        }));

        toast.success("Added to favorites");
      }
    } catch (error) {
      console.error(error);
      toast.error("Cannot update favorite.");
    }
  };

  const handleViewFile = (documentId: number) => {
    navigate(`/app/library/${documentId}/preview`);
  };

  const handleOpenEdit = (document: DocumentListItemResponse) => {
    setEditingDocument(document);
    setEditTitle(document.name ?? "");
  };

  const handleUpdateDocument = async () => {
    if (!editingDocument) return;

    if (!editTitle.trim()) {
      toast.error("Document name is required.");
      return;
    }

    try {
      await documentApi.updateDocument(editingDocument.id, {
        title: editTitle.trim(),
      });

      toast.success("Document updated successfully.");
      setEditingDocument(null);
      setEditTitle("");
      await loadDocuments();
    } catch (error) {
      console.error(error);
      toast.error("Cannot update document.");
    }
  };

  const handleDelete = async (documentId: number): Promise<boolean> => {
    try {
      await documentApi.deleteDocument(documentId);

      setDocuments((current) =>
        current.filter((document) => document.id !== documentId),
      );

      setFavorites((current) => {
        const next = { ...current };
        delete next[documentId];
        return next;
      });

      toast.success("Document deleted successfully.");
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Cannot delete document.");
      return false;
    }
  };

  const handleReprocess = async (documentId: number) => {
    try {
      await documentApi.reprocessDocument(documentId);
      toast.success("Document reprocess started.");
      await loadDocuments();
    } catch (error) {
      console.error(error);
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
      console.error(error);
      toast.error("Cannot download document.");
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(backPath)}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Categories
      </button>

      <div>
        <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">
          {categoryName || "Category Documents"}
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Documents in this category.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-[1120px]">
          <div className="grid grid-cols-[320px_150px_150px_120px_150px_150px_72px] items-center border-b border-slate-100 bg-slate-50 px-4 py-3 text-[11px] font-extrabold uppercase text-slate-400 dark:border-slate-800 dark:bg-slate-950">
            <span>Document Name</span>
            <span>Category</span>
            <span>Date Added</span>
            <span>Size</span>
            <span>Upload Status</span>
            <span>AI Status</span>
            <span className="text-center">Actions</span>
          </div>

          {documents.length > 0 ? (
            documents.map((document) => (
              <div
                key={document.id}
                role="button"
                tabIndex={0}
                onClick={() => handleViewFile(document.id)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") handleViewFile(document.id); }}
                className="grid cursor-pointer grid-cols-[320px_150px_150px_120px_150px_150px_72px] items-center border-t border-slate-100 bg-white px-4 py-4 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/70"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <FileText className="h-5 w-5" />
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

                <span className="inline-flex max-w-full rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <span className="truncate">
                    {document.categoryName || "Uncategorized"}
                  </span>
                </span>

                <p className="text-sm font-semibold text-slate-500">
                  {formatDocumentDate(document.createdAt)}
                </p>

                <p className="text-sm font-semibold text-slate-500">
                  {((document.fileSize ?? 0) / 1024).toFixed(1)} KB
                </p>

                <span className="inline-flex w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-200">
                  {document.documentStatus}
                </span>

                <span
                  className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${
                    statusBadgeClass[document.aiStatus]
                  }`}
                >
                  {document.aiStatus}
                </span>

                <div className="flex min-w-[72px] items-center justify-center">
                  <RowActionMenu>
                    <ActionMenuItem icon={Star} label={favorites[document.id] ? "Remove favorite" : "Add favorite"} onClick={() => toggleFavorite(document.id)} />
                    <ActionMenuItem icon={Eye} label="View information" onClick={() => setViewingDocumentInfo(document)} />
                    <ActionMenuItem icon={Pencil} label="Rename" onClick={() => handleOpenEdit(document)} />
                    <ActionMenuItem icon={Download} label="Download" onClick={() => handleDownload(document.id, document.name)} />
                    <ActionMenuItem icon={Share2} label="Share document" onClick={() => createAndCopyPublicLink(document.id)} disabled={loadingDocumentId === document.id} />
                    <ActionMenuItem icon={RotateCcw} label="Reprocess" onClick={() => handleReprocess(document.id)} />
                    <ActionMenuItem icon={Trash2} label="Delete" onClick={() => setDeleteId(document.id)} danger />
                  </RowActionMenu>
                </div>
              </div>
            ))
          ) : (
            <div className="border-t border-slate-100 px-4 py-16 text-center dark:border-slate-800">
              <p className="text-sm text-slate-500">No documents found.</p>
            </div>
          )}
        </div>
      </div>

      {viewingDocumentInfo && (
        <DocumentInformationModal document={{ ...viewingDocumentInfo, category: viewingDocumentInfo.categoryName }} onClose={() => setViewingDocumentInfo(null)} />
      )}

      {editingDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
                Rename Document
              </h2>

              <button
                onClick={() => setEditingDocument(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Document name
              </label>
              <input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="Document name"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditingDocument(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                onClick={handleUpdateDocument}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                <Save className="h-4 w-4" />
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
    </div>
  );
}
