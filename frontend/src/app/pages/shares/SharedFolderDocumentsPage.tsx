import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Download,
  Eye,
  FileArchive,
  FileAudio,
  FileImage,
  FileQuestion,
  FileText,
  FileVideo,
  FolderOpen,
  Loader2,
  Presentation,
  RefreshCcw,
  ShieldAlert,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";

import { folderApi } from "../../services/folderApi";
import { documentApi } from "../../services/documentApi";
import { ReportDocumentModal } from "./components/ReportDocumentModal";
import { PaginationControls } from "../../components/ui/PaginationControls";

interface SharedFolderDocument {
  id: number;
  title?: string;
  name?: string;
  originalName?: string;
  fileName?: string;
  folderId?: number;
  folderName?: string;
  fileType?: string;
  mimeType?: string;
  contentType?: string;
  fileUrl?: string;
  url?: string;
  path?: string;
  processStatus?: string;
}

interface RouteState {
  title?: string;
  permission?: string;
  ownerName?: string;
  ownerEmail?: string;
}

type ListResponse<T> =
  | T[]
  | {
      content?: T[];
      data?: T[];
      documents?: T[];
      items?: T[];
    };

const normalizeList = <T,>(data: ListResponse<T> | null | undefined): T[] => {
  if (Array.isArray(data)) return data;

  return data?.content ?? data?.data ?? data?.documents ?? data?.items ?? [];
};

const getErrorMessage = (error: any, fallback: string) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

const getDocumentTitle = (document: SharedFolderDocument) => {
  return (
    document.title ||
    document.name ||
    document.originalName ||
    document.fileName ||
    `Document #${document.id}`
  );
};

const getDocumentExtension = (document: SharedFolderDocument) => {
  const title = getDocumentTitle(document);
  const fileType = document.fileType?.toLowerCase().trim() || "";

  if (fileType.includes("pdf")) return "pdf";
  if (fileType.includes("word")) return "docx";
  if (fileType.includes("document")) return "docx";
  if (fileType.includes("presentation")) return "pptx";
  if (fileType.includes("powerpoint")) return "pptx";
  if (fileType.includes("sheet")) return "xlsx";
  if (fileType.includes("excel")) return "xlsx";
  if (fileType.includes("image")) return "image";
  if (fileType.includes("audio")) return "audio";
  if (fileType.includes("video")) return "video";
  if (fileType.includes("youtube")) return "youtube";
  if (fileType.includes("zip") || fileType.includes("rar")) return "archive";

  const matchedExtension = title.toLowerCase().match(/\.([a-z0-9]+)$/);
  return matchedExtension?.[1] || fileType || "file";
};

const getDocumentTypeInfo = (document: SharedFolderDocument) => {
  const extension = getDocumentExtension(document);

  switch (extension) {
    case "pdf":
      return {
        label: "PDF",
        Icon: FileText,
        className:
          "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300",
      };

    case "doc":
    case "docx":
      return {
        label: "DOCX",
        Icon: FileText,
        className:
          "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300",
      };

    case "ppt":
    case "pptx":
      return {
        label: "PPTX",
        Icon: Presentation,
        className:
          "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300",
      };

    case "xls":
    case "xlsx":
    case "csv":
      return {
        label: extension.toUpperCase(),
        Icon: FileText,
        className:
          "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
      };

    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
    case "gif":
    case "image":
      return {
        label: "IMAGE",
        Icon: FileImage,
        className:
          "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300",
      };

    case "mp3":
    case "wav":
    case "m4a":
    case "audio":
      return {
        label: "AUDIO",
        Icon: FileAudio,
        className:
          "bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-300",
      };

    case "mp4":
    case "mov":
    case "avi":
    case "video":
      return {
        label: "VIDEO",
        Icon: FileVideo,
        className:
          "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300",
      };

    case "youtube":
      return {
        label: "YOUTUBE",
        Icon: Youtube,
        className:
          "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300",
      };

    case "zip":
    case "rar":
    case "archive":
      return {
        label: "ARCHIVE",
        Icon: FileArchive,
        className:
          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      };

    default:
      return {
        label: extension ? extension.toUpperCase() : "FILE",
        Icon: FileQuestion,
        className:
          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      };
  }
};

