import { useCallback, useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
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
  MoveRight,
  Pencil,
  RotateCcw,
  Save,
  Search,
  Share2,
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
import { useCreatePublicLink } from "../../hooks/useCreatePublicLink";
import { FolderShareModal } from "../library/components/FolderShareModal";
import { ActionMenuItem, RowActionMenu } from "../../components/ui/RowActionMenu";
import { DocumentInformationModal } from "../../components/ui/DocumentInformationModal";

type ListResponse<T> = T[] | { content?: T[] };

interface LibraryDocument {
  id: number;
  folderId: number | null;
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
  folderId?: number | null;
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

const isDescendantFolder = (
  folders: FolderResponse[],
  sourceFolderId: number,
  targetFolderId: number,
) => {
  let current = folders.find(
    (folder) => Number(folder.id) === Number(targetFolderId),
  );

  while (
    current?.parentFolderId !== null &&
    current?.parentFolderId !== undefined
  ) {
    if (Number(current.parentFolderId) === Number(sourceFolderId)) {
      return true;
    }

    current = folders.find(
      (folder) => Number(folder.id) === Number(current?.parentFolderId),
    );
  }

  return false;
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
  "grid grid-cols-[320px_150px_150px_120px_150px_150px_72px] items-center";

const actionIconButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-blue-300";

const deleteIconButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-950/30 dark:hover:text-red-300";

const fileTypeLabels: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
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
  if (lastDotSegment && lastDotSegment !== rawValue && /^[a-z0-9]{1,8}$/i.test(lastDotSegment)) {
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
  onToggleFavorite: (documentId: number) => void;
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
    <div
      role="button"
      tabIndex={0}
      onClick={() => onViewFile(document.id)}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onViewFile(document.id); }}
      className={`${documentListGridClass} cursor-pointer border-t border-slate-100 bg-white px-4 py-4 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/70`}
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

      <div className="flex min-w-[72px] items-center justify-center">
        <RowActionMenu>
          <ActionMenuItem icon={Star} label={document.fav ? "Remove favorite" : "Add favorite"} onClick={() => onToggleFavorite(document.id)} />
          <ActionMenuItem icon={Eye} label="View information" onClick={() => onViewInfo(document)} />
          <ActionMenuItem icon={Pencil} label="Rename" onClick={() => onEdit(document)} />
          <ActionMenuItem icon={Folder} label="Move" onClick={() => onMove(document)} />
          <ActionMenuItem icon={Download} label="Download" onClick={() => onDownload(document.id, document.name)} />
          <ActionMenuItem icon={Share2} label="Share document" onClick={() => onShare(document.id)} disabled={sharingDocumentId === document.id} />
          <ActionMenuItem icon={RotateCcw} label="Reprocess" onClick={() => onReprocess(document.id)} />
          <ActionMenuItem icon={Trash2} label="Delete" onClick={() => onDelete(document.id)} danger />
        </RowActionMenu>
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
  onToggleFavorite: (documentId: number) => void;
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
    <div role="button" tabIndex={0} onClick={() => onViewFile(document.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onViewFile(document.id); }} className="cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
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

      <div className="mt-5 flex items-center justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
        <RowActionMenu>
          <ActionMenuItem icon={Eye} label="View information" onClick={() => onViewInfo(document)} />
          <ActionMenuItem icon={Pencil} label="Rename" onClick={() => onEdit(document)} />
          <ActionMenuItem icon={Folder} label="Move" onClick={() => onMove(document)} />
          <ActionMenuItem icon={Download} label="Download" onClick={() => onDownload(document.id, document.name)} />
          <ActionMenuItem icon={Share2} label="Share document" onClick={() => onShare(document.id)} disabled={sharingDocumentId === document.id} />
          <ActionMenuItem icon={RotateCcw} label="Reprocess" onClick={() => onReprocess(document.id)} />
          <ActionMenuItem icon={Trash2} label="Delete" onClick={() => onDelete(document.id)} danger />
        </RowActionMenu>
      </div>
    </div>
  );
}

