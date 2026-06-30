import {
  Download,
  Edit2,
  Eye,
  FileText,
  MoreVertical,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { documentApi } from "../../services/documentApi";
import { userApi, type UserResponse } from "../../services/userApi";
import type { DocumentListItemResponse } from "../../types/documents/types";

type AdminDocument = DocumentListItemResponse & {
  userName?: string;
  ownerName?: string;
  fullName?: string;
  email?: string;
  categoryName?: string;
  fileType?: string;
  fileUrl?: string;
  createdAt?: string;
};

type AdminUser = UserResponse & {
  name?: string;
  username?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

interface EditForm {
  title: string;
}

interface ActionMenuPosition {
  top: number;
  left: number;
}

interface UserPageResponse {
  content?: AdminUser[];
  data?: AdminUser[];
}

const getDocumentName = (document: AdminDocument) =>
  document.name ||
  document.title ||
  document.originalName ||
  document.fileName ||
  "Untitled";

const getUploadStatus = (document: AdminDocument) =>
  document.documentStatus || "ACTIVE";

const getAiStatus = (document: AdminDocument) =>
  document.aiStatus || "UPLOADED";

const getFileType = (document: AdminDocument) =>
  document.type || document.fileType || "application/octet-stream";

const getFileExtension = (document: AdminDocument) => {
  const name = getDocumentName(document);
  const extensionFromName = name.split(".").pop()?.toUpperCase();
  const extensionFromType = getFileType(document).split("/").pop()?.toUpperCase();

  return extensionFromName && extensionFromName !== name.toUpperCase()
    ? extensionFromName
    : extensionFromType || "FILE";
};

const getAvatar = (name: string) => {
  if (!name) return "U";

  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const formatFileSize = (size?: number) => {
  if (!size) return "0 KB";

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024)
    return `${(size / 1024 / 1024).toFixed(1)} MB`;

  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

const formatDate = (date?: string) => {
  if (!date) return "Unknown";

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "Unknown";

  return parsedDate.toLocaleDateString("vi-VN");
};

const StatusBadge = ({ status }: { status: string }) => {
  const normalizedStatus = status.toUpperCase();

  const config: Record<string, string> = {
    ACTIVE:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800",
    PROCESSED:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800",
    READY:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800",
    UPLOADED:
      "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-800",
    PROCESSING:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800",
    PENDING:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800",
    FAILED:
      "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-800",
    DELETED:
      "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
        config[normalizedStatus] ??
        "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
      }`}
    >
      {normalizedStatus}
    </span>
  );
};

export function DocumentAdmin() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [docs, setDocs] = useState<AdminDocument[]>([]);
  const [usersById, setUsersById] = useState<Record<number, AdminUser>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [actionMenuPosition, setActionMenuPosition] =
    useState<ActionMenuPosition | null>(null);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [editDoc, setEditDoc] = useState<AdminDocument | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    title: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const closeActionMenu = () => {
    setOpenMenu(null);
    setActionMenuPosition(null);
  };

  const loadDocuments = async () => {
    try {
      setIsLoading(true);

      const response = await documentApi.getDocuments({
        page: 0,
        size: 100,
      });

      setDocs((response.data.content ?? []) as AdminDocument[]);
    } catch (error) {
      console.error(error);
      toast.error("Cannot load documents.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await userApi.getUsers();

      const data = response.data as AdminUser[] | UserPageResponse;

      const users = Array.isArray(data)
        ? data
        : Array.isArray(data.content)
          ? data.content
          : Array.isArray(data.data)
            ? data.data
            : [];

      const mappedUsers = users.reduce<Record<number, AdminUser>>(
        (result, user) => {
          if (user.id) {
            result[user.id] = user;
          }

          return result;
        },
        {},
      );

      setUsersById(mappedUsers);
    } catch (error) {
      console.error(error);
      toast.error("Cannot load users.");
    }
  };

  useEffect(() => {
    loadDocuments();
    loadUsers();
  }, []);

  const getOwnerUser = (document: AdminDocument) => {
    if (!document.userId) return undefined;
    return usersById[document.userId];
  };

  const getOwnerName = (document: AdminDocument) => {
    const user = getOwnerUser(document);

    const firstLastName =
      user?.firstName || user?.lastName
        ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
        : "";

    return (
      document.userName ||
      document.ownerName ||
      document.fullName ||
      user?.fullName ||
      user?.name ||
      firstLastName ||
      user?.username ||
      user?.email ||
      `User #${document.userId ?? "Unknown"}`
    );
  };

  const getOwnerEmail = (document: AdminDocument) => {
    const user = getOwnerUser(document);
    return document.email || user?.email || "";
  };

  const filtered = docs.filter((document) => {
    const keyword = search.toLowerCase();
    const name = getDocumentName(document).toLowerCase();
    const owner = getOwnerName(document).toLowerCase();
    const ownerEmail = getOwnerEmail(document).toLowerCase();
    const category =
      document.folder?.toLowerCase() ||
      document.categoryName?.toLowerCase() ||
      "";
    const aiStatus = getAiStatus(document).toLowerCase();
    const uploadStatus = getUploadStatus(document).toLowerCase();

    return (
      name.includes(keyword) ||
      owner.includes(keyword) ||
      ownerEmail.includes(keyword) ||
      category.includes(keyword) ||
      aiStatus.includes(keyword) ||
      uploadStatus.includes(keyword)
    );
  });

  const toggleActionMenu = (
    event: MouseEvent<HTMLButtonElement>,
    documentId: number,
  ) => {
    event.stopPropagation();

    if (openMenu === documentId) {
      closeActionMenu();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 208;
    const menuHeight = 250;
    const gap = 8;

    let top = rect.bottom + gap;
    let left = rect.right - menuWidth;

    if (top + menuHeight > window.innerHeight) {
      top = rect.top - menuHeight - gap;
    }

    if (left + menuWidth > window.innerWidth) {
      left = window.innerWidth - menuWidth - 12;
    }

    if (left < 12) left = 12;
    if (top < 12) top = 12;

    setOpenMenu(documentId);
    setActionMenuPosition({ top, left });
  };

  const handlePreview = (document: AdminDocument) => {
    closeActionMenu();
    navigate(`/app/library/${document.id}/preview`);
  };

  const handleDownload = async (document: AdminDocument) => {
    try {
      const response = await documentApi.downloadDocument(document.id);

      const blob = new Blob([response.data], {
        type: getFileType(document),
      });

      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement("a");

      link.href = url;
      link.download = getDocumentName(document);
      window.document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Document downloaded successfully.");
      closeActionMenu();
    } catch (error) {
      console.error(error);
      toast.error("Cannot download document.");
    }
  };

  const openEditModal = async (id: number) => {
    try {
      const response = await documentApi.getDocumentById(id);
      const document = response.data as AdminDocument;

      setEditDoc(document);
      setEditForm({
        title: getDocumentName(document),
      });

      closeActionMenu();
    } catch (error) {
      console.error(error);
      toast.error("Cannot load document detail.");
    }
  };

  const updateDoc = async () => {
    if (!editDoc) return;

    const newTitle = editForm.title.trim();

    if (!newTitle) {
      toast.error("Document name cannot be empty.");
      return;
    }

    try {
      setIsSaving(true);

      const response = await documentApi.updateDocument(editDoc.id, {
        title: newTitle,
        userId: editDoc.userId,
        categoryId: editDoc.categoryId,
        originalName: editDoc.originalName,
        fileUrl: editDoc.fileUrl,
        fileType: getFileType(editDoc),
        fileSize: editDoc.fileSize,
      });

      const updatedDocument = response.data as AdminDocument;

      setDocs((current) =>
        current.map((document) =>
          document.id === editDoc.id ? updatedDocument : document,
        ),
      );

      toast.success("Document updated successfully.");
      setEditDoc(null);
    } catch (error) {
      console.error(error);
      toast.error("Cannot update document.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDoc = async (id: number): Promise<boolean> => {
    try {
      await documentApi.deleteDocument(id);

      setDocs((current) => current.filter((document) => document.id !== id));
      toast.success("Document deleted successfully.");
      closeActionMenu();

      return true;
    } catch (error) {
      console.error(error);
      toast.error("Cannot delete document.");
      return false;
    }
  };

  const reprocessDoc = async (id: number) => {
    try {
      const response = await documentApi.reprocessDocument(id);
      const updatedDocument = response.data as AdminDocument;

      setDocs((current) =>
        current.map((document) =>
          document.id === id ? updatedDocument : document,
        ),
      );

      toast.success("Document reprocess started.");
      closeActionMenu();
    } catch (error) {
      console.error(error);
      toast.error("Cannot reprocess document.");
    }
  };

  const selectedDocument = docs.find((document) => document.id === openMenu);

  return (
    <div className="space-y-8 bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Document Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            View, manage, and moderate all platform documents
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <span className="text-xs font-bold">Total: </span>
            <span className="text-sm font-extrabold">{docs.length}</span>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <span className="text-xs font-bold">Processed: </span>
            <span className="text-sm font-extrabold">
              {
                docs.filter(
                  (document) =>
                    getAiStatus(document).toUpperCase() === "PROCESSED",
                ).length
              }
            </span>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-1.5 text-amber-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <span className="text-xs font-bold">Processing: </span>
            <span className="text-sm font-extrabold">
              {
                docs.filter(
                  (document) =>
                    getAiStatus(document).toUpperCase() === "PROCESSING",
                ).length
              }
            </span>
          </div>

          <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-red-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <span className="text-xs font-bold">Failed: </span>
            <span className="text-sm font-extrabold">
              {
                docs.filter(
                  (document) => getAiStatus(document).toUpperCase() === "FAILED",
                ).length
              }
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4 lg:flex-row">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
            <input
              type="text"
              placeholder="Search by filename, owner, category or status..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="max-h-[620px] overflow-auto rounded-2xl">
          <table className="min-w-[1250px] w-full border-separate border-spacing-y-2">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 text-left text-xs font-bold uppercase tracking-widest text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Upload Status</th>
                <th className="px-4 py-3">AI Status</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              <AnimatePresence>
                {!isLoading &&
                  filtered.map((document) => (
                    <motion.tr
                      key={document.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group bg-white transition-colors hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800"
                    >
                      <td className="rounded-l-2xl px-4 py-3">
                        <div className="flex max-w-[460px] items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800">
                            <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                              {getDocumentName(document)}
                            </p>

                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {getFileExtension(document)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-extrabold text-white">
                            {getAvatar(getOwnerName(document))}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                              {getOwnerName(document)}
                            </p>

                            {getOwnerEmail(document) && (
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {getOwnerEmail(document)}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex max-w-[130px] truncate rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {document.folder ||
                            document.categoryName ||
                            "Uncategorized"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {formatFileSize(document.fileSize)}
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge status={getUploadStatus(document)} />
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge status={getAiStatus(document)} />
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(document.uploadedAt || document.createdAt)}
                      </td>

                      <td className="rounded-r-2xl px-4 py-3 text-right">
                        <button
                          onClick={(event) =>
                            toggleActionMenu(event, document.id)
                          }
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
              </AnimatePresence>
            </tbody>
          </table>

          {isLoading && (
            <div className="py-16 text-center">
              <p className="font-bold text-slate-500 dark:text-slate-400">
                Loading documents...
              </p>
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="py-16 text-center">
              <FileText className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="font-bold text-slate-500 dark:text-slate-400">
                No documents found
              </p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {openMenu !== null && actionMenuPosition && selectedDocument && (
          <>
            <div className="fixed inset-0 z-40" onClick={closeActionMenu} />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -6 }}
              transition={{ duration: 0.12 }}
              style={{
                top: actionMenuPosition.top,
                left: actionMenuPosition.left,
              }}
              className="fixed z-50 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30"
            >
              <button
                onClick={() => handlePreview(selectedDocument)}
                className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>

              <button
                onClick={() => handleDownload(selectedDocument)}
                className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                Download
              </button>

              <button
                onClick={() => openEditModal(selectedDocument.id)}
                className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Edit2 className="h-4 w-4" />
                Edit metadata
              </button>

              <button
                onClick={() => reprocessDoc(selectedDocument.id)}
                className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <RotateCcw className="h-4 w-4" />
                Reprocess AI
              </button>

              <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

              <button
                onClick={() => {
                  setDeleteId(selectedDocument.id);
                  closeActionMenu();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {editDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
                  Edit Document
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Update document name
                </p>
              </div>

              <button
                onClick={() => setEditDoc(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">
                  Document Name
                </label>
                <input
                  value={editForm.title}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Enter document name..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditDoc(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                onClick={updateDoc}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
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

                  const success = await deleteDoc(deleteId);

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
    </div>
  );
}