export function SharedFolderDocumentsPage() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as RouteState;

  const numericFolderId = Number(folderId);
  const canDownload = state.permission === "DOWNLOAD";

  const [documents, setDocuments] = useState<SharedFolderDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [reportTarget, setReportTarget] = useState<SharedFolderDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const paginatedDocuments = documents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const title = useMemo(() => {
    return state.title || `Shared folder #${numericFolderId}`;
  }, [numericFolderId, state.title]);

  const loadDocuments = useCallback(async () => {
    if (!Number.isInteger(numericFolderId) || numericFolderId <= 0) {
      toast.error("Invalid folder.");
      navigate("/app/shared-with-me");
      return;
    }

    try {
      setIsLoading(true);

      const response = await folderApi.getSharedFolderDocuments(numericFolderId);

      const list = normalizeList(
        response.data as ListResponse<SharedFolderDocument>,
      );

      setDocuments(list);
    } catch (error: any) {
      console.error(error);

      if (error?.response?.status === 403) {
        toast.error("You no longer have access to this shared folder.");
        navigate("/app/shared-with-me");
        return;
      }

      if (error?.response?.status === 404) {
        toast.error("Shared folder not found.");
        navigate("/app/shared-with-me");
        return;
      }

      toast.error(
        getErrorMessage(
          error,
          "Unable to load documents in this shared folder.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [navigate, numericFolderId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleView = (document: SharedFolderDocument) => {
    navigate(`/app/library/${document.id}/preview`, {
      state: {
        fromSharedFolder: true,
        folderId: numericFolderId,
        permission: state.permission,
        ownerName: state.ownerName,
        ownerEmail: state.ownerEmail,
        sharedDocument: document,
      },
    });
  };

  const handleDownload = async (document: SharedFolderDocument) => {
    if (!canDownload) {
      toast.error(
        "You do not have permission to download documents in this folder.",
      );
      return;
    }

    try {
      setDownloadingId(document.id);

      const response = await documentApi.downloadDocument(document.id);
      const blobUrl = window.URL.createObjectURL(response.data);
      const link = window.document.createElement("a");

      link.href = blobUrl;
      link.download = getDocumentTitle(document);

      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error: any) {
      console.error(error);

      if (error?.response?.status === 403) {
        toast.error("You do not have permission to download this document.");
        return;
      }

      toast.error(getErrorMessage(error, "Unable to download document."));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate("/app/shared-with-me")}
            className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shared With Me
          </button>

          <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
            Shared Folder
          </p>

          <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">
            {title}
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {state.ownerName || state.ownerEmail
              ? `Shared by ${state.ownerName || state.ownerEmail}`
              : "Documents inside this shared folder."}
          </p>
        </div>

        <button
          type="button"
          onClick={loadDocuments}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
          Refresh
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
            Folder documents ({documents.length})
          </h2>

          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            {canDownload ? "Allow download" : "View only"}
          </span>
        </div>

        {isLoading ? (
          <div className="flex min-h-[260px] items-center justify-center text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
            Loading...
          </div>
        ) : documents.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center text-slate-500">
            <FolderOpen className="mb-3 h-12 w-12" />

            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              This folder has no documents.
            </p>

            <p className="mt-1 text-sm">
              Documents shared through this folder will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedDocuments.map((document) => {
              const typeInfo = getDocumentTypeInfo(document);
              const DocumentIcon = typeInfo.Icon;

              return (
                <div
                  key={document.id}
                  className="group flex flex-col gap-4 px-5 py-4 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/50 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex min-w-0 gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${typeInfo.className}`}
                    >
                      <DocumentIcon className="h-6 w-6" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <h3 className="truncate text-base font-extrabold text-slate-950 dark:text-white">
                          {getDocumentTitle(document)}
                        </h3>

                        <button
                          type="button"
                          onClick={() => handleView(document)}
                          title="View document"
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 opacity-100 transition hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60 lg:opacity-0 lg:group-hover:opacity-100"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {typeInfo.label}
                        </span>

                        {document.processStatus && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                            {document.processStatus}
                          </span>
                        )}

                        {document.folderName && (
                          <span>{document.folderName}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleView(document)}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>

                    <button
                      type="button"
                      onClick={() => setReportTarget(document)}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-800 dark:text-red-300 dark:hover:bg-red-950/30"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      Report
                    </button>

                    {canDownload && (
                      <button
                        type="button"
                        onClick={() => handleDownload(document)}
                        disabled={downloadingId === document.id}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        {downloadingId === document.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        Download
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <PaginationControls currentPage={currentPage} totalItems={documents.length} pageSize={pageSize} onPageChange={setCurrentPage} />
      </section>

      {reportTarget && (
        <ReportDocumentModal
          documentId={reportTarget.id}
          documentTitle={getDocumentTitle(reportTarget)}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}

export default SharedFolderDocumentsPage;
