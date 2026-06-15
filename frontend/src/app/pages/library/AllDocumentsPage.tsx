import { useEffect, useState } from "react";
import {
  Download,
  FileText,
  RotateCcw,
  Star,
  Trash2,
  ArrowLeft,
  Upload,
} from "lucide-react";
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
  if (!date) return "Unknown";

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return date;

  return parsedDate.toLocaleDateString("vi-VN", {
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
  return (
    <div className="grid gap-3 border-t border-slate-100 bg-white p-4 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/70 md:grid-cols-[minmax(260px,2fr)_minmax(130px,0.8fr)_minmax(130px,0.8fr)_minmax(90px,0.6fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(120px,auto)] md:items-center">
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

      <span className="inline-flex max-w-full rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <span className="truncate">{document.folder}</span>
      </span>

      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {document.date}
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

        <button
          onClick={() => onDownload(document.id, document.name)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <Download className="h-4 w-4" />
        </button>

        <button
          onClick={() => onReprocess(document.id)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          onClick={() => onDelete(document.id)}
          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-950/30 dark:hover:text-red-300"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function AllDocumentsPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);

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
      console.error("Cannot load documents:", error);
      toast.error("Cannot load documents.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
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
      await loadDocuments();
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
          All Documents
        </h1>

        <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">
          View all uploaded documents.
        </p>
      </div>

      <button
        onClick={() => navigate("/app/upload")}
        className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700"
      >
        <Upload className="h-4 w-4" />
        Upload Document
      </button>
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

      {isLoading ? (
        <div className="border-t border-slate-100 px-4 py-16 text-center dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Loading documents...
          </p>
        </div>
      ) : documents.length > 0 ? (
        documents.map((document) => (
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
);
}
