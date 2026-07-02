import { useEffect, useMemo, useState } from "react";
import { Copy, Mail, Search, ShieldOff, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import {
  documentShareApi,
  type DocumentShareResponse,
  type SharePermission,
  type SharedUserResponse,
} from "../../services/documentShareApi";

type ShareRow = SharedUserResponse & {
  shareId?: number;
};

const permissionOptions: SharePermission[] = ["VIEW", "EDIT", "COMMENT"];

const toDatetimeLocalValue = (date: Date) => {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const toApiDatetime = (value: string) => {
  if (!value) return undefined;
  return new Date(value).toISOString();
};

const getShareId = (share: DocumentShareResponse) => {
  return share.shareId || share.id;
};

export function DocumentSharesPage() {
  const [documentIdInput, setDocumentIdInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [permission, setPermission] = useState<SharePermission>("VIEW");
  const [expiresAt, setExpiresAt] = useState(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    return toDatetimeLocalValue(defaultDate);
  });

  const [sharedUsers, setSharedUsers] = useState<SharedUserResponse[]>([]);
  const [shareRecords, setShareRecords] = useState<DocumentShareResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const documentId = useMemo(() => {
    const value = Number(documentIdInput);
    if (!Number.isInteger(value) || value <= 0) return null;
    return value;
  }, [documentIdInput]);

  const shareIdByUserId = useMemo(() => {
    const map = new Map<number, number>();

    shareRecords.forEach((share) => {
      const userId = share.userId;
      const shareId = getShareId(share);

      if (userId && shareId) {
        map.set(userId, shareId);
      }
    });

    return map;
  }, [shareRecords]);

  const rows: ShareRow[] = useMemo(() => {
    return sharedUsers.map((user) => ({
      ...user,
      shareId: shareIdByUserId.get(user.userId),
    }));
  }, [sharedUsers, shareIdByUserId]);

  const loadShares = async () => {
    if (!documentId) {
      toast.error("Please enter a valid document ID");
      return;
    }

    try {
      setIsLoading(true);

      const [usersRes, sharesRes] = await Promise.all([
        documentShareApi.getSharedUsers(documentId),
        documentShareApi.getDocumentShares(documentId),
      ]);

      setSharedUsers(usersRes.data || []);
      setShareRecords(sharesRes.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load sharing list");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!documentId) return;

    loadShares();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const handleShare = async () => {
    if (!documentId) {
      toast.error("Please enter a valid document ID");
      return;
    }

    const emails = emailInput
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);

    if (emails.length === 0) {
      toast.error("Please enter at least one email address");
      return;
    }

    try {
      setIsSharing(true);

      const res = await documentShareApi.shareDocumentToUsers(documentId, {
        emails,
        permission,
        expiresAt: toApiDatetime(expiresAt),
      });

      const sharedCount = res.data.sharedEmails?.length || 0;
      const alreadyCount = res.data.alreadySharedEmails?.length || 0;
      const notRegisteredCount = res.data.notRegisteredEmails?.length || 0;

      toast.success(
        `Shared with ${sharedCount} email(s). Already shared: ${alreadyCount}. Not registered: ${notRegisteredCount}.`,
      );

      setEmailInput("");
      await loadShares();
    } catch (error) {
      console.error(error);
      toast.error("Failed to share document");
    } finally {
      setIsSharing(false);
    }
  };

  const handleRevokeByShareId = async (shareId?: number) => {
    if (!documentId) {
      toast.error("Please enter a valid document ID");
      return;
    }

    if (!shareId) {
      toast.error("Share ID not found. Please reload share records.");
      return;
    }

    try {
      await documentShareApi.revokeShareByShareId(documentId, shareId);
      toast.success("Sharing permission has been revoked");
      await loadShares();
    } catch (error) {
      console.error(error);
      toast.error("Failed to revoke sharing permission");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!documentId) {
      toast.error("Please enter a valid document ID");
      return;
    }

    try {
      await documentShareApi.deleteSharedUser(documentId, userId);
      toast.success("User has been removed from the sharing list");
      await loadShares();
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove sharing permission");
    }
  };

  const handleCopyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success("Email copied to clipboard");
    } catch {
      toast.error("Failed to copy email");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
          Document Shares
        </div>

        <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
          Manage Document Sharing
        </h1>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Enter a document ID to view, add, revoke, or remove sharing
          permissions.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Document ID
            </label>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={documentIdInput}
                onChange={(event) => setDocumentIdInput(event.target.value)}
                placeholder="Example: 1"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1.4fr_0.8fr_1fr_auto]">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Email
              </label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={emailInput}
                  onChange={(event) => setEmailInput(event.target.value)}
                  placeholder="a@gmail.com, b@gmail.com"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Permission
              </label>

              <select
                value={permission}
                onChange={(event) =>
                  setPermission(event.target.value as SharePermission)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {permissionOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Expiration Date
              </label>

              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleShare}
                disabled={!documentId || isSharing}
                className="w-full rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSharing ? "Sharing..." : "Share"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Users className="h-5 w-5 text-blue-600" />
              Shared Users
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              List of users who currently have access to this document.
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {rows.length} users
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Permission</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Created At</th>
                <th className="px-5 py-3">Expires At</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-slate-500 dark:text-slate-400"
                  >
                    Loading sharing list...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-slate-500 dark:text-slate-400"
                  >
                    No users have been shared this document yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={`${row.userId}-${row.email}`}
                    className="hover:bg-slate-50 dark:hover:bg-slate-950/70"
                  >
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {row.fullName || "Unknown"}
                        </p>

                        <p className="text-xs text-slate-500">
                          userId: {row.userId}
                          {row.shareId ? ` · shareId: ${row.shareId}` : ""}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => handleCopyEmail(row.email)}
                        className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-300"
                      >
                        {row.email}
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                        {row.permission}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        {row.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString()
                        : "-"}
                    </td>

                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                      {row.expiresAt
                        ? new Date(row.expiresAt).toLocaleString()
                        : "-"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleRevokeByShareId(row.shareId)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 px-3 py-2 text-xs font-bold text-orange-600 transition hover:bg-orange-50 dark:border-orange-500/30 dark:text-orange-300 dark:hover:bg-orange-500/10"
                        >
                          <ShieldOff className="h-4 w-4" />
                          Revoke
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteUser(row.userId)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default DocumentSharesPage;