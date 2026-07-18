import {
  ArrowLeft,
  FileText,
  Star,
  Download,
  RotateCcw,
  Share2,
  Trash2,
  Grid3X3,
  List,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { documentApi } from "../../services/documentApi";
import { getCurrentUserId } from "../../services/apiClient";
import { useTheme } from "../../../layouts/ThemeProvider";
import { filterMyDocuments } from "../../utils/documentOwnership";
import { useCreatePublicLink } from "../../hooks/useCreatePublicLink";
import { ActionMenuItem, RowActionMenu } from "../../components/ui/RowActionMenu";

interface LibraryCategoryDocument {
  id: number;
  title?: string;
  originalName?: string;
  fileName?: string;
  name?: string;
  categoryName?: string;
  createdAt?: string;
  fileSize?: number;
  documentStatus?: string;
  aiStatus?: string;
  processStatus?: string;
}

const getDocumentName = (document: LibraryCategoryDocument) =>
  document.title ||
  document.originalName ||
  document.fileName ||
  document.name ||
  "Untitled";

const getDocumentExtension = (document: LibraryCategoryDocument) =>
  getDocumentName(document).split(".").pop()?.toUpperCase() || "FILE";

function DocumentRow({
  document,
  onDelete,
  onShare,
  onReprocess,
  sharingDocumentId,
  reprocessingDocumentId,
}: {
  document: LibraryCategoryDocument;
  onDelete: (documentId: number) => void;
  onShare: (documentId: number) => void | Promise<void>;
  onReprocess: (documentId: number) => void | Promise<void>;
  sharingDocumentId: number | null;
  reprocessingDocumentId: number | null;
}) {
  return (
    <div className="grid gap-3 border-t border-slate-100 bg-white p-4 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/70 md:grid-cols-[minmax(260px,2fr)_minmax(130px,0.8fr)_minmax(130px,0.8fr)_minmax(90px,0.6fr)_minmax(150px,1fr)_minmax(150px,1fr)_72px] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
          <FileText className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
            {getDocumentName(document)}
          </p>
          <p className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500">
            {getDocumentExtension(document)}
          </p>
        </div>
      </div>

      <span className="inline-flex max-w-full rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <span className="truncate">{document.categoryName || "Category"}</span>
      </span>

      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {document.createdAt
          ? new Date(document.createdAt).toLocaleDateString("vi-VN", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "Unknown"}
      </p>

      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {((document.fileSize ?? 0) / 1024).toFixed(1)} KB
      </p>

      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800">
        {document.documentStatus || "ACTIVE"}
      </span>

      <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-extrabold text-red-700 ring-1 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-800">
        {document.aiStatus || document.processStatus || "FAILED"}
      </span>

      <div className="flex min-w-[72px] items-center justify-center">
        <RowActionMenu>
          <ActionMenuItem icon={Star} label="Favorite" onClick={() => undefined} />
          <ActionMenuItem icon={Download} label="Download" onClick={() => undefined} />
          <ActionMenuItem icon={Share2} label="Share document" onClick={() => onShare(document.id)} disabled={sharingDocumentId === document.id} />
          <ActionMenuItem
            icon={RotateCcw}
            label={reprocessingDocumentId === document.id ? "Reprocessing..." : "Reprocess"}
            onClick={() => onReprocess(document.id)}
            disabled={reprocessingDocumentId === document.id}
          />
          <ActionMenuItem icon={Trash2} label="Delete" onClick={() => onDelete(document.id)} danger />
        </RowActionMenu>
      </div>
    </div>
  );
}

export function LibraryCategoryDocumentsPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { categoryId } = useParams();
  const [documents, setDocuments] = useState<LibraryCategoryDocument[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [reprocessingDocumentId, setReprocessingDocumentId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const { createAndCopyPublicLink, loadingDocumentId } =
    useCreatePublicLink();

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const userId = getCurrentUserId();

        if (!userId) {
          toast.error("Please log in again to view category documents.");
          return;
        }

        const response = await documentApi.getDocuments({
          page: 0,
          size: 100,
          categoryId: Number(categoryId),
        });
        const currentCategoryId = Number(categoryId);
        const myCategoryDocuments = filterMyDocuments(
          response.data.content ?? [],
          userId,
        ).filter(
          (document) => Number(document.categoryId) === currentCategoryId,
        );

        setDocuments(myCategoryDocuments);
      } catch (error) {
        console.error(error);
        toast.error("Cannot load category documents.");
      }
    };

    loadDocuments();
  }, [categoryId]);


  const handleReprocess = async (documentId: number) => {
    if (reprocessingDocumentId !== null) return;

    try {
      setReprocessingDocumentId(documentId);
      const response = await documentApi.reprocessDocument(documentId);

      setDocuments((current) =>
        current.map((document) =>
          document.id === documentId
            ? { ...document, ...response.data }
            : document,
        ),
      );

      toast.success("Document reprocess started.");
    } catch (error) {
      console.error("Cannot reprocess document:", error);
      toast.error("Cannot reprocess document.");
    } finally {
      setReprocessingDocumentId(null);
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
      console.error(error);
      toast.error("Cannot delete document.");
      return false;
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/app/library/categories")}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Library Categories
      </button>

      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
        Category Documents
      </h1>
      <div className="flex justify-end">
        <div className="inline-flex h-10 items-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
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
            <Grid3X3 className="h-4 w-4" />
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
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>
      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {documents.map((document) => (
            <div
              key={document.id}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
                  <FileText className="h-6 w-6" />
                </div>

                <button className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-amber-400 dark:hover:bg-slate-800">
                  <Star className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4">
                <h3 className="line-clamp-2 min-h-[40px] text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {getDocumentName(document)}
                </h3>

                <p className="mt-1 text-[11px] font-bold uppercase text-slate-400">
                  {getDocumentExtension(document)}
                </p>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Category</span>
                  <span className="truncate font-bold text-slate-600 dark:text-slate-300">
                    {document.categoryName || "Category"}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Date</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {document.createdAt
                      ? new Date(document.createdAt).toLocaleDateString(
                          "vi-VN",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )
                      : "Unknown"}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Size</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {((document.fileSize ?? 0) / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">Upload Status</span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800">
                    {document.documentStatus || "ACTIVE"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">AI Status</span>
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-extrabold text-red-700 ring-1 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-800">
                    {document.aiStatus || document.processStatus || "FAILED"}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
                <RowActionMenu>
                  <ActionMenuItem icon={Download} label="Download" onClick={() => undefined} />
                  <ActionMenuItem icon={Share2} label="Share document" onClick={() => createAndCopyPublicLink(document.id)} disabled={loadingDocumentId === document.id} />
                  <ActionMenuItem
                    icon={RotateCcw}
                    label={reprocessingDocumentId === document.id ? "Reprocessing..." : "Reprocess"}
                    onClick={() => handleReprocess(document.id)}
                    disabled={reprocessingDocumentId === document.id}
                  />
                  <ActionMenuItem icon={Trash2} label="Delete" onClick={() => setDeleteId(document.id)} danger />
                </RowActionMenu>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="hidden bg-slate-50 px-4 py-3 text-[11px] font-extrabold uppercase text-slate-400 dark:bg-slate-950 md:grid md:grid-cols-[minmax(260px,2fr)_minmax(130px,0.8fr)_minmax(130px,0.8fr)_minmax(90px,0.6fr)_minmax(150px,1fr)_minmax(150px,1fr)_72px]">
            <span>Document Name</span>
            <span>Category</span>
            <span>Date Added</span>
            <span>Size</span>
            <span>Upload Status</span>
            <span>AI Status</span>
            <span className="text-center">Actions</span>
          </div>

          {documents.map((document) => (
            <DocumentRow
              key={document.id}
              document={document}
              onDelete={setDeleteId}
              onShare={createAndCopyPublicLink}
              onReprocess={handleReprocess}
              sharingDocumentId={loadingDocumentId}
              reprocessingDocumentId={reprocessingDocumentId}
            />
          ))}
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
