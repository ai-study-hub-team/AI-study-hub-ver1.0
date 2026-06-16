import {
  Download,
  Edit2,
  Eye,
  FileText,
  MoreVertical,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { documentApi } from "../../services/documentApi";

interface AdminDocument {
  id: number;
  fileType?: string;
  title?: string;
  fileName?: string;
  originalName?: string;
  userId?: number;
  categoryName?: string;
  fileSize?: number;
  processStatus?: string;
  documentStatus?: string;
  createdAt?: string;
}

const getDocumentName = (document: AdminDocument) =>
  document.title || document.originalName || document.fileName || "Untitled";

const getDocumentStatus = (document: AdminDocument) =>
  document.processStatus || document.documentStatus || "PENDING";

const getFileExtension = (document: AdminDocument) => {
  const name = getDocumentName(document);
  const extensionFromName = name.split(".").pop()?.toUpperCase();
  const extensionFromType = document.fileType?.split("/").pop()?.toUpperCase();

  return extensionFromName && extensionFromName !== name.toUpperCase()
    ? extensionFromName
    : extensionFromType || "FILE";
};

const formatFileSize = (size?: number) => {
  if (!size) return "0 KB";
  return `${(size / 1024).toFixed(1)} KB`;
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
    READY:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800",
    PROCESSED:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800",
    PROCESSING:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800",
    PENDING:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800",
    FAILED:
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
  const [search, setSearch] = useState("");
  const [docs, setDocs] = useState<AdminDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);

      const response = await documentApi.getDocuments({
        page: 0,
        size: 100,
      });

      setDocs(response.data.content ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Cannot load documents.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const filtered = docs.filter((document) => {
    const name = getDocumentName(document).toLowerCase();
    const owner = `user #${document.userId ?? ""}`.toLowerCase();

    return (
      name.includes(search.toLowerCase()) ||
      owner.includes(search.toLowerCase())
    );
  });

  const deleteDoc = async (id: number): Promise<boolean> => {
    try {
      await documentApi.deleteDocument(id);

      setDocs((current) => current.filter((document) => document.id !== id));
      toast.success("Document deleted successfully.");
      setOpenMenu(null);

      return true;
    } catch (error) {
      console.error(error);
      toast.error("Cannot delete document.");
      return false;
    }
  };

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

        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <span className="text-xs font-bold">Total: </span>
            <span className="text-sm font-extrabold">{docs.length}</span>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <span className="text-xs font-bold">Ready: </span>
            <span className="text-sm font-extrabold">
              {
                docs.filter((document) =>
                  ["READY", "PROCESSED"].includes(
                    getDocumentStatus(document).toUpperCase(),
                  ),
                ).length
              }
            </span>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-1.5 text-amber-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <span className="text-xs font-bold">Pending: </span>
            <span className="text-sm font-extrabold">
              {
                docs.filter((document) =>
                  ["PENDING", "PROCESSING"].includes(
                    getDocumentStatus(document).toUpperCase(),
                  ),
                ).length
              }
            </span>
          </div>

          <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-red-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <span className="text-xs font-bold">Failed: </span>
            <span className="text-sm font-extrabold">
              {
                docs.filter(
                  (document) =>
                    getDocumentStatus(document).toUpperCase() === "FAILED",
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
              placeholder="Search by filename or owner..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-bold uppercase tracking-widest text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <th className="px-4 py-2">Document</th>
                <th className="px-4 py-2">Owner</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Size</th>
                <th className="px-4 py-2">Upload Status</th>
                <th className="px-4 py-2">AI Status</th>
                <th className="px-4 py-2">Uploaded</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              <AnimatePresence>
                {filtered.map((document) => (
                  <motion.tr
                    key={document.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group bg-white transition-colors hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800"
                  >
                    <td className="rounded-l-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
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

                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      User #{document.userId ?? "Unknown"}
                    </td>

                    <td className="px-4 py-3">
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {document.categoryName || "Uncategorized"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {formatFileSize(document.fileSize)}
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800">
                        {document.documentStatus || "ACTIVE"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={getDocumentStatus(document)} />
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(document.createdAt)}
                    </td>

                    <td className="rounded-r-2xl px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() =>
                            setOpenMenu(
                              openMenu === document.id ? null : document.id,
                            )
                          }
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        <AnimatePresence>
                          {openMenu === document.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -5 }}
                              className="absolute right-0 top-full z-20 mt-1 w-44 rounded-2xl border border-slate-200 bg-white py-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                            >
                              <button
                                onClick={() => {
                                  toast.success("Opening document preview...");
                                  setOpenMenu(null);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <Eye className="h-4 w-4" /> Preview
                              </button>

                              <button
                                onClick={() => {
                                  toast.success("Downloading document...");
                                  setOpenMenu(null);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <Download className="h-4 w-4" /> Download
                              </button>

                              <button
                                onClick={() => {
                                  toast.success("Edit metadata opened");
                                  setOpenMenu(null);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <Edit2 className="h-4 w-4" /> Edit
                              </button>

                              <div className="mx-4 my-1 border-t border-slate-200 dark:border-slate-700" />

                              <button
                                onClick={() => {
                                  setDeleteId(document.id);
                                  setOpenMenu(null);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4" /> Delete
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
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
