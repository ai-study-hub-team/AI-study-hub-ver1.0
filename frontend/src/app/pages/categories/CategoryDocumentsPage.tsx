import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Download,
  FileText,
  RotateCcw,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { documentApi } from "../../services/documentApi";
import { categoryApi } from "../../services/categoryApi";
import type { AiStatus } from "../../constants/documentStatus";
import type { DocumentListItemResponse } from "../../types/documents/types";

const statusBadgeClass: Record<AiStatus, string> = {
  UPLOADED: "bg-blue-50 text-blue-700 ring-blue-200",
  PROCESSING: "bg-orange-50 text-orange-700 ring-orange-200",
  PROCESSED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  FAILED: "bg-red-50 text-red-700 ring-red-200",
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

  const [categoryName, setCategoryName] = useState("");
  const [documents, setDocuments] = useState<DocumentListItemResponse[]>([]);
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const loadDocuments = async () => {
    try {
      const categoryResponse = await categoryApi.getCategories();

      const currentCategory = categoryResponse.data.find(
        (category) => category.id === Number(categoryId),
      );

      setCategoryName(currentCategory?.name ?? "Unknown Category");

      const response = await documentApi.getDocuments({
        page: 0,
        size: 100,
        categoryId: Number(categoryId),
      });

      setDocuments(response.data.content ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Cannot load category documents.");
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [categoryId]);

  const toggleFavorite = (documentId: number) => {
    setFavorites((current) => ({
      ...current,
      [documentId]: !current[documentId],
    }));
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
        onClick={() => navigate("/app/categories")}
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

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="hidden bg-slate-50 px-4 py-3 text-[11px] font-extrabold uppercase text-slate-400 dark:bg-slate-950 md:grid md:grid-cols-[minmax(260px,2fr)_minmax(130px,0.8fr)_minmax(130px,0.8fr)_minmax(90px,0.6fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(120px,auto)]">
          <span>Document Name</span>
          <span>Category</span>
          <span>Date Added</span>
          <span>Size</span>
          <span>Upload Status</span>
          <span>AI Status</span>
          <span className="text-right">Actions</span>
        </div>

        {documents.length > 0 ? (
          documents.map((document) => (
            <div
              key={document.id}
              className="grid gap-3 border-t border-slate-100 bg-white p-4 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/70 md:grid-cols-[minmax(260px,2fr)_minmax(130px,0.8fr)_minmax(130px,0.8fr)_minmax(90px,0.6fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(120px,auto)] md:items-center"
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

              <span className="inline-flex max-w-full rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                <span className="truncate">{document.folder}</span>
              </span>

              <p className="text-sm font-semibold text-slate-500">
                {formatDocumentDate(document.createdAt)}
              </p>

              <p className="text-sm font-semibold text-slate-500">
                {((document.fileSize ?? 0) / 1024).toFixed(1)} KB
              </p>

              <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-200">
                {document.documentStatus}
              </span>

              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${
                  statusBadgeClass[document.aiStatus]
                }`}
              >
                {document.aiStatus}
              </span>

              <div className="flex min-w-[120px] items-center justify-end gap-1">
                <button
                  onClick={() => toggleFavorite(document.id)}
                  className={`rounded-lg p-2 ${
                    favorites[document.id]
                      ? "text-amber-400"
                      : "text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  <Star
                    className={`h-4 w-4 ${
                      favorites[document.id] ? "fill-amber-400" : ""
                    }`}
                  />
                </button>

                <button
                  onClick={() => handleDownload(document.id, document.name)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <Download className="h-4 w-4" />
                </button>

                <button
                  onClick={() => handleReprocess(document.id)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setDeleteId(document.id)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="border-t border-slate-100 px-4 py-16 text-center">
            <p className="text-sm text-slate-500">No documents found.</p>
          </div>
        )}
      </div>
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
