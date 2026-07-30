import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Eye,
  FileText,
  Folder,
  Loader2,
  RefreshCcw,
  Search,
  Share2,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { PaginationControls } from "../../components/ui/PaginationControls";

import { documentApi } from "../../services/documentApi";
import {
  documentShareApi,
  type DocumentShareResponse,
} from "../../services/documentShareApi";
import {
  folderApi,
  type FolderResponse,
  type FolderShareResponse,
} from "../../services/folderApi";
import { getCurrentUserId } from "../../services/apiClient";
import { filterMyDocuments } from "../../utils/documentOwnership";
import type { DocumentListItemResponse } from "../../types/documents/types";

type SharedDocumentRow = {
  document: DocumentListItemResponse;
  shares: DocumentShareResponse[];
};

type SharedFolderRow = {
  folder: FolderResponse;
  shares: FolderShareResponse[];
};

type SharedItemsTab = "folders" | "documents";

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

const getDocumentTitle = (document: DocumentListItemResponse) => {
  return (
    document.title ||
    document.name ||
    document.originalName ||
    "Untitled document"
  );
};

const getFolderTitle = (folder: FolderResponse) => {
  return folder.name || "Untitled folder";
};

export function MySharedDocumentsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<SharedDocumentRow[]>([]);
  const [folderRows, setFolderRows] = useState<SharedFolderRow[]>([]);
  const [keyword, setKeyword] = useState("");
  const [activeTab, setActiveTab] = useState<SharedItemsTab>("folders");
  const [isLoading, setIsLoading] = useState(false);
  const [revokingKey, setRevokingKey] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<
    Record<number, boolean>
  >({});
  const [folderPage, setFolderPage] = useState(1);
  const [documentPage, setDocumentPage] = useState(1);
  const pageSize = 5;

  const loadSharedItems = useCallback(async () => {
    try {
      setIsLoading(true);

      const currentUserId = getCurrentUserId();

      if (!currentUserId) {
        toast.error("Please log in again.");
        setRows([]);
        setFolderRows([]);
        return;
      }

      const [documentResponse, folderResponse] = await Promise.all([
        documentApi.getDocuments({
          page: 0,
          size: 100,
        }),
        folderApi.getFolders(currentUserId),
      ]);

      const myDocuments = filterMyDocuments(
        documentResponse.data.content ?? [],
        currentUserId,
      );

      const myFolders = folderResponse.data ?? [];

      const shareResults = await Promise.allSettled(
        myDocuments.map(async (document) => {
          const shareResponse = await documentShareApi.getDocumentShares(
            document.id,
          );

          const activeShares = (shareResponse.data ?? []).filter(
            (share) => share.status !== "REVOKED",
          );

          return {
            document,
            shares: activeShares,
          };
        }),
      );

      const folderShareResults = await Promise.allSettled(
        myFolders.map(async (folder) => {
          const shareResponse = await folderApi.getFolderShares(folder.id);

          const activeShares = (shareResponse.data ?? []).filter(
            (share) => share.status !== "REVOKED",
          );

          return {
            folder,
            shares: activeShares,
          };
        }),
      );

      const sharedRows = shareResults
        .filter(
          (result): result is PromiseFulfilledResult<SharedDocumentRow> =>
            result.status === "fulfilled",
        )
        .map((result) => result.value)
        .filter((row) => row.shares.length > 0);

      const sharedFolderRows = folderShareResults
        .filter(
          (result): result is PromiseFulfilledResult<SharedFolderRow> =>
            result.status === "fulfilled",
        )
        .map((result) => result.value)
        .filter((row) => row.shares.length > 0);

      setRows(sharedRows);
      setFolderRows(sharedFolderRows);
    } catch (error: any) {
      console.error(error);
      toast.error(getErrorMessage(error, "Unable to load your shared items."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSharedItems();
  }, [loadSharedItems]);

  const filteredRows = useMemo(() => {
    const cleanKeyword = keyword.trim().toLowerCase();
    if (!cleanKeyword) return rows;

    return rows.filter((row) => {
      const documentTitle = getDocumentTitle(row.document);
      return documentTitle.toLowerCase().includes(cleanKeyword);
    });
  }, [rows, keyword]);

  const filteredFolderRows = useMemo(() => {
    const cleanKeyword = keyword.trim().toLowerCase();
    if (!cleanKeyword) return folderRows;

    return folderRows.filter((row) => {
      const folderTitle = getFolderTitle(row.folder);
      return folderTitle.toLowerCase().includes(cleanKeyword);
    });
  }, [folderRows, keyword]);

  const totalSharedUsers = useMemo(() => {
    return rows.reduce((total, row) => total + row.shares.length, 0);
  }, [rows]);

  const totalSharedFolderUsers = useMemo(() => {
    return folderRows.reduce((total, row) => total + row.shares.length, 0);
  }, [folderRows]);

  useEffect(() => {
    setFolderPage((page) =>
      Math.min(page, Math.max(1, Math.ceil(filteredFolderRows.length / pageSize))),
    );
  }, [filteredFolderRows.length]);

  useEffect(() => {
    setDocumentPage((page) =>
      Math.min(page, Math.max(1, Math.ceil(filteredRows.length / pageSize))),
    );
  }, [filteredRows.length]);

  const handleOpenPreview = (documentId: number) => {
    navigate(`/app/library/${documentId}/preview`);
  };

  const handleOpenFolder = (folderId: number) => {
    navigate(`/app/folders/${folderId}`);
  };

  const handleRevokeDocument = async (
    documentId: number,
    targetUserId: number,
  ) => {
    const key = `document-${documentId}-${targetUserId}`;

    try {
      setRevokingKey(key);
      await documentShareApi.revokeDocumentShare(documentId, targetUserId);
      toast.success("Share access revoked successfully.");
      await loadSharedItems();
    } catch (error: any) {
      console.error(error);
      toast.error(getErrorMessage(error, "Unable to revoke share access."));
    } finally {
      setRevokingKey(null);
    }
  };

  const handleRevokeFolder = async (folderId: number, targetUserId: number) => {
    const key = `folder-${folderId}-${targetUserId}`;

    try {
      setRevokingKey(key);
      await folderApi.revokeFolderShare(folderId, targetUserId);
      toast.success("Folder share revoked successfully.");
      await loadSharedItems();
    } catch (error: any) {
      console.error(error);
      toast.error(
        getErrorMessage(error, "Unable to revoke folder share access."),
      );
    } finally {
      setRevokingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
            My Shared Items
          </p>

          <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">
            Documents and folders I shared
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            View and manage documents and folders that you have shared with
            other users.
          </p>
        </div>

        <button
          type="button"
          onClick={loadSharedItems}
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

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Shared documents
              </p>
              <p className="text-2xl font-extrabold text-slate-950 dark:text-white">
                {rows.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
              <Folder className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Shared folders
              </p>
              <p className="text-2xl font-extrabold text-slate-950 dark:text-white">
                {folderRows.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              <UsersRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Shared users
              </p>
              <p className="text-2xl font-extrabold text-slate-950 dark:text-white">
                {totalSharedUsers + totalSharedFolderUsers}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Search document or folder..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setActiveTab("folders")}
          className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
            activeTab === "folders"
              ? "bg-blue-600 text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          Shared folders ({filteredFolderRows.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("documents")}
          className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
            activeTab === "documents"
              ? "bg-blue-600 text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          Shared documents ({filteredRows.length})
        </button>
      </div>

      {activeTab === "folders" && (
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
            Shared folder list ({filteredFolderRows.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
            Loading...
          </div>
        ) : filteredFolderRows.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center text-slate-500">
            <Folder className="mb-3 h-12 w-12" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              You have not shared any folders yet.
            </p>
            <p className="mt-1 text-sm">
              Open a folder, click Share, and shared folders will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4 p-5">
            {filteredFolderRows.slice((folderPage - 1) * pageSize, folderPage * pageSize).map((row) => {
              const folderTitle = getFolderTitle(row.folder);
              const isExpanded = expandedFolderIds[row.folder.id] === true;

              return (
                <section
                  key={row.folder.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"
                >
                  <div
                    className={`flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-5 py-4 dark:bg-slate-800/60 ${
                      isExpanded
                        ? "border-b border-slate-200 dark:border-slate-700"
                        : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-extrabold text-slate-950 dark:text-white">
                          {folderTitle}
                        </h3>
                        <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                          {row.shares.length}{" "}
                          {row.shares.length === 1 ? "user" : "users"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {(row.folder.documentCount ?? 0)} documents
                        {" · "}
                        {(row.folder.childFolderCount ?? 0)} subfolders
                        {" · "}
                        Parent: {row.folder.parentFolderName || "Root"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenFolder(row.folder.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
                      >
                        <Eye className="h-4 w-4" />
                        Open folder
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedFolderIds((current) => ({
                            ...current,
                            [row.folder.id]: !isExpanded,
                          }))
                        }
                        className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-blue-950/30"
                      >
                        {isExpanded ? "Hide shared users" : "Show shared users"}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {row.shares.map((share) => {
                        const revokeKey = `folder-${row.folder.id}-${share.userId}`;
                        const isRevoking = revokingKey === revokeKey;

                        return (
                          <div
                            key={`${row.folder.id}-${share.userId}-${share.shareId}`}
                            className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-sm font-extrabold text-slate-800 dark:text-slate-100">
                                  <UserRound className="h-4 w-4 text-slate-400" />
                                  {share.fullName || share.email}
                                </span>
                                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                  {permissionLabels[share.permission] ||
                                    share.permission}
                                </span>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  {statusLabels[share.status] || share.status}
                                </span>
                              </div>

                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                <span>{share.email}</span>
                                <span>
                                  Expires at: {formatDateTime(share.expiresAt)}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleRevokeFolder(row.folder.id, share.userId)
                              }
                              disabled={isRevoking}
                              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/30"
                            >
                              {isRevoking ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Revoke
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
        <div className="px-5 pb-5"><PaginationControls currentPage={folderPage} totalItems={filteredFolderRows.length} pageSize={pageSize} onPageChange={setFolderPage} /></div>
      </section>
      )}

      {activeTab === "documents" && (
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
            Shared document list ({filteredRows.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="flex min-h-[260px] items-center justify-center text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
            Loading...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center text-slate-500">
            <Share2 className="mb-3 h-12 w-12" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              You have not shared any documents yet.
            </p>
            <p className="mt-1 text-sm">
              Open a document, click Share, and shared documents will appear
              here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRows.slice((documentPage - 1) * pageSize, documentPage * pageSize).map((row) => {
              const documentTitle = getDocumentTitle(row.document);

              return (
                <div key={row.document.id} className="px-5 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                        <FileText className="h-6 w-6" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-base font-extrabold text-slate-950 dark:text-white">
                          {documentTitle}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span>{row.document.fileType || "Unknown type"}</span>
                          <span>{row.document.folder || "Root"}</span>
                          <span>
                            Shared with {row.shares.length}{" "}
                            {row.shares.length === 1 ? "user" : "users"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenPreview(row.document.id)}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      <Eye className="h-4 w-4" />
                      Open preview
                    </button>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800">
                    {row.shares.map((share) => {
                      const revokeKey = `document-${row.document.id}-${share.userId}`;
                      const isRevoking = revokingKey === revokeKey;

                      return (
                        <div
                          key={`${row.document.id}-${share.userId}-${share.shareId}`}
                          className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-sm font-extrabold text-slate-800 dark:text-slate-100">
                                <UserRound className="h-4 w-4 text-slate-400" />
                                {share.fullName || share.email}
                              </span>
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                {permissionLabels[share.permission] ||
                                  share.permission}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {statusLabels[share.status] || share.status}
                              </span>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                              <span>{share.email}</span>
                              <span>
                                Shared at:{" "}
                                {formatDateTime(
                                  share.sharedAt || share.createdAt,
                                )}
                              </span>
                              <span>
                                Expires at: {formatDateTime(share.expiresAt)}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleRevokeDocument(row.document.id, share.userId)
                            }
                            disabled={isRevoking}
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/30"
                          >
                            {isRevoking ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Revoke
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="px-5 pb-5"><PaginationControls currentPage={documentPage} totalItems={filteredRows.length} pageSize={pageSize} onPageChange={setDocumentPage} /></div>
      </section>
      )}
    </div>
  );
}

export default MySharedDocumentsPage;
