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
  MoreHorizontal,
  Pencil,
  Save,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DragEvent, DragEventHandler, ReactNode } from "react";
import { createPortal } from "react-dom";
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
import { DocumentInformationModal as DocumentInfoModal } from "../../components/ui/DocumentInformationModal";
import { PaginationControls } from "../../components/ui/PaginationControls";

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

const isDescendantFolder = (
  folders: LibraryFolder[],
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

interface MenuPosition {
  top: number;
  left: number;
}

const ACTION_MENU_VIEWPORT_PADDING = 12;
const ACTION_MENU_GAP = 6;

function RowActionMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    top: ACTION_MENU_VIEWPORT_PADDING,
    left: ACTION_MENU_VIEWPORT_PADDING,
  });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!button || !menu) return;

    const anchorRect = button.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const maxLeft = Math.max(
      ACTION_MENU_VIEWPORT_PADDING,
      window.innerWidth - menuRect.width - ACTION_MENU_VIEWPORT_PADDING,
    );
    const maxTop = Math.max(
      ACTION_MENU_VIEWPORT_PADDING,
      window.innerHeight - menuRect.height - ACTION_MENU_VIEWPORT_PADDING,
    );

    const preferredLeft = anchorRect.right - menuRect.width;
    const openBelowTop = anchorRect.bottom + ACTION_MENU_GAP;
    const openAboveTop = anchorRect.top - menuRect.height - ACTION_MENU_GAP;
    const preferredTop =
      openBelowTop + menuRect.height <=
      window.innerHeight - ACTION_MENU_VIEWPORT_PADDING
        ? openBelowTop
        : openAboveTop >= ACTION_MENU_VIEWPORT_PADDING
          ? openAboveTop
          : Math.min(
              Math.max(anchorRect.top, ACTION_MENU_VIEWPORT_PADDING),
              maxTop,
            );

    const nextPosition = {
      top: Math.min(
        Math.max(preferredTop, ACTION_MENU_VIEWPORT_PADDING),
        maxTop,
      ),
      left: Math.min(
        Math.max(preferredLeft, ACTION_MENU_VIEWPORT_PADDING),
        maxLeft,
      ),
    };

    setMenuPosition((current) =>
      current.top === nextPosition.top && current.left === nextPosition.left
        ? current
        : nextPosition,
    );
  }, []);

  useLayoutEffect(() => {
    if (open) updateMenuPosition();
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;

    const schedulePositionUpdate = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        updateMenuPosition();
      });
    };

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    window.addEventListener("scroll", schedulePositionUpdate, true);
    window.addEventListener("resize", schedulePositionUpdate);
    document.addEventListener("mousedown", closeOnOutsideClick);

    return () => {
      window.removeEventListener("scroll", schedulePositionUpdate, true);
      window.removeEventListener("resize", schedulePositionUpdate);
      document.removeEventListener("mousedown", closeOnOutsideClick);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [open, updateMenuPosition]);

  return (
    <div className="flex justify-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className={actionIconButtonClass}
        title="More actions"
        aria-label="More actions"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] min-w-48 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              maxHeight: `calc(100vh - ${ACTION_MENU_VIEWPORT_PADDING * 2}px)`,
            }}
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
            }}
          >
            {children}
          </div>,
          document.body,
        )}
    </div>
  );
}

