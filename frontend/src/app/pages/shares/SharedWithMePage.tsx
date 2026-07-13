import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Download,
  Eye,
  FileText,
  Folder,
  Loader2,
  RefreshCcw,
  Search,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import {
  sharedWithMeApi,
  type SharedWithMeItem,
  type SharedWithMeType,
} from "../../services/sharedWithMeApi";
import { documentApi } from "../../services/documentApi";
import { ReportDocumentModal } from "./components/ReportDocumentModal";

type FilterType = SharedWithMeType;

const typeLabels: Record<FilterType, string> = {
  ALL: "All",
  DOCUMENT: "Documents",
  FOLDER: "Folders",
};

const permissionLabels: Record<string, string> = {
  VIEW: "View only",
  DOWNLOAD: "Allow download",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Active",
  REVOKED: "Revoked",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "No expiration";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getErrorMessage = (error: any, fallback: string) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

const isExpiringSoon = (value?: string | null) => {
  if (!value) return false;

  const expiresAt = new Date(value).getTime();
  if (Number.isNaN(expiresAt)) return false;

  const now = Date.now();
  const threeDays = 3 * 24 * 60 * 60 * 1000;

  return expiresAt > now && expiresAt - now <= threeDays;
};

const sortBySharedAtDesc = (items: SharedWithMeItem[]) => {
  return [...items].sort((first, second) => {
    const firstTime = new Date(first.sharedAt).getTime();
    const secondTime = new Date(second.sharedAt).getTime();

    return (Number.isNaN(secondTime) ? 0 : secondTime) -
      (Number.isNaN(firstTime) ? 0 : firstTime);
  });
};

export function SharedWithMePage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<SharedWithMeItem[]>([]);
  const [filterType, setFilterType] = useState<FilterType>("ALL");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [reportTarget, setReportTarget] = useState<SharedWithMeItem | null>(null);

  const loadItems = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await sharedWithMeApi.getSharedItems({
        page,
        size: 20,
        type: filterType,
      });

      const activeItems = (response.data.content ?? []).filter(
        (item) => item.status === "ACTIVE",
      );

      setItems(sortBySharedAtDesc(activeItems));
      setTotalPages(response.data.totalPages || 1);
      setTotalElements(activeItems.length);
    } catch (error: any) {
      console.error(error);
      toast.error(getErrorMessage(error, "Unable to load shared items."));
    } finally {
      setIsLoading(false);
    }
  }, [filterType, page]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleChangeFilter = (type: FilterType) => {
    setFilterType(type);
    setPage(0);
  };

  const filteredItems = useMemo(() => {
    const cleanKeyword = keyword.trim().toLowerCase();
    if (!cleanKeyword) return items;

    return items.filter((item) => {
      return [
        item.title,
        item.ownerName,
        item.ownerEmail,
        item.permission,
        item.itemType,
        item.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(cleanKeyword));
    });
  }, [items, keyword]);

  const handleOpen = (item: SharedWithMeItem) => {
    if (item.status !== "ACTIVE") {
      toast.error("This shared item is no longer active.");
      return;
    }

    if (item.itemType === "DOCUMENT") {
      navigate(`/app/library/${item.itemId}/preview`, {
        state: {
          fromSharedDocument: true,
          permission: item.permission,
          ownerName: item.ownerName,
          ownerEmail: item.ownerEmail,
          sharedDocument: {
            id: item.itemId,
            title: item.title,
          },
        },
      });
      return;
    }

    navigate(`/app/shared/folders/${item.itemId}`, {
      state: {
        title: item.title,
        permission: item.permission,
        ownerName: item.ownerName,
        ownerEmail: item.ownerEmail,
      },
    });
  };

  const handleDownloadDocument = async (item: SharedWithMeItem) => {
    if (item.itemType !== "DOCUMENT") {
      toast.error("Folder download is not supported.");
      return;
    }

    if (item.status !== "ACTIVE") {
      toast.error("This shared document is no longer active.");
      return;
    }

    if (item.permission !== "DOWNLOAD") {
      toast.error("You do not have permission to download this document.");
      return;
    }

    try {
      setDownloadingId(item.itemId);

      const response = await documentApi.downloadDocument(item.itemId);
      const blobUrl = window.URL.createObjectURL(response.data);
      const link = window.document.createElement("a");

      link.href = blobUrl;
      link.download = item.title || "document";

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
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
            Shared With Me
          </p>

          <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">
            Resources shared with me
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            View documents and folders that other users have shared with your
            account.
          </p>
        </div>

        <button
          type="button"
          onClick={loadItems}
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

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["ALL", "DOCUMENT", "FOLDER"] as FilterType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleChangeFilter(type)}
                className={`rounded-xl px-4 py-2 text-sm font-extrabold transition ${
                  filterType === type
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {typeLabels[type]}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Search by name, owner, type, or permission..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
            List ({totalElements})
          </h2>

          <span className="text-xs font-semibold text-slate-400">
            Page {page + 1}/{Math.max(totalPages, 1)}
          </span>
        </div>

        {isLoading ? (
          <div className="flex min-h-[260px] items-center justify-center text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
            Loading...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center text-slate-500">
            <FileText className="mb-3 h-12 w-12" />

            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              No shared resources yet.
            </p>

            <p className="mt-1 text-sm">
              Documents and folders shared with you will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredItems.map((item) => {
              const isFolder = item.itemType === "FOLDER";
              const isDocument = item.itemType === "DOCUMENT";
              const expiringSoon = isExpiringSoon(item.expiresAt);

              return (
                <div
                  key={`${item.itemType}-${item.shareId}-${item.itemId}`}
                  className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                      {isFolder ? (
                        <Folder className="h-6 w-6" />
                      ) : (
                        <FileText className="h-6 w-6" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-extrabold text-slate-950 dark:text-white">
                          {item.title}
                        </h3>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {isFolder ? "Folder" : "Document"}
                        </span>

                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {permissionLabels[item.permission] || item.permission}
                        </span>

                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          {statusLabels[item.status] || item.status}
                        </span>

                        {expiringSoon && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                            Expiring soon
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <UserRound className="h-3.5 w-3.5" />
                          {item.ownerName || item.ownerEmail}
                        </span>

                        <span>Shared at: {formatDateTime(item.sharedAt)}</span>

                        <span
                          className={
                            expiringSoon
                              ? "font-bold text-amber-600 dark:text-amber-300"
                              : ""
                          }
                        >
                          Expires at: {formatDateTime(item.expiresAt)}
                          {expiringSoon ? " · Expiring soon" : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpen(item)}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      <Eye className="h-4 w-4" />
                      {isFolder ? "Open folder" : "Open document"}
                    </button>

                    {isDocument && (
                      <button
                        type="button"
                        onClick={() => setReportTarget(item)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-800 dark:text-red-300 dark:hover:bg-red-950/30"
                      >
                        <ShieldAlert className="h-4 w-4" />
                        Report
                      </button>
                    )}

                    {isDocument && item.permission === "DOWNLOAD" && (
                      <button
                        type="button"
                        onClick={() => handleDownloadDocument(item)}
                        disabled={downloadingId === item.itemId}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        {downloadingId === item.itemId ? (
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

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <button
            type="button"
            disabled={page <= 0 || isLoading}
            onClick={() => setPage((current) => Math.max(current - 1, 0))}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
          >
            Previous
          </button>

          <button
            type="button"
            disabled={page + 1 >= totalPages || isLoading}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
          >
            Next
          </button>
        </div>
      </section>

      {reportTarget && (
        <ReportDocumentModal
          documentId={reportTarget.itemId}
          documentTitle={reportTarget.title}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}

export default SharedWithMePage;