import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Download,
  Eye,
  File,
  FileText,
  FileVideo,
  Folder,
  Grid,
  List,
  Pencil,
  Presentation,
  RotateCcw,
  Save,
  Share2,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router";

import { ActionMenuItem, RowActionMenu } from "../../components/ui/RowActionMenu";
import type { AiStatus } from "../../constants/documentStatus";
import { useCreatePublicLink } from "../../hooks/useCreatePublicLink";
import { documentApi } from "../../services/documentApi";
import { favoriteApi, type FavoriteDocument } from "../../services/favoriteApi";
import { folderApi, type FolderResponse } from "../../services/folderApi";
import { getCurrentUserId } from "../../services/apiClient";
import { filterMyDocuments } from "../../utils/documentOwnership";

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

const viewToggleButtonBase =
  "flex h-9 w-9 items-center justify-center rounded-lg transition-all";

const documentListGridClass =
  "grid grid-cols-[320px_150px_150px_150px_120px_150px_150px_80px] items-center";

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

const formatDocumentDateTime = (date: string | undefined) => {
  if (!date) return "Unknown";

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return date;

  return parsedDate.toLocaleString(undefined, {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatFileSize = (size: number | undefined) => {
  const safeSize = Number(size ?? 0);

  if (!Number.isFinite(safeSize) || safeSize <= 0) return "0 KB";
  if (safeSize < 1024 * 1024) return `${(safeSize / 1024).toFixed(1)} KB`;

  return `${(safeSize / (1024 * 1024)).toFixed(1)} MB`;
};

const fileTypeLabels: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "DOCX",
  "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "PPTX",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "text/plain": "TXT",
  "text/csv": "CSV",
  "image/jpeg": "JPG",
  "image/jpg": "JPG",
  "image/png": "PNG",
  "image/gif": "GIF",
  "video/mp4": "MP4",
  "audio/mpeg": "MP3",
};

const getReadableFileType = (value?: string | null) => {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) return "FILE";

  const normalizedValue = rawValue.toLowerCase();
  const mappedType = fileTypeLabels[normalizedValue];

  if (mappedType) return mappedType;
  if (normalizedValue.includes("wordprocessingml.document")) return "DOCX";
  if (normalizedValue.includes("presentationml.presentation")) return "PPTX";
  if (normalizedValue.includes("spreadsheetml.sheet")) return "XLSX";
  if (normalizedValue.includes("msword")) return "DOC";
  if (normalizedValue.includes("powerpoint")) return "PPT";
  if (normalizedValue.includes("excel")) return "XLS";
  if (normalizedValue.includes("pdf")) return "PDF";

  const lastDotSegment = rawValue.split(/[?#]/)[0].split(".").pop();
  if (
    lastDotSegment &&
    lastDotSegment !== rawValue &&
    /^[a-z0-9]{1,8}$/i.test(lastDotSegment)
  ) {
    return lastDotSegment.toUpperCase();
  }

  const slashSegment = normalizedValue.split("/").pop();
  if (slashSegment && /^[a-z0-9.+-]{1,12}$/i.test(slashSegment)) {
    return slashSegment.replace(/^x-/, "").toUpperCase();
  }

  return "FILE";
};

const getFileExtension = (document: LibraryDocument) => {
  const extensionFromName = getReadableFileType(document.name);

  return extensionFromName !== "FILE"
    ? extensionFromName
    : getReadableFileType(document.type);
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

function DocumentInfoModal({
  document,
  onClose,
}: {
  document: LibraryDocument;
  onClose: () => void;
}) {
  const infoItems = [
    { label: "Title", value: document.name },
    { label: "File type", value: getFileExtension(document) },
    { label: "Category", value: document.categoryName || "Uncategorized" },
    { label: "Folder", value: document.folderName || "Root" },
    { label: "Date added", value: formatDocumentDateTime(document.createdAt) },
    { label: "File size", value: formatFileSize(document.fileSize) },
    { label: "Status", value: document.documentStatus || "Unknown" },
    { label: "AI status", value: document.aiStatus || "Unknown" },
    { label: "Favorite", value: document.fav ? "Yes" : "No" },
    { label: "Document ID", value: String(document.id) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">
              Document detail
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              Information loaded from the document list. Click the document
              name or card to open preview.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-extrabold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {infoItems.map((item) => (
            <div
              key={item.label}
              className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-950"
            >
              <p className="text-sm font-extrabold uppercase text-slate-400 dark:text-slate-500">
                {item.label}
              </p>
              <p className="mt-3 break-words text-lg font-extrabold text-slate-900 dark:text-slate-100">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DocumentActions({
  document,
  onToggleFavorite,
  onDelete,
  onReprocess,
  onDownload,
  onShare,
  sharingDocumentId,
  onViewFile,
  onViewInfo,
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
  onViewInfo: (document: LibraryDocument) => void;
  onEdit: (document: LibraryDocument) => void;
  onMove: (document: LibraryDocument) => void;
}) {
  return (
    <RowActionMenu>
      <ActionMenuItem
        icon={Eye}
        label="View information"
        onClick={() => onViewInfo(document)}
      />
      <ActionMenuItem
        icon={FileText}
        label="Open / Preview document"
        onClick={() => onViewFile(document.id)}
      />
      <ActionMenuItem
        icon={Star}
        label={document.fav ? "Remove favorite" : "Add favorite"}
        onClick={() => onToggleFavorite(document.id)}
      />
      <ActionMenuItem
        icon={Pencil}
        label="Rename"
        onClick={() => onEdit(document)}
      />
      <ActionMenuItem
        icon={Folder}
        label="Move"
        onClick={() => onMove(document)}
      />
      <ActionMenuItem
        icon={Download}
        label="Download"
        onClick={() => onDownload(document.id, document.name)}
      />
      <ActionMenuItem
        icon={Share2}
        label="Share document"
        onClick={() => onShare(document.id)}
        disabled={sharingDocumentId === document.id}
      />
      <ActionMenuItem
        icon={RotateCcw}
        label="Reprocess"
        onClick={() => onReprocess(document.id)}
      />
      <ActionMenuItem
        icon={Trash2}
        label="Delete"
        onClick={() => onDelete(document.id)}
        danger
      />
    </RowActionMenu>
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
  onViewInfo,
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
  onViewInfo: (document: LibraryDocument) => void;
  onEdit: (document: LibraryDocument) => void;
  onMove: (document: LibraryDocument) => void;
}) {
  const FileIcon = getFileIcon(document);
  const extension = getFileExtension(document);

  return (
    <div className={`${documentListGridClass} border-t border-slate-100 bg-white px-4 py-4 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/70`}>
      <button
        type="button"
        onClick={() => onViewFile(document.id)}
        className="flex min-w-0 items-center gap-3 text-left"
      >
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
      </button>

      <span className="inline-flex w-fit max-w-[140px] rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <span className="truncate">{document.categoryName}</span>
      </span>

      <span className="inline-flex w-fit max-w-[140px] rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
        <span className="truncate">{document.folderName || "Root"}</span>
      </span>

      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {document.date || "Unknown"}
      </p>

      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {formatFileSize(document.fileSize)}
      </p>

      <span className="inline-flex w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800">
        {document.documentStatus}
      </span>

      <span
        className={`inline-flex w-fit px-2.5 py-1 text-[11px] font-extrabold ${statusBadgeClass[document.aiStatus]}`}
      >
        {document.aiStatus}
      </span>

      <div className="flex items-center justify-center">
        <DocumentActions
          document={document}
          onToggleFavorite={onToggleFavorite}
          onDelete={onDelete}
          onReprocess={onReprocess}
          onDownload={onDownload}
          onShare={onShare}
          sharingDocumentId={sharingDocumentId}
          onViewFile={onViewFile}
          onViewInfo={onViewInfo}
          onEdit={onEdit}
          onMove={onMove}
        />
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
  onShare,
  sharingDocumentId,
  onViewFile,
  onViewInfo,
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
  onViewInfo: (document: LibraryDocument) => void;
  onEdit: (document: LibraryDocument) => void;
  onMove: (document: LibraryDocument) => void;
}) {
  const FileIcon = getFileIcon(document);

  return (
    <div
      onClick={() => onViewFile(document.id)}
      className="cursor-pointer rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-100 hover:bg-blue-50/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/20"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
          <FileIcon className="h-5 w-5" />
        </div>

        <div
          className="flex shrink-0 items-center justify-end"
          onClick={(event) => event.stopPropagation()}
        >
          <DocumentActions
            document={document}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDelete}
            onReprocess={onReprocess}
            onDownload={onDownload}
            onShare={onShare}
            sharingDocumentId={sharingDocumentId}
            onViewFile={onViewFile}
            onViewInfo={onViewInfo}
            onEdit={onEdit}
            onMove={onMove}
          />
        </div>
      </div>

      <h3 className="line-clamp-2 min-h-10 text-sm font-bold text-slate-900 dark:text-slate-100">
        {document.name}
      </h3>

      <p className="mt-1 text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500">
        {getFileExtension(document)}
      </p>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-slate-400">Category</span>
          <span className="truncate font-bold text-slate-600 dark:text-slate-300">
            {document.categoryName}
          </span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-slate-400">Folder</span>
          <span className="truncate font-bold text-slate-600 dark:text-slate-300">
            {document.folderName || "Root"}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${statusBadgeClass[document.aiStatus]}`}
        >
          {document.aiStatus}
        </span>

        {document.fav && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800">
            <Star className="h-3 w-3 fill-amber-400" />
            Favorite
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyDocuments() {
  return (
    <div className="border-t border-slate-100 px-4 py-16 text-center dark:border-slate-800">
      <h3 className="font-bold text-slate-900 dark:text-slate-100">
        No documents found
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Upload a document to see it here.
      </p>
    </div>
  );
}

export function AllDocumentsPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [folders, setFolders] = useState<FolderResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [editingDocument, setEditingDocument] =
    useState<LibraryDocument | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [viewingDocumentInfo, setViewingDocumentInfo] =
    useState<LibraryDocument | null>(null);
  const [movingDocument, setMovingDocument] =
    useState<LibraryDocument | null>(null);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string>("root");
  const { createAndCopyPublicLink, loadingDocumentId } =
    useCreatePublicLink();

  const loadFolders = async () => {
    try {
      const rawUserId = getCurrentUserId();
      const userId = Number(rawUserId);

      if (!Number.isInteger(userId) || userId <= 0) {
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

  const loadDocuments = async () => {
    try {
      setIsLoading(true);

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

      const myDocuments = filterMyDocuments(
        documentResponse.data.content ?? [],
        userId,
      );
      const myFavoriteDocuments = filterMyDocuments(
        favoriteResponse.data.content ?? [],
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
        myDocuments
          .map((document) => mapLibraryDocument(document, favoriteMap))
          .sort((a, b) => {
            const firstTime = new Date(a.createdAt).getTime();
            const secondTime = new Date(b.createdAt).getTime();

            return secondTime - firstTime;
          }),
      );
    } catch (error) {
      console.error("Cannot load documents:", error);
      toast.error("Cannot load documents.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
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

  const handleViewFile = (documentId: number) => {
    navigate(`/app/library/${documentId}/preview`);
  };

  const handleOpenEdit = (document: LibraryDocument) => {
    setEditingDocument(document);
    setEditTitle(document.name);
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
    if (!editingDocument) return;

    const title = editTitle.trim();

    if (!title) {
      toast.error("Document name cannot be empty.");
      return;
    }

    try {
      const response = await documentApi.updateDocument(editingDocument.id, {
        title,
      });

      setDocuments((current) =>
        current.map((document) =>
          document.id === editingDocument.id
            ? {
                ...document,
                name: response.data.name || title,
              }
            : document,
        ),
      );

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
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            All Documents
          </h1>

          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Browse every document you have uploaded across all categories and
            folders.
          </p>
        </div>

        <div className="inline-flex w-full flex-wrap items-center gap-2 sm:w-auto md:justify-end">
          <div className="inline-flex h-10 shrink-0 items-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`${viewToggleButtonBase} ${
                viewMode === "grid"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300 dark:shadow-none"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
              title="Grid view"
              aria-label="Grid view"
            >
              <Grid className="h-4.5 w-4.5" />
            </button>

            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`${viewToggleButtonBase} ${
                viewMode === "list"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300 dark:shadow-none"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
              title="List view"
              aria-label="List view"
            >
              <List className="h-4.5 w-4.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate("/app/upload")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700"
          >
            <Upload className="h-4.5 w-4.5" />
            Upload Document
          </button>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="min-w-[1270px]">
            <div
              className={`${documentListGridClass} border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:bg-slate-900/60`}
            >
              <div>Name</div>
              <div>Category</div>
              <div>Location</div>
              <div>Date Added</div>
              <div>Size</div>
              <div>Status</div>
              <div>AI Status</div>
              <div className="text-center">Actions</div>
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
                  onDelete={setDeleteId}
                  onReprocess={handleReprocess}
                  onDownload={handleDownload}
                  onShare={createAndCopyPublicLink}
                  sharingDocumentId={loadingDocumentId}
                  onViewFile={handleViewFile}
                  onViewInfo={setViewingDocumentInfo}
                  onEdit={handleOpenEdit}
                  onMove={handleOpenMoveDocument}
                />
              ))
            ) : (
              <EmptyDocuments />
            )}
          </div>
        </div>
      ) : (
        <div>
          {isLoading ? (
            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Loading documents...
              </p>
            </div>
          ) : documents.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {documents.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  onToggleFavorite={toggleFavorite}
                  onDelete={setDeleteId}
                  onReprocess={handleReprocess}
                  onDownload={handleDownload}
                  onShare={createAndCopyPublicLink}
                  sharingDocumentId={loadingDocumentId}
                  onViewFile={handleViewFile}
                  onViewInfo={setViewingDocumentInfo}
                  onEdit={handleOpenEdit}
                  onMove={handleOpenMoveDocument}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <EmptyDocuments />
            </div>
          )}
        </div>
      )}

      {viewingDocumentInfo && (
        <DocumentInfoModal
          document={viewingDocumentInfo}
          onClose={() => setViewingDocumentInfo(null)}
        />
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

      {movingDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
              Move Document
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Choose a destination folder for{" "}
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {movingDocument.name}
              </span>
              .
            </p>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                Destination folder
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
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>

              <button
                type="button"
                onClick={handleMoveDocument}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                <Folder className="h-4 w-4" />
                Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
