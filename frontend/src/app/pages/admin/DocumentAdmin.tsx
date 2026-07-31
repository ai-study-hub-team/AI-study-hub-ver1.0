import {
  Download,
  Edit2,
  Eye,
  FileText,
  MoreVertical,
  RotateCcw,
  Save,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { documentApi } from "../../services/documentApi";
import { PaginationControls } from "../../components/ui/PaginationControls";
import { DocumentInformationModal } from "../../components/ui/DocumentInformationModal";
import { DocumentPreviewModal } from "../../components/ui/DocumentPreviewModal";
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
  document.fileType || document.type || "application/octet-stream";

const FILE_TYPE_LABELS: Array<[RegExp, string]> = [
  [/wordprocessingml|msword|docx/i, "DOCX"],
  [/spreadsheetml|ms-excel|xlsx/i, "XLSX"],
  [/presentationml|ms-powerpoint|pptx/i, "PPTX"],
  [/application\/pdf|\bpdf\b/i, "PDF"],
  [/text\/plain|\btxt\b/i, "TXT"],
  [/text\/csv|\bcsv\b/i, "CSV"],
  [/image\/png|\bpng\b/i, "PNG"],
  [/image\/jpe?g|\bjpe?g\b/i, "JPG"],
  [/image\/gif|\bgif\b/i, "GIF"],
  [/video\/mp4|\bmp4\b/i, "MP4"],
  [/audio\/mpeg|\bmp3\b/i, "MP3"],
  [/application\/zip|\bzip\b/i, "ZIP"],
];

const getFileExtension = (document: AdminDocument) => {
  const candidateNames = [
    document.originalName,
    document.fileName,
    document.name,
    document.title,
    document.fileUrl,
  ].filter(Boolean) as string[];

  for (const candidate of candidateNames) {
    const cleanName = candidate.split(/[?#]/)[0];
    const match = cleanName.match(/\.([a-z0-9]{1,10})$/i);

    if (match) return match[1].toUpperCase();
  }

  const rawType = getFileType(document);
  const mappedType = FILE_TYPE_LABELS.find(([pattern]) =>
    pattern.test(rawType),
  );

  if (mappedType) return mappedType[1];

  const subtype = rawType.split("/").pop()?.split(/[.;+]/)[0]?.trim();

  if (subtype && subtype.length <= 12 && subtype !== "octet-stream") {
    return subtype.toUpperCase();
  }

  return "FILE";
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

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [docs, setDocs] = useState<AdminDocument[]>([]);
  const [usersById, setUsersById] = useState<Record<number, AdminUser>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [actionMenuPosition, setActionMenuPosition] =
    useState<ActionMenuPosition | null>(null);

  const [informationDoc, setInformationDoc] = useState<AdminDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<AdminDocument | null>(null);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedDocuments = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
    setPreviewDoc(document);
  };

  const handleViewInformation = async (document: AdminDocument) => {
    closeActionMenu();

    try {
      const response = await documentApi.getDocumentById(document.id);
      setInformationDoc(response.data as AdminDocument);
    } catch (error) {
      console.error(error);
      // The list response already contains the main metadata, so still show it
      // when the detail endpoint is temporarily unavailable.
      setInformationDoc(document);
      toast.error("Cannot load the latest document detail.");
    }
  };

  const handleDownload = async (document: AdminDocument) => {
    try {
      const role = (localStorage.getItem("role") || "").toUpperCase();
      const response = role === "ADMIN" || role === "ROLE_ADMIN"
        ? await documentApi.getAdminDocumentFile(document.id)
        : await documentApi.downloadDocument(document.id);

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

      <div className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
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

        <div className="overflow-hidden rounded-2xl">
          <table className="w-full table-fixed border-separate border-spacing-y-2">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[21%]" />
              <col className="w-[9%]" />
              <col className="w-[7%]" />
              <col className="w-[11%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[6%]" />
            </colgroup>
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
                  paginatedDocuments.map((document) => (
                    <motion.tr
                      key={document.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      role="button"
                      tabIndex={0}
                      onClick={() => handlePreview(document)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handlePreview(document);
                        }
                      }}
                      className="group cursor-pointer bg-white transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/30 dark:bg-slate-900 dark:hover:bg-slate-800"
                    >
                      <td className="overflow-hidden rounded-l-2xl px-3 py-3">
                        <div className="flex min-w-0 items-center gap-2">
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

                      <td className="overflow-hidden px-3 py-3">
                        <div className="flex min-w-0 items-center gap-2">
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

                      <td className="rounded-r-2xl px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
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

        {!isLoading && filtered.length > 0 && (
          <PaginationControls
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        )}
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
                onClick={() => handleViewInformation(selectedDocument)}
                className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Eye className="h-4 w-4" />
                View information
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

            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DocumentPreviewModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />

      {informationDoc && (
        <DocumentInformationModal
          document={{
            ...informationDoc,
            name: getDocumentName(informationDoc),
            fileType: getFileExtension(informationDoc),
            categoryName:
              informationDoc.categoryName || informationDoc.folder || "Uncategorized",
            folderName: informationDoc.folder || "Root",
            createdAt: informationDoc.createdAt || informationDoc.uploadedAt,
            documentStatus: getUploadStatus(informationDoc),
            aiStatus: getAiStatus(informationDoc),
          }}
          onClose={() => setInformationDoc(null)}
        />
      )}

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

    </div>
  );
}
