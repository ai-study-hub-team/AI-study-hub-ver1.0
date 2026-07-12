import { FileText, X } from "lucide-react";

export interface DocumentInformation {
  id: number;
  name?: string;
  title?: string;
  originalName?: string;
  fileName?: string;
  type?: string;
  fileType?: string;
  mimeType?: string;
  contentType?: string;
  category?: string;
  categoryName?: string;
  folder?: string;
  folderName?: string;
  date?: string;
  createdAt?: string;
  uploadedAt?: string;
  fileSize?: number;
  documentStatus?: string;
  status?: string;
  aiStatus?: string;
  processStatus?: string;
  fav?: boolean;
  favorite?: boolean;
  isFavorite?: boolean;
}

const MIME_TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "text/plain": "TXT",
  "text/csv": "CSV",
  "video/mp4": "MP4",
  "audio/mpeg": "MP3",
  "image/jpeg": "JPG",
  "image/png": "PNG",
};

const displayValue = (value: unknown, fallback = "Not available") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

const getFileType = (document: DocumentInformation) => {
  const name =
    document.originalName ||
    document.fileName ||
    document.name ||
    document.title ||
    "";
  const extension = name.match(/\.([a-z0-9]{1,10})$/i)?.[1];
  if (extension) return extension.toUpperCase();

  const rawType =
    document.fileType || document.type || document.mimeType || document.contentType;
  if (!rawType) return "FILE";

  const normalizedType = rawType.toLowerCase().split(";")[0].trim();
  if (MIME_TYPE_LABELS[normalizedType]) return MIME_TYPE_LABELS[normalizedType];

  if (!normalizedType.includes("/")) {
    return normalizedType.replace(/^\./, "").toUpperCase();
  }

  const subtype = normalizedType.split("/").pop() || "file";
  const knownExtension = subtype.match(
    /(pdf|docx?|pptx?|xlsx?|txt|csv|mp4|mp3|jpe?g|png|webp|zip)$/i,
  )?.[1];
  return knownExtension
    ? knownExtension.replace("jpeg", "jpg").toUpperCase()
    : "FILE";
};

const formatFileSize = (size?: number) => {
  if (typeof size !== "number" || !Number.isFinite(size) || size < 0) {
    return "Not available";
  }
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const formatDate = (value?: string) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export function DocumentInformationModal({
  document,
  onClose,
}: {
  document: DocumentInformation;
  onClose: () => void;
}) {
  const name =
    document.name ||
    document.title ||
    document.originalName ||
    document.fileName ||
    `Document #${document.id}`;
  const favoriteValue = document.fav ?? document.favorite ?? document.isFavorite;

  const rows = [
    ["Document ID", document.id],
    ["File type", getFileType(document)],
    ["Category", document.category || document.categoryName || "Uncategorized"],
    ["Folder", document.folder || document.folderName || "Root"],
    ["Created date", formatDate(document.createdAt || document.uploadedAt || document.date)],
    ["File size", formatFileSize(document.fileSize)],
    ["Document status", document.documentStatus || document.status],
    ["AI status", document.aiStatus || document.processStatus],
    ["Favorite", favoriteValue === undefined ? "Not available" : favoriteValue ? "Yes" : "No"],
  ];

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 px-4 py-6"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-information-title"
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
              <FileText className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 id="document-information-title" className="text-2xl font-extrabold text-slate-950 dark:text-white">
                Document information
              </h2>
              <p className="mt-1 truncate text-base text-slate-500 dark:text-slate-400">{name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close document information"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
          {rows.map(([label, value]) => (
            <div
              key={String(label)}
              className="grid grid-cols-[180px_minmax(0,1fr)] gap-6 border-b border-slate-100 px-5 py-4 text-base last:border-b-0 dark:border-slate-800"
            >
              <span className="font-semibold text-slate-500 dark:text-slate-400">{label}</span>
              <span className="min-w-0 break-words font-bold text-slate-800 dark:text-slate-200">
                {displayValue(value)}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
          Click the document row or card to open the document preview.
        </p>
      </div>
    </div>
  );
}