function EmptyDocuments({ onUpload }: { onUpload: () => void }) {
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
  const [movingFolder, setMovingFolder] = useState<FolderResponse | null>(null);
  const [sharingFolder, setSharingFolder] = useState<FolderResponse | null>(
    null,
  );
  const [moveFolderTargetId, setMoveFolderTargetId] = useState<string>("root");
  const [draggingFolderId, setDraggingFolderId] = useState<number | null>(null);
  const [draggingDocumentId, setDraggingDocumentId] = useState<number | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<number | null>(null);
  const [isDragOverCurrentFolder, setIsDragOverCurrentFolder] = useState(false);

  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [deleteDocumentId, setDeleteDocumentId] = useState<number | null>(null);
  const [viewingDocumentInfo, setViewingDocumentInfo] = useState<LibraryDocument | null>(null);

  const [editingDocument, setEditingDocument] =
    useState<LibraryDocument | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [movingDocument, setMovingDocument] = useState<LibraryDocument | null>(
    null,
  );
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string>(
    String(currentFolderId),
  );
  const { createAndCopyPublicLink, loadingDocumentId } = useCreatePublicLink();

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

      const [
        folderResponse,
        foldersResponse,
        categoriesResponse,
        documentsResponse,
      ] = await Promise.all([
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
          folderId: document.folderId ?? currentFolderId,
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

  const moveFolderDestinations = useMemo(() => {
    if (!movingFolder) return folders;

    return folders.filter(
      (item) =>
        Number(item.id) !== Number(movingFolder.id) &&
        !isDescendantFolder(folders, movingFolder.id, item.id),
    );
  }, [folders, movingFolder]);

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

  const openMoveFolderModal = (selectedFolder: FolderResponse) => {
    setMovingFolder(selectedFolder);
    setMoveFolderTargetId(
      selectedFolder.parentFolderId === null ||
        selectedFolder.parentFolderId === undefined
        ? "root"
        : String(selectedFolder.parentFolderId),
    );
  };

  const handleMoveFolder = async () => {
    if (!movingFolder) return;

    const userId = getSafeUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    const parentFolderId =
      moveFolderTargetId === "root" ? null : Number(moveFolderTargetId);

    if (parentFolderId !== null && parentFolderId === movingFolder.id) {
      toast.error("Cannot move folder into itself.");
      return;
    }

    if (
      parentFolderId !== null &&
      isDescendantFolder(folders, movingFolder.id, parentFolderId)
    ) {
      toast.error("Cannot move a folder into its subfolder.");
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

      const movedCurrentFolder = movingFolder.id === currentFolderId;

      setMovingFolder(null);
      setMoveFolderTargetId("root");

      if (movedCurrentFolder && parentFolderId === null) {
        await loadData();
        return;
      }

      await loadData();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot move folder.",
      );
    }
  };

  const handleDropFolder = async (
    draggedFolderId: number,
    targetFolderId: number | null,
  ) => {
    const userId = getSafeUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    const draggedFolder = folders.find(
      (item) => Number(item.id) === Number(draggedFolderId),
    );

    if (!draggedFolder) {
      toast.error("Folder not found.");
      return;
    }

    if (
      targetFolderId !== null &&
      Number(targetFolderId) === draggedFolder.id
    ) {
      toast.error("Cannot move folder into itself.");
      return;
    }

    if (
      targetFolderId !== null &&
      isDescendantFolder(folders, draggedFolder.id, targetFolderId)
    ) {
      toast.error("Cannot move a folder into its subfolder.");
      return;
    }

    const normalizedTargetFolderId =
      targetFolderId === null ? null : Number(targetFolderId);

    if ((draggedFolder.parentFolderId ?? null) === normalizedTargetFolderId) {
      setDraggingFolderId(null);
      setDraggingDocumentId(null);
      setDragOverFolderId(null);
      setIsDragOverCurrentFolder(false);
      return;
    }

    try {
      await folderApi.updateFolder(draggedFolder.id, {
        name: draggedFolder.name,
        description: draggedFolder.description ?? "",
        userId,
        parentFolderId: normalizedTargetFolderId,
      });

      toast.success(
        normalizedTargetFolderId === null
          ? "Folder moved to Root."
          : "Folder moved successfully.",
      );

      await loadData();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot move folder.",
      );
    } finally {
      setDraggingFolderId(null);
      setDraggingDocumentId(null);
      setDragOverFolderId(null);
      setIsDragOverCurrentFolder(false);
    }
  };

  const moveFolderContentToRoot = async (folderId: number, userId: number) => {
    const documentsResponse = await documentApi.getDocuments({
      folderId,
      page: 0,
      size: 1000,
    });

    const documentsInFolder = filterMyDocuments(
      normalizeList<DocumentApiItem>(
        documentsResponse.data as ListResponse<DocumentApiItem>,
      ),
      userId,
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
      (item) => Number(item.parentFolderId) === Number(folderId),
    );

    await Promise.all(
      childFolders.map((childFolder) =>
        folderApi.updateFolder(childFolder.id, {
          name: childFolder.name,
          description: childFolder.description ?? "",
          userId,
          parentFolderId: null,
        }),
      ),
    );
  };

  const handleDeleteFolder = async (id: number): Promise<boolean> => {
    const selectedFolder = folders.find((item) => item.id === id);

    if (!selectedFolder) {
      toast.error("Folder not found.");
      return false;
    }

    const userId = getSafeUserId();

    if (!userId) {
      toast.error("Please login again.");
      return false;
    }

    try {
      await moveFolderContentToRoot(id, userId);
      await folderApi.deleteFolder(id, userId);

      toast.success("Folder deleted. Documents and subfolders moved to Root.");

      if (id === currentFolderId) {
        navigate("/app/folders");
        return true;
      }

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

  const handleDeleteDocument = async (documentId: number): Promise<boolean> => {
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

    const userId = getSafeUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    const targetFolderId =
      moveTargetFolderId === "root" ? null : Number(moveTargetFolderId);

    try {
      await documentApi.moveDocumentToFolder(movingDocument.id, {
        userId,
        folderId: targetFolderId,
      });

      toast.success(
        targetFolderId === null
          ? "Document moved to Root."
          : "Document moved to folder.",
      );

      setMovingDocument(null);
      setMoveTargetFolderId(String(currentFolderId));
      await loadData();
    } catch (error: any) {
      console.error("Cannot move document:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot move document.",
      );
    }
  };

  const handleDropDocument = async (
    draggedDocumentId: number,
    targetFolderId: number | null,
  ) => {
    const userId = getSafeUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    const draggedDocument = documents.find(
      (item) => Number(item.id) === Number(draggedDocumentId),
    );

    if (!draggedDocument) {
      toast.error("Document not found.");
      setDraggingDocumentId(null);
      setIsDragOverCurrentFolder(false);
      return;
    }

    const normalizedTargetFolderId =
      targetFolderId === null ? null : Number(targetFolderId);

    if ((draggedDocument.folderId ?? null) === normalizedTargetFolderId) {
      setDraggingDocumentId(null);
      setIsDragOverCurrentFolder(false);
      return;
    }

    try {
      await documentApi.moveDocumentToFolder(draggedDocument.id, {
        userId,
        folderId: normalizedTargetFolderId,
      });

      toast.success(
        normalizedTargetFolderId === null
          ? "Document moved to Root."
          : "Document moved to folder.",
      );

      await loadData();
    } catch (error: any) {
      console.error("Cannot move document:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot move document.",
      );
    } finally {
      setDraggingDocumentId(null);
      setIsDragOverCurrentFolder(false);
    }
  };

  const handleDocumentDragStart = (
    event: DragEvent<HTMLDivElement>,
    document: LibraryDocument,
  ) => {
    event.stopPropagation();
    setDraggingDocumentId(document.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-document-id", String(document.id));
    event.dataTransfer.setData("text/plain", String(document.id));
  };

  const handleDropOnFolderCard = async (
    event: DragEvent<HTMLDivElement>,
    targetFolderId: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const droppedDocumentId = Number(
      event.dataTransfer.getData("application/x-document-id") || draggingDocumentId,
    );

    if (Number.isInteger(droppedDocumentId) && droppedDocumentId > 0) {
      await handleDropDocument(droppedDocumentId, targetFolderId);
      return;
    }

    const droppedFolderId = Number(
      event.dataTransfer.getData("application/x-folder-id") ||
        event.dataTransfer.getData("text/plain") ||
        draggingFolderId,
    );

    if (!Number.isInteger(droppedFolderId) || droppedFolderId <= 0) return;

    await handleDropFolder(droppedFolderId, targetFolderId);
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

        <div className="flex flex-wrap gap-2">
          {folder && (
            <button
              type="button"
              onClick={() => setSharingFolder(folder)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Share2 className="h-4 w-4" />
              Share Folder
            </button>
          )}

          {folder && (
            <button
              type="button"
              onClick={() => openMoveFolderModal(folder)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <MoveRight className="h-4 w-4" />
              Move Folder
            </button>
          )}

          <button
            type="button"
            onClick={goToUploadWithCurrentFolder}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            <UploadCloud className="h-4 w-4" />
            Upload Document
          </button>
        </div>
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

      <section
        onDragOver={(event) => {
          event.preventDefault();

          if (draggingFolderId || draggingDocumentId) {
            setIsDragOverCurrentFolder(true);
          }
        }}
        onDragLeave={() => setIsDragOverCurrentFolder(false)}
        onDrop={async (event) => {
          event.preventDefault();

          const droppedDocumentId = Number(
            event.dataTransfer.getData("application/x-document-id") ||
              draggingDocumentId,
          );

          if (Number.isInteger(droppedDocumentId) && droppedDocumentId > 0) {
            await handleDropDocument(droppedDocumentId, currentFolderId);
            return;
          }

          const draggedId = Number(
            event.dataTransfer.getData("application/x-folder-id") ||
              event.dataTransfer.getData("text/plain") ||
              draggingFolderId,
          );

          if (!Number.isInteger(draggedId)) return;

          await handleDropFolder(draggedId, currentFolderId);
        }}
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">
            Subfolders
          </h2>

          <div
            className={`rounded-2xl border border-dashed px-4 py-3 text-sm font-bold transition ${
              isDragOverCurrentFolder
                ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/30 dark:text-blue-300"
                : "border-slate-300 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
            }`}
          >
            Drop here to move folder or document into this folder
          </div>
        </div>

        {subfolders.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {subfolders.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(event) => {
                  event.stopPropagation();
                  setDraggingFolderId(item.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("application/x-folder-id", String(item.id));
                  event.dataTransfer.setData("text/plain", String(item.id));
                }}
                onDragEnd={() => {
                  setDraggingFolderId(null);
                  setDraggingDocumentId(null);
                  setDragOverFolderId(null);
                  setIsDragOverCurrentFolder(false);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  if (draggingDocumentId || (draggingFolderId && draggingFolderId !== item.id)) {
                    setDragOverFolderId(item.id);
                  }
                }}
                onDragLeave={(event) => {
                  event.stopPropagation();
                  setDragOverFolderId((current) =>
                    current === item.id ? null : current,
                  );
                }}
                onDrop={(event) => handleDropOnFolderCard(event, item.id)}
                onClick={() => navigate(`/app/folders/${item.id}`)}
                className={`group flex cursor-pointer items-center justify-between rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${
                  dragOverFolderId === item.id
                    ? "border-blue-400 ring-2 ring-blue-200 dark:border-blue-500 dark:ring-blue-900/60"
                    : "border-slate-200 dark:border-slate-700"
                }`}
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
                  <RowActionMenu>
                    <ActionMenuItem icon={Share2} label="Share folder" onClick={() => setSharingFolder(item)} />
                    <ActionMenuItem icon={MoveRight} label="Move folder" onClick={() => openMoveFolderModal(item)} />
                    <ActionMenuItem icon={Pencil} label="Edit folder" onClick={() => openEditModal(item.id)} />
                    <ActionMenuItem icon={Trash2} label="Delete folder" onClick={() => setDeleteId(item.id)} danger />
                  </RowActionMenu>

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
            <div className="min-w-[1120px]">
              <div
                className={`${documentListGridClass} border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:bg-slate-900/60`}
              >
                <div>Document Name</div>
                <div>Category</div>
                <div>Date Added</div>
                <div>Size</div>
                <div>Upload Status</div>
                <div>AI Status</div>
                <div className="text-center">Actions</div>
              </div>

              {filteredDocuments.length > 0 ? (
                filteredDocuments.map((document) => (
                  <div
                    key={document.id}
                    draggable
                    onDragStart={(event) => handleDocumentDragStart(event, document)}
                    onDragEnd={() => {
                      setDraggingDocumentId(null);
                      setIsDragOverCurrentFolder(false);
                    }}
                  >
                    <DocumentRow
                      document={document}
                      onToggleFavorite={toggleFavorite}
                      onDelete={setDeleteDocumentId}
                      onReprocess={handleReprocess}
                      onDownload={handleDownload}
                      onShare={createAndCopyPublicLink}
                      sharingDocumentId={loadingDocumentId}
                      onViewFile={handleViewFile}
                      onViewInfo={setViewingDocumentInfo}
                      onEdit={handleOpenEditDocument}
                      onMove={handleOpenMoveDocument}
                    />
                  </div>
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
              <div
                key={document.id}
                draggable
                onDragStart={(event) => handleDocumentDragStart(event, document)}
                onDragEnd={() => {
                  setDraggingDocumentId(null);
                  setIsDragOverCurrentFolder(false);
                }}
              >
                <DocumentCard
                  document={document}
                  onToggleFavorite={toggleFavorite}
                  onDelete={setDeleteDocumentId}
                  onReprocess={handleReprocess}
                  onDownload={handleDownload}
                  onShare={createAndCopyPublicLink}
                  sharingDocumentId={loadingDocumentId}
                  onViewFile={handleViewFile}
                  onViewInfo={setViewingDocumentInfo}
                  onEdit={handleOpenEditDocument}
                  onMove={handleOpenMoveDocument}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyDocuments onUpload={goToUploadWithCurrentFolder} />
        )}
      </section>

      {sharingFolder && (
        <FolderShareModal
          folder={sharingFolder}
          onClose={() => setSharingFolder(null)}
        />
      )}

      {movingFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
              Move Folder
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
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

                {moveFolderDestinations.map((folderItem) => (
                  <option key={folderItem.id} value={folderItem.id}>
                    {folderItem.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setMovingFolder(null);
                  setMoveFolderTargetId("root");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleMoveFolder}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                Move
              </button>
            </div>
          </div>
        </div>
      )}

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
              Are you sure you want to delete this folder? Documents and
              subfolders inside it will be moved to Root.
            </p>

            {deletingFolder &&
              ((deletingFolder.documentCount ?? 0) > 0 ||
                (deletingFolder.childFolderCount ?? 0) > 0) && (
                <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                  This folder contains {deletingFolder.documentCount ?? 0}{" "}
                  {(deletingFolder.documentCount ?? 0) === 1
                    ? "document"
                    : "documents"}{" "}
                  and {deletingFolder.childFolderCount ?? 0}{" "}
                  {(deletingFolder.childFolderCount ?? 0) === 1
                    ? "subfolder"
                    : "subfolders"}
                  . They will be moved to Root after deleting this folder.
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

                {folders.map((folderItem) => (
                  <option key={folderItem.id} value={folderItem.id}>
                    {folderItem.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setMovingDocument(null);
                  setMoveTargetFolderId(String(currentFolderId));
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

      {viewingDocumentInfo && (
        <DocumentInformationModal document={viewingDocumentInfo} onClose={() => setViewingDocumentInfo(null)} />
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
