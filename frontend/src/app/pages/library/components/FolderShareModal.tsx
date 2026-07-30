import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { PaginationControls } from "../../../components/ui/PaginationControls";
import {
  folderApi,
  type FolderResponse,
  type FolderShareResponse,
  type ShareFolderRequest,
} from "../../../services/folderApi";
import type { SharePermission } from "../../../services/documentShareApi";

interface FolderShareModalProps {
  folder: FolderResponse;
  onClose: () => void;
}

const permissionLabels: Record<string, string> = {
  VIEW: "View only",
  DOWNLOAD: "Allow download",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Active",
  REVOKED: "Revoked",
};

const SHARED_USERS_PAGE_SIZE = 5;

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

const normalizeEmails = (value: string) => {
  return value
    .split(/[,\n;]/)
    .map((email) => email.trim())
    .filter(Boolean);
};

export function FolderShareModal({ folder, onClose }: FolderShareModalProps) {
  const [emailsText, setEmailsText] = useState("");
  const [permission, setPermission] = useState<SharePermission>("VIEW");
  const [expiresAt, setExpiresAt] = useState("");
  const [sharedUsers, setSharedUsers] = useState<FolderShareResponse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [revokingUserId, setRevokingUserId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const emails = useMemo(() => normalizeEmails(emailsText), [emailsText]);
  const totalPages = Math.max(
    1,
    Math.ceil(sharedUsers.length / SHARED_USERS_PAGE_SIZE),
  );
  const paginatedSharedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * SHARED_USERS_PAGE_SIZE;
    return sharedUsers.slice(startIndex, startIndex + SHARED_USERS_PAGE_SIZE);
  }, [currentPage, sharedUsers]);

  const loadSharedUsers = useCallback(async () => {
    try {
      setIsLoadingShares(true);
      const response = await folderApi.getFolderShares(folder.id);
      setSharedUsers(response.data ?? []);
    } catch (error: any) {
      console.error(error);
      toast.error(getErrorMessage(error, "Unable to load shared users."));
    } finally {
      setIsLoadingShares(false);
    }
  }, [folder.id]);

  useEffect(() => {
    loadSharedUsers();
  }, [loadSharedUsers]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const handleShare = async () => {
    if (emails.length === 0) {
      toast.error("Please enter at least one email.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: ShareFolderRequest = {
        emails,
        permission,
        expiresAt: expiresAt ? `${expiresAt}T23:59:59` : null,
      };

      const response = await folderApi.shareFolder(folder.id, payload);
      const data = response.data;

      if (data.sharedEmails?.length) {
        toast.success(`Shared successfully: ${data.sharedEmails.join(", ")}`);
      }

      if (data.alreadySharedEmails?.length) {
        toast.info(`Already shared: ${data.alreadySharedEmails.join(", ")}`);
      }

      if (data.notFoundEmails?.length) {
        toast.warning(`Emails not registered: ${data.notFoundEmails.join(", ")}`);
      }

      setEmailsText("");
      setExpiresAt("");
      await loadSharedUsers();
    } catch (error: any) {
      console.error(error);
      toast.error(getErrorMessage(error, "Unable to share this folder."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (targetUserId: number) => {
    try {
      setRevokingUserId(targetUserId);
      await folderApi.revokeFolderShare(folder.id, targetUserId);
      toast.success("Folder share revoked.");
      await loadSharedUsers();
    } catch (error: any) {
      console.error(error);
      toast.error(getErrorMessage(error, "Unable to revoke this folder share."));
    } finally {
      setRevokingUserId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
              Share Folder
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-950 dark:text-white">
              {folder.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid max-h-[calc(90vh-80px)] gap-6 overflow-y-auto p-6 lg:h-[calc(90vh-80px)] lg:max-h-[700px] lg:grid-cols-[1fr_1.2fr]">
          <section className="space-y-4">
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Emails
              </label>
              <textarea
                value={emailsText}
                onChange={(event) => setEmailsText(event.target.value)}
                placeholder="receiver@example.com, student@example.com"
                rows={5}
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <p className="mt-1 text-xs text-slate-500">
                Separate emails with commas, semicolons, or new lines.
              </p>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Permission
              </label>
              <select
                value={permission}
                onChange={(event) =>
                  setPermission(event.target.value as SharePermission)
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="VIEW">View only</option>
                <option value="DOWNLOAD">Allow download</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Expiration date
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <p className="mt-1 text-xs text-slate-500">
                Leave empty for no expiration.
              </p>
            </div>

            <button
              type="button"
              onClick={handleShare}
              disabled={isSubmitting || emails.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Share folder
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-950 dark:text-white">
                Shared users
              </h3>

              <button
                type="button"
                onClick={loadSharedUsers}
                disabled={isLoadingShares}
                className="text-xs font-bold text-blue-600 disabled:opacity-60"
              >
                Refresh
              </button>
            </div>

            {isLoadingShares ? (
              <div className="flex min-h-[220px] items-center justify-center text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
                Loading...
              </div>
            ) : sharedUsers.length === 0 ? (
              <div className="flex min-h-[220px] items-center justify-center px-6 text-center text-sm text-slate-500">
                This folder has not been shared with anyone yet.
              </div>
            ) : (
              <div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedSharedUsers.map((user) => (
                    <div
                      key={`${user.shareId}-${user.userId}`}
                      className="flex flex-col gap-3 px-4 py-4 xl:flex-row xl:items-center xl:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-950 dark:text-white">
                          {user.fullName || user.email}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {user.email}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            {permissionLabels[user.permission] || user.permission}
                          </span>

                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            {statusLabels[user.status] || user.status}
                          </span>

                          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            Expires: {formatDateTime(user.expiresAt)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRevoke(user.userId)}
                        disabled={revokingUserId === user.userId}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-extrabold text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/60 dark:hover:bg-red-950/30"
                      >
                        {revokingUserId === user.userId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-100 px-4 pb-4 dark:border-slate-800">
                  <PaginationControls
                    currentPage={currentPage}
                    totalItems={sharedUsers.length}
                    pageSize={SHARED_USERS_PAGE_SIZE}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default FolderShareModal;