function ActionMenuItem({
  icon: Icon,
  label,
  onClick,
  danger = false,
  disabled = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        onClick();
      }}
      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        danger
          ? "text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
          : "text-slate-600 hover:bg-slate-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
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
  isDragOver = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  folder: LibraryFolder;
  isActive: boolean;
  onClick: () => void;
  onEdit: (folder: LibraryFolder) => void;
  onDelete: (folderId: number) => void;
  onMove: (folder: LibraryFolder) => void;
  onShare: (folder: LibraryFolder) => void;
  isDragOver?: boolean;
  onDragStart?: DragEventHandler<HTMLDivElement>;
  onDragEnd?: DragEventHandler<HTMLDivElement>;
  onDragOver?: DragEventHandler<HTMLDivElement>;
  onDragLeave?: DragEventHandler<HTMLDivElement>;
  onDrop?: DragEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`group flex cursor-pointer items-center gap-4 rounded-2xl border p-4 text-left shadow-sm transition-colors ${
        isDragOver
          ? "border-blue-400 bg-blue-50/70 ring-2 ring-blue-200 dark:border-blue-500 dark:bg-blue-950/30 dark:ring-blue-900/60"
          : isActive
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

      <div className="flex shrink-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <RowActionMenu>
          <ActionMenuItem icon={Eye} label="Open folder" onClick={onClick} />
          <ActionMenuItem icon={Share2} label="Share folder" onClick={() => onShare(folder)} />
          <ActionMenuItem icon={MoveRight} label="Move folder" onClick={() => onMove(folder)} />
          <ActionMenuItem icon={Pencil} label="Edit folder" onClick={() => onEdit(folder)} />
          <ActionMenuItem
            icon={Trash2}
            label="Delete folder"
            onClick={() => onDelete(folder.id)}
            danger
          />
        </RowActionMenu>
        <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
      </div>
    </div>
  );
}


function FolderRow({
  folder,
  isActive,
  isDragOver = false,
  onOpen,
  onEdit,
  onDelete,
  onMove,
  onShare,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  folder: LibraryFolder;
  isActive: boolean;
  isDragOver?: boolean;
  onOpen: () => void;
  onEdit: (folder: LibraryFolder) => void;
  onDelete: (folderId: number) => void;
  onMove: (folder: LibraryFolder) => void;
  onShare: (folder: LibraryFolder) => void;
  onDragStart?: DragEventHandler<HTMLDivElement>;
  onDragEnd?: DragEventHandler<HTMLDivElement>;
  onDragOver?: DragEventHandler<HTMLDivElement>;
  onDragLeave?: DragEventHandler<HTMLDivElement>;
  onDrop?: DragEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      draggable
      onDoubleClick={onOpen}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`grid w-full grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1fr)_72px] items-center border-t px-4 py-4 transition-colors [&>*]:min-w-0 ${
        isDragOver
          ? "border-blue-200 bg-blue-50/80 ring-2 ring-inset ring-blue-200 dark:border-blue-800 dark:bg-blue-950/30 dark:ring-blue-900/60"
          : isActive
            ? "border-blue-100 bg-blue-50/50 dark:border-blue-900/60 dark:bg-blue-950/20"
            : "border-slate-100 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/70"
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 items-center gap-3 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
          <Folder className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
            {folder.name}
          </p>
          <p className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500">
            FOLDER
          </p>
        </div>
      </button>

      <span className="inline-flex w-fit rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        Folder
      </span>

      <span className="inline-flex w-fit rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
        {folder.parentFolderName || "Root"}
      </span>

      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {formatDocumentDate(folder.createdAt) || "Unknown"}
      </p>

      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        —
      </p>

      <span className="inline-flex w-fit rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-extrabold text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-800">
        {folder.documentCount} docs
      </span>

      <span className="inline-flex w-fit rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-extrabold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
        {folder.childFolderCount} folders
      </span>

      <div className="flex items-center justify-center">
        <RowActionMenu>
          <ActionMenuItem icon={Eye} label="Open folder" onClick={onOpen} />
          <ActionMenuItem icon={Share2} label="Share folder" onClick={() => onShare(folder)} />
          <ActionMenuItem icon={MoveRight} label="Move folder" onClick={() => onMove(folder)} />
          <ActionMenuItem icon={Pencil} label="Edit folder" onClick={() => onEdit(folder)} />
          <ActionMenuItem
            icon={Trash2}
            label="Delete folder"
            onClick={() => onDelete(folder.id)}
            danger
          />
        </RowActionMenu>
      </div>
    </div>
  );
}

function DocumentRow({
  document,
  onDragStart,
  onDragEnd,
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
  onDragStart?: DragEventHandler<HTMLDivElement>;
  onDragEnd?: DragEventHandler<HTMLDivElement>;
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
    <div
      draggable
      onDoubleClick={() => onViewFile(document.id)}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="grid w-full grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1fr)_72px] items-center border-t border-slate-100 bg-white px-4 py-4 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/70 [&>*]:min-w-0">
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
        <RowActionMenu>
          <ActionMenuItem icon={Eye} label="View information" onClick={() => onViewInfo(document)} />
          <ActionMenuItem
            icon={Star}
            label={document.fav ? "Remove favorite" : "Add favorite"}
            onClick={() => onToggleFavorite(document.id)}
          />
          <ActionMenuItem icon={Pencil} label="Rename" onClick={() => onEdit(document)} />
          <ActionMenuItem icon={Folder} label="Move" onClick={() => onMove(document)} />
          <ActionMenuItem icon={Download} label="Download" onClick={() => onDownload(document.id, document.name)} />
          <ActionMenuItem
            icon={Share2}
            label="Share document"
            onClick={() => onShare(document.id)}
            disabled={sharingDocumentId === document.id}
          />
          <ActionMenuItem icon={RotateCcw} label="Reprocess" onClick={() => onReprocess(document.id)} />
          <ActionMenuItem
            icon={Trash2}
            label="Delete"
            onClick={() => onDelete(document.id)}
            danger
          />
        </RowActionMenu>
      </div>
    </div>
  );
}

export function MyLibrary() {
  const navigate = useNavigate();
  const [view, setView] = useState<"grid" | "list">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryResponse[]>([]);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const selectedCategoryId: number | null = null;
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editDocument, setEditDocument] = useState<LibraryDocument | null>(
    null,
  );
  const [editName, setEditName] = useState("");
  const [viewingDocumentInfo, setViewingDocumentInfo] =
    useState<LibraryDocument | null>(null);
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
  const [draggingFolderId, setDraggingFolderId] = useState<number | null>(null);
  const [draggingDocumentId, setDraggingDocumentId] = useState<number | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<number | null>(null);
  const [movingDocument, setMovingDocument] = useState<LibraryDocument | null>(
    null,
  );
  const [sharingFolder, setSharingFolder] = useState<LibraryFolder | null>(
    null,
  );
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string>("root");
  const [moveTargetCategoryId, setMoveTargetCategoryId] =
    useState<string>("current");
  const [isMovingDocument, setIsMovingDocument] = useState(false);

  const resetDragState = () => {
    setDraggingFolderId(null);
    setDraggingDocumentId(null);
    setDragOverFolderId(null);
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
    navigate(`/app/library/${documentId}/preview`, {
      state: { returnTo: "/app/library", returnLabel: "Library" },
    });
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
    setMoveTargetCategoryId(
      document.categoryId === null || document.categoryId === undefined
        ? "current"
        : String(document.categoryId),
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
    const categoryId =
      moveTargetCategoryId === "current"
        ? movingDocument.categoryId
        : Number(moveTargetCategoryId);

    if (
      categoryId !== null &&
      categoryId !== undefined &&
      !Number.isInteger(categoryId)
    ) {
      toast.error("Invalid category selected.");
      return;
    }

    const targetCategory = allCategories.find(
      (category) => Number(category.id) === Number(categoryId),
    );

    try {
      setIsMovingDocument(true);

      const requests: Promise<unknown>[] = [
        documentApi.moveDocumentToFolder(movingDocument.id, {
          userId,
          folderId,
        }),
      ];

      if (
        categoryId !== null &&
        categoryId !== undefined &&
        categoryId !== movingDocument.categoryId
      ) {
        requests.push(
          documentApi.updateDocument(movingDocument.id, { categoryId }),
        );
      }

      await Promise.all(requests);

      setDocuments((current) =>
        current.map((document) =>
          document.id === movingDocument.id
            ? {
                ...document,
                folderId,
                folderName: targetFolder?.name || "Root",
                folder: targetFolder?.name || "Root",
                categoryId: categoryId ?? document.categoryId,
                categoryName:
                  targetCategory?.name || document.categoryName,
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
      setMoveTargetCategoryId("current");
      await loadFolders();
    } catch (error: any) {
      console.error("Cannot move document:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot move document.",
      );
    } finally {
      setIsMovingDocument(false);
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

  const handleDropFolder = async (
    draggedFolderId: number,
    targetFolderId: number | null,
  ) => {
    const rawUserId = getCurrentUserId();
    const userId = Number(rawUserId);

    if (!Number.isInteger(userId) || userId <= 0) {
      toast.error("Please log in again to move this folder.");
      return;
    }

    const draggedFolder = folders.find(
      (folder) => Number(folder.id) === Number(draggedFolderId),
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
      resetDragState();
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

      await loadFolders();
    } catch (error: any) {
      console.error("Cannot move folder:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot move folder.",
      );
    } finally {
      resetDragState();
    }
  };

  const handleDropDocument = async (
    draggedDocumentId: number,
    targetFolderId: number | null,
  ) => {
    const rawUserId = getCurrentUserId();
    const userId = Number(rawUserId);

    if (!Number.isInteger(userId) || userId <= 0) {
      toast.error("Please log in again to move this document.");
      return;
    }

    const draggedDocument = documents.find(
      (document) => Number(document.id) === Number(draggedDocumentId),
    );

    if (!draggedDocument) {
      toast.error("Document not found.");
      resetDragState();
      return;
    }

    const normalizedTargetFolderId =
      targetFolderId === null ? null : Number(targetFolderId);

    if ((draggedDocument.folderId ?? null) === normalizedTargetFolderId) {
      resetDragState();
      return;
    }

    const targetFolder = folders.find(
      (folder) => Number(folder.id) === Number(normalizedTargetFolderId),
    );

    try {
      await documentApi.moveDocumentToFolder(draggedDocument.id, {
        userId,
        folderId: normalizedTargetFolderId,
      });

      setDocuments((current) =>
        current.map((document) =>
          document.id === draggedDocument.id
            ? {
                ...document,
                folderId: normalizedTargetFolderId,
                folderName: targetFolder?.name || "Root",
                folder: targetFolder?.name || "Root",
              }
            : document,
        ),
      );

      toast.success(
        normalizedTargetFolderId === null
          ? "Document moved to Root."
          : `Document moved to ${targetFolder?.name || "folder"}.`,
      );

      await loadFolders();
    } catch (error: any) {
      console.error("Cannot move document:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot move document.",
      );
    } finally {
      resetDragState();
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

  const visibleFolders = useMemo(() => {
    if (selectedCategoryId !== null) return [];

    if (selectedFolderId !== null) {
      return folders.filter(
        (folder) => Number(folder.parentFolderId) === Number(selectedFolderId),
      );
    }

    return rootFolders;
  }, [folders, rootFolders, selectedCategoryId, selectedFolderId]);

  const visibleItemCount = visibleFolders.length + filteredDocuments.length;
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = currentPage * pageSize;
  const paginatedFolders = visibleFolders.slice(pageStart, pageEnd);
  const documentStart = Math.max(0, pageStart - visibleFolders.length);
  const documentEnd = Math.max(0, pageEnd - visibleFolders.length);
  const paginatedDocuments = filteredDocuments.slice(documentStart, documentEnd);

  const handleFolderDragStart = (
    event: DragEvent<HTMLDivElement>,
    folder: LibraryFolder,
  ) => {
    event.stopPropagation();
    setDraggingFolderId(folder.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-folder-id", String(folder.id));
    event.dataTransfer.setData("text/plain", String(folder.id));
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

  const handleFolderDragOver = (
    event: DragEvent<HTMLDivElement>,
    folder: LibraryFolder,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (draggingDocumentId || (draggingFolderId && draggingFolderId !== folder.id)) {
      setDragOverFolderId(folder.id);
    }
  };

  const handleDropOnFolder = async (
    event: DragEvent<HTMLDivElement>,
    folder: LibraryFolder,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const droppedDocumentId = Number(
      event.dataTransfer.getData("application/x-document-id") || draggingDocumentId,
    );

    if (Number.isInteger(droppedDocumentId) && droppedDocumentId > 0) {
      await handleDropDocument(droppedDocumentId, folder.id);
      return;
    }

    const droppedFolderId = Number(
      event.dataTransfer.getData("application/x-folder-id") ||
        event.dataTransfer.getData("text/plain") ||
        draggingFolderId,
    );

    if (!Number.isInteger(droppedFolderId) || droppedFolderId <= 0) return;

    await handleDropFolder(droppedFolderId, folder.id);
  };

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
      {/* Categories Section */}
      <section>
        <div className="mb-6 flex items-center justify-between">
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

      {/* Library Items Section */}
      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Library Items
            </h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Folders are shown before documents. Drag a document or folder onto a folder to move it.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {selectedFolder && (
              <button
                onClick={() => setSelectedFolderId(null)}
                className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300"
              >
                {selectedFolder.name} ×
              </button>
            )}
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {visibleItemCount} items
            </p>
          </div>
        </div>

        {view === "grid" ? (
          visibleItemCount > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {paginatedFolders.map((folder) => (
                <FolderCard
                  key={`folder-${folder.id}`}
                  folder={folder}
                  isActive={selectedFolderId === folder.id}
                  onClick={() => navigate(`/app/folders/${folder.id}`)}
                  onEdit={handleOpenEditFolder}
                  onDelete={setDeleteFolderId}
                  onMove={handleOpenMoveFolder}
                  onShare={setSharingFolder}
                  isDragOver={dragOverFolderId === folder.id}
                  onDragStart={(event) => handleFolderDragStart(event, folder)}
                  onDragEnd={resetDragState}
                  onDragOver={(event) => handleFolderDragOver(event, folder)}
                  onDragLeave={(event) => {
                    event.stopPropagation();
                    setDragOverFolderId((current) =>
                      current === folder.id ? null : current,
                    );
                  }}
                  onDrop={(event) => handleDropOnFolder(event, folder)}
                />
              ))}

              {paginatedDocuments.map((document) => {
                const FileIcon = getFileIcon(document);

                return (
                  <motion.div
                    key={`document-${document.id}`}
                    draggable
                    onDragStart={(event) =>
                      handleDocumentDragStart(
                        event as unknown as DragEvent<HTMLDivElement>,
                        document,
                      )
                    }
                    onDragEnd={resetDragState}
                    onClick={() => handleViewFile(document.id)}
                    className="cursor-pointer rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-colors hover:border-blue-100 hover:bg-blue-50/20 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/10"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
                        <FileIcon className="h-5 w-5" />
                      </div>

                      <div className="flex shrink-0 items-center justify-end" onClick={(event) => event.stopPropagation()}>
                        <RowActionMenu>
                          <ActionMenuItem icon={Eye} label="View information" onClick={() => setViewingDocumentInfo(document)} />
                          <ActionMenuItem
                            icon={Star}
                            label={document.fav ? "Remove favorite" : "Add favorite"}
                            onClick={() => toggleFavorite(document.id)}
                          />
                          <ActionMenuItem icon={Pencil} label="Rename" onClick={() => handleOpenEdit(document)} />
                          <ActionMenuItem icon={Folder} label="Move" onClick={() => handleOpenMoveDocument(document)} />
                          <ActionMenuItem icon={Download} label="Download" onClick={() => handleDownload(document.id, document.name)} />
                          <ActionMenuItem
                            icon={Share2}
                            label="Share document"
                            onClick={() => createAndCopyPublicLink(document.id)}
                            disabled={loadingDocumentId === document.id}
                          />
                          <ActionMenuItem icon={RotateCcw} label="Reprocess" onClick={() => handleReprocess(document.id)} />
                          <ActionMenuItem icon={Trash2} label="Delete" onClick={() => setDeleteId(document.id)} danger />
                        </RowActionMenu>
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
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              No folders or documents found.
            </div>
          )
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="w-full">
              <div className="grid w-full grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1fr)_72px] items-center border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 [&>*]:min-w-0">
                <div>Name</div>
                <div>Type / Category</div>
                <div>Location</div>
                <div>Date Added</div>
                <div>Size</div>
                <div>Status</div>
                <div>AI / Count</div>
                <div className="text-center">Actions</div>
              </div>

              {visibleItemCount > 0 ? (
                <>
                  {paginatedFolders.map((folder) => (
                    <FolderRow
                      key={`folder-row-${folder.id}`}
                      folder={folder}
                      isActive={selectedFolderId === folder.id}
                      isDragOver={dragOverFolderId === folder.id}
                      onOpen={() => navigate(`/app/folders/${folder.id}`)}
                      onEdit={handleOpenEditFolder}
                      onDelete={setDeleteFolderId}
                      onMove={handleOpenMoveFolder}
                      onShare={setSharingFolder}
                      onDragStart={(event) => handleFolderDragStart(event, folder)}
                      onDragEnd={resetDragState}
                      onDragOver={(event) => handleFolderDragOver(event, folder)}
                      onDragLeave={(event) => {
                        event.stopPropagation();
                        setDragOverFolderId((current) =>
                          current === folder.id ? null : current,
                        );
                      }}
                      onDrop={(event) => handleDropOnFolder(event, folder)}
                    />
                  ))}

                  {paginatedDocuments.map((document) => (
                    <DocumentRow
                      key={`document-row-${document.id}`}
                      document={document}
                      onDragStart={(event) => handleDocumentDragStart(event, document)}
                      onDragEnd={resetDragState}
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
                </>
              ) : (
                <div className="border-t border-slate-100 px-4 py-16 text-center dark:border-slate-800">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 dark:bg-slate-800">
                    <FileText className="h-6 w-6" />
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    No items found
                  </h3>

                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No folders or files match the current filter.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        <PaginationControls currentPage={currentPage} totalItems={visibleItemCount} pageSize={pageSize} onPageChange={setCurrentPage} />
      </section>

      {viewingDocumentInfo && (
        <DocumentInfoModal
          document={viewingDocumentInfo}
          onClose={() => setViewingDocumentInfo(null)}
        />
      )}

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
              Choose a destination folder and category for this document.
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

            <div className="mt-4">
              <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                Category
              </label>

              <select
                value={moveTargetCategoryId}
                onChange={(event) => setMoveTargetCategoryId(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-800"
              >
                {movingDocument.categoryId === null ||
                movingDocument.categoryId === undefined ? (
                  <option value="current">Keep uncategorized</option>
                ) : null}

                {allCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
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
                  setMoveTargetCategoryId("current");
                }}
                disabled={isMovingDocument}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleMoveDocument}
                disabled={isMovingDocument}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isMovingDocument ? "Moving..." : "Move"}
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
                    (folder) =>
                      Number(folder.id) !== Number(movingFolder.id) &&
                      !isDescendantFolder(folders, movingFolder.id, folder.id),
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
