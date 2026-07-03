import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  Eye,
  Link2,
  Loader2,
  RefreshCcw,
  ShieldOff,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  documentShareLinkApi,
  type DocumentShareLinkResponse,
} from "../../services/documentShareLinkApi";
import {
  sharedDocumentSubmissionApi,
  type SharedDocumentSubmissionResponse,
} from "../../services/sharedDocumentSubmissionApi";
import { folderApi, type FolderResponse } from "../../services/folderApi";
import { categoryApi, type CategoryResponse } from "../../services/categoryApi";
import { getCurrentUserId } from "../../services/apiClient";

type ListResponse<T> = T[] | { content?: T[] };

type ActiveTab = "links" | "submissions";

type SubmissionStatusFilter =
  | "ALL"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED";

const DOCUMENT_TYPE_OPTIONS = ["PDF", "DOCX", "TXT", "PPTX"] as const;

const VISIBILITY_OPTIONS = ["PRIVATE", "PUBLIC"] as const;

const normalizeList = <T,>(data: ListResponse<T> | null | undefined): T[] => {
  if (Array.isArray(data)) return data;
  return data?.content ?? [];
};

const getSafeUserId = (): number | null => {
  const rawUserId = getCurrentUserId();
  const userId = Number(rawUserId);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return userId;
};

const toDatetimeLocalValue = (date: Date) => {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const toApiDatetime = (value: string) => {
  if (!value) return undefined;
  return new Date(value).toISOString().slice(0, 19);
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "No expiry";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatFileSize = (value?: number | null) => {
  const size = Number(value ?? 0);

  if (!Number.isFinite(size) || size <= 0) {
    return "Unknown";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const getFolderOptionLabel = (folder: FolderResponse) => {
  if (folder.parentFolderName) {
    return `${folder.parentFolderName} / ${folder.name}`;
  }

  return folder.name;
};

const statusLabel: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  DISABLED: "Đã tắt",
  EXPIRED: "Đã hết hạn",
  PENDING_REVIEW: "Chờ duyệt",
  APPROVED: "Đã chấp nhận",
  REJECTED: "Đã từ chối",
};

const getSubmissionStatusClass = (status?: string | null) => {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800";
    case "REJECTED":
      return "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-800";
    case "PENDING_REVIEW":
    default:
      return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800";
  }
};

const detectDocumentType = (
  fileType?: string | null,
  fileName?: string | null,
) => {
  const value = `${fileType ?? ""} ${fileName ?? ""}`.toUpperCase();

  if (value.includes("PPT") || value.includes("POWERPOINT")) return "PPTX";
  if (value.includes("DOC") || value.includes("WORD")) return "DOCX";
  if (value.includes("TXT") || value.includes("TEXT")) return "TXT";
  if (value.includes("PDF")) return "PDF";

  return "PDF";
};

const getSubmittedDate = (submission: SharedDocumentSubmissionResponse) => {
  return submission.submittedAt || submission.createdAt || null;
};

export function DocumentSharesPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("links");

  const [links, setLinks] = useState<DocumentShareLinkResponse[]>([]);
  const [submissions, setSubmissions] = useState<
    SharedDocumentSubmissionResponse[]
  >([]);

  const [folders, setFolders] = useState<FolderResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);

  const [submissionStatusFilter, setSubmissionStatusFilter] =
    useState<SubmissionStatusFilter>("PENDING_REVIEW");

  const [selectedSubmission, setSelectedSubmission] =
    useState<SharedDocumentSubmissionResponse | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [workingSubmissionId, setWorkingSubmissionId] = useState<number | null>(
    null,
  );

  const defaultExpiry = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return toDatetimeLocalValue(date);
  }, []);

  const [linkForm, setLinkForm] = useState({
    title: "",
    description: "",
    expiresAt: defaultExpiry,
    maxUploads: "10",
    defaultFolderId: "",
  });

  const [createdShareUrl, setCreatedShareUrl] = useState("");

  const [approveForm, setApproveForm] = useState({
    submissionId: null as number | null,
    title: "",
    description: "",
    categoryId: "",
    folderId: "",
    visibility: "PRIVATE",
    documentType: "PDF",
  });

  const [rejectForm, setRejectForm] = useState({
    submissionId: null as number | null,
    reason: "",
  });

  const sortedFolders = useMemo(
    () =>
      [...folders].sort((left, right) =>
        getFolderOptionLabel(left).localeCompare(getFolderOptionLabel(right)),
      ),
    [folders],
  );

  const loadData = useCallback(async () => {
    const userId = getSafeUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    try {
      setIsLoading(true);

      const [linksRes, submissionsRes, foldersRes, categoriesRes] =
        await Promise.all([
          documentShareLinkApi.getDocumentShareLinks(userId),
          sharedDocumentSubmissionApi.getSubmissions({
            userId,
            ...(submissionStatusFilter !== "ALL"
              ? { status: submissionStatusFilter }
              : {}),
          }),
          folderApi.getFolders(userId),
          categoryApi.getCategories(),
        ]);

      setLinks(
        normalizeList(linksRes.data as ListResponse<DocumentShareLinkResponse>),
      );

      setSubmissions(
        normalizeList(
          submissionsRes.data as ListResponse<SharedDocumentSubmissionResponse>,
        ),
      );

      setFolders(
        normalizeList(foldersRes.data as ListResponse<FolderResponse>).filter(
          (folder) => Number(folder.userId) === userId,
        ),
      );

      setCategories(
        normalizeList(
          categoriesRes.data as ListResponse<CategoryResponse>,
        ).filter(
          (category) => !category.userId || Number(category.userId) === userId,
        ),
      );
    } catch (error: any) {
      console.error(error);

      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot load shared upload data.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [submissionStatusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateLink = async () => {
    const userId = getSafeUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    if (!linkForm.title.trim()) {
      toast.error("Please enter a link title.");
      return;
    }

    const maxUploads = Number(linkForm.maxUploads);

    if (!Number.isInteger(maxUploads) || maxUploads <= 0) {
      toast.error("Max uploads must be greater than 0.");
      return;
    }

    try {
      setIsCreating(true);

      const response = await documentShareLinkApi.createDocumentShareLink({
        userId,
        title: linkForm.title.trim(),
        description: linkForm.description.trim(),
        expiresAt: toApiDatetime(linkForm.expiresAt),
        maxUploads,
        ...(linkForm.defaultFolderId
          ? { defaultFolderId: Number(linkForm.defaultFolderId) }
          : {}),
      });

      setCreatedShareUrl(response.data.shareUrl);

      toast.success("Shared upload link created. Copy it now.");

      setLinkForm({
        title: "",
        description: "",
        expiresAt: defaultExpiry,
        maxUploads: "10",
        defaultFolderId: "",
      });

      await loadData();
    } catch (error: any) {
      console.error(error);

      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot create shared upload link.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async (value?: string | null) => {
    if (!value) {
      toast.error("No link available to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Cannot copy link.");
    }
  };

  const handleDisable = async (id: number) => {
    const userId = getSafeUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    try {
      await documentShareLinkApi.disableDocumentShareLink(id, userId);
      toast.success("Shared upload link disabled.");
      await loadData();
    } catch (error: any) {
      console.error(error);

      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot disable link.",
      );
    }
  };

  const handleViewSubmissionDetail = async (
    submission: SharedDocumentSubmissionResponse,
  ) => {
    const userId = getSafeUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    try {
      setIsLoadingDetail(true);
      setSelectedSubmission(submission);

      const response = await sharedDocumentSubmissionApi.getSubmission(
        submission.id,
        userId,
      );

      setSelectedSubmission(response.data);
    } catch (error: any) {
      console.error(error);

      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot load submission detail.",
      );
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const openApprove = (submission: SharedDocumentSubmissionResponse) => {
    if (submission.status !== "PENDING_REVIEW") {
      toast.error("This submission was already reviewed.");
      return;
    }

    setApproveForm({
      submissionId: submission.id,
      title: submission.title || submission.originalFileName || "",
      description: submission.description || "",
      categoryId: "",
      folderId: "",
      visibility: "PRIVATE",
      documentType: detectDocumentType(
        submission.fileType,
        submission.originalFileName,
      ),
    });
  };

  const handleApprove = async () => {
    const userId = getSafeUserId();

    if (!userId || approveForm.submissionId === null) {
      toast.error("Please login again.");
      return;
    }

    if (!approveForm.title.trim()) {
      toast.error("Please enter a document title.");
      return;
    }

    try {
      setWorkingSubmissionId(approveForm.submissionId);

      await sharedDocumentSubmissionApi.approveSubmission(
        approveForm.submissionId,
        {
          userId,
          title: approveForm.title.trim(),
          description: approveForm.description.trim(),
          categoryId: approveForm.categoryId
            ? Number(approveForm.categoryId)
            : undefined,
          folderId: approveForm.folderId ? Number(approveForm.folderId) : null,
          visibility: approveForm.visibility,
          documentType: approveForm.documentType,
        },
      );

      toast.success("Submission approved. Document is being processed by AI.");

      setApproveForm({
        submissionId: null,
        title: "",
        description: "",
        categoryId: "",
        folderId: "",
        visibility: "PRIVATE",
        documentType: "PDF",
      });

      setSelectedSubmission(null);

      await loadData();
    } catch (error: any) {
      console.error(error);

      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot approve submission.",
      );
    } finally {
      setWorkingSubmissionId(null);
    }
  };

  const openReject = (submission: SharedDocumentSubmissionResponse) => {
    if (submission.status !== "PENDING_REVIEW") {
      toast.error("This submission was already reviewed.");
      return;
    }

    setRejectForm({
      submissionId: submission.id,
      reason: "",
    });
  };

  const handleReject = async () => {
    const userId = getSafeUserId();

    if (!userId || rejectForm.submissionId === null) {
      toast.error("Please login again.");
      return;
    }

    if (!rejectForm.reason.trim()) {
      toast.error("Please enter a reject reason.");
      return;
    }

    try {
      setWorkingSubmissionId(rejectForm.submissionId);

      await sharedDocumentSubmissionApi.rejectSubmission(
        rejectForm.submissionId,
        {
          userId,
          reason: rejectForm.reason.trim(),
        },
      );

      toast.success("Submission rejected.");

      setRejectForm({
        submissionId: null,
        reason: "",
      });

      setSelectedSubmission(null);

      await loadData();
    } catch (error: any) {
      console.error(error);

      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot reject submission.",
      );
    } finally {
      setWorkingSubmissionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
            Shared Upload
          </p>

          <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">
            Share Links & Submissions
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Create public upload links, then approve or reject uploaded
            submissions.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
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

      <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
        {(["links", "submissions"] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl px-4 py-2 text-sm font-extrabold transition ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {tab === "links" ? "Share Links" : "Submissions"}
          </button>
        ))}
      </div>

      {activeTab === "links" && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
              Create shared upload link
            </h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <input
                value={linkForm.title}
                onChange={(event) =>
                  setLinkForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Link title"
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              <input
                value={linkForm.maxUploads}
                onChange={(event) =>
                  setLinkForm((current) => ({
                    ...current,
                    maxUploads: event.target.value,
                  }))
                }
                placeholder="Max uploads"
                type="number"
                min={1}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              <input
                value={linkForm.expiresAt}
                onChange={(event) =>
                  setLinkForm((current) => ({
                    ...current,
                    expiresAt: event.target.value,
                  }))
                }
                type="datetime-local"
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              <select
                value={linkForm.defaultFolderId}
                onChange={(event) =>
                  setLinkForm((current) => ({
                    ...current,
                    defaultFolderId: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Default folder: Root</option>

                {sortedFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {getFolderOptionLabel(folder)}
                  </option>
                ))}
              </select>

              <textarea
                value={linkForm.description}
                onChange={(event) =>
                  setLinkForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Description"
                rows={3}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none md:col-span-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <button
              type="button"
              onClick={handleCreateLink}
              disabled={isCreating}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Create Link
            </button>

            {createdShareUrl && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                  Copy this URL now.
                </p>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    readOnly
                    value={createdShareUrl}
                    className="flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm dark:border-emerald-800 dark:bg-slate-900 dark:text-white"
                  />

                  <button
                    type="button"
                    onClick={() => handleCopy(createdShareUrl)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
                  >
                    <ClipboardCopy className="h-4 w-4" />
                    Copy
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-100 p-5 dark:border-slate-800">
              <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
                Your shared upload links
              </h2>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {links.length > 0 ? (
                links.map((link) => (
                  <div key={link.id} className="p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-extrabold text-slate-950 dark:text-white">
                            {link.title}
                          </h3>

                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {statusLabel[link.status] || link.status}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {link.description || "No description"}
                        </p>

                        <p className="mt-2 text-xs font-semibold text-slate-400">
                          Uploads: {link.currentUploads ?? 0}/
                          {link.maxUploads ?? "∞"} · Expires:{" "}
                          {formatDateTime(link.expiresAt)}
                          {link.defaultFolderName
                            ? ` · Default folder: ${link.defaultFolderName}`
                            : " · Default folder: Root"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {link.shareUrl && (
                          <button
                            type="button"
                            onClick={() => window.open(link.shareUrl, "_blank")}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCopy(link.shareUrl)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <ClipboardCopy className="h-4 w-4" />
                          Copy
                        </button>

                        {link.status === "ACTIVE" && (
                          <button
                            type="button"
                            onClick={() => handleDisable(link.id)}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-700"
                          >
                            <ShieldOff className="h-4 w-4" />
                            Disable
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No shared upload links yet.
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {activeTab === "submissions" && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-5 dark:border-slate-800">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
                  Shared upload submissions
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  View pending, approved, and rejected submissions uploaded
                  through public shared links.
                </p>
              </div>

              <select
                value={submissionStatusFilter}
                onChange={(event) =>
                  setSubmissionStatusFilter(
                    event.target.value as SubmissionStatusFilter,
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="PENDING_REVIEW">PENDING_REVIEW</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="ALL">ALL</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {submissions.length > 0 ? (
              submissions.map((submission) => (
                <div key={submission.id} className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-slate-950 dark:text-white">
                          {submission.title ||
                            submission.originalFileName ||
                            "Untitled submission"}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${getSubmissionStatusClass(
                            submission.status,
                          )}`}
                        >
                          {statusLabel[submission.status] || submission.status}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {submission.description || "No description"}
                      </p>

                      <div className="mt-3 grid gap-1 text-xs font-semibold text-slate-400 md:grid-cols-2">
                        <p>File: {submission.originalFileName || "Unknown"}</p>

                        <p>
                          Type:{" "}
                          {submission.fileType ||
                            detectDocumentType(
                              submission.fileType,
                              submission.originalFileName,
                            )}
                        </p>

                        <p>Size: {formatFileSize(submission.fileSize)}</p>

                        <p>
                          Submitted:{" "}
                          {formatDateTime(getSubmittedDate(submission))}
                        </p>

                        <p>
                          Uploader: {submission.uploaderName || "Unknown"}
                        </p>

                        <p>Email: {submission.uploaderEmail || "No email"}</p>
                      </div>

                      {submission.approvedDocumentId && (
                        <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-300">
                          Approved Document ID: {submission.approvedDocumentId}
                        </p>
                      )}

                      {submission.rejectReason && (
                        <p className="mt-2 text-xs font-bold text-red-600 dark:text-red-300">
                          Reject reason: {submission.rejectReason}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewSubmissionDetail(submission)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Eye className="h-4 w-4" />
                        View detail
                      </button>

                      {submission.status === "PENDING_REVIEW" && (
                        <>
                          <button
                            type="button"
                            onClick={() => openApprove(submission)}
                            disabled={workingSubmissionId === submission.id}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Approve
                          </button>

                          <button
                            type="button"
                            onClick={() => openReject(submission)}
                            disabled={workingSubmissionId === submission.id}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            {workingSubmissionId === submission.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No submissions found.
              </div>
            )}
          </div>
        </section>
      )}

      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
                  Submission detail
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Full information loaded from submission detail API.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-slate-200 p-8 text-sm font-bold text-slate-500 dark:border-slate-700">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                Loading detail...
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Title
                  </p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">
                    {selectedSubmission.title || "Untitled submission"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Status
                  </p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${getSubmissionStatusClass(
                      selectedSubmission.status,
                    )}`}
                  >
                    {statusLabel[selectedSubmission.status] ||
                      selectedSubmission.status}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 md:col-span-2 dark:border-slate-700">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Description
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                    {selectedSubmission.description || "No description"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Original file name
                  </p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">
                    {selectedSubmission.originalFileName || "Unknown"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    File type
                  </p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">
                    {selectedSubmission.fileType ||
                      detectDocumentType(
                        selectedSubmission.fileType,
                        selectedSubmission.originalFileName,
                      )}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    File size
                  </p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">
                    {formatFileSize(selectedSubmission.fileSize)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Submitted at
                  </p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">
                    {formatDateTime(getSubmittedDate(selectedSubmission))}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Uploader name
                  </p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">
                    {selectedSubmission.uploaderName || "Unknown"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Uploader email
                  </p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">
                    {selectedSubmission.uploaderEmail || "No email"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Approved document ID
                  </p>
                  <p className="mt-1 font-bold text-emerald-600 dark:text-emerald-300">
                    {selectedSubmission.approvedDocumentId || "Not approved yet"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Reject reason
                  </p>
                  <p className="mt-1 font-bold text-red-600 dark:text-red-300">
                    {selectedSubmission.rejectReason || "No reject reason"}
                  </p>
                </div>
              </div>
            )}

            {selectedSubmission.status === "PENDING_REVIEW" && (
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => openReject(selectedSubmission)}
                  disabled={workingSubmissionId === selectedSubmission.id}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  Reject
                </button>

                <button
                  type="button"
                  onClick={() => openApprove(selectedSubmission)}
                  disabled={workingSubmissionId === selectedSubmission.id}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  Approve
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {approveForm.submissionId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
              Approve submission
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Title and description can be edited before creating the official
              document.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input
                value={approveForm.title}
                onChange={(event) =>
                  setApproveForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Official document title"
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              <select
                value={approveForm.categoryId}
                onChange={(event) =>
                  setApproveForm((current) => ({
                    ...current,
                    categoryId: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">No category</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                value={approveForm.folderId}
                onChange={(event) =>
                  setApproveForm((current) => ({
                    ...current,
                    folderId: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Root / Use link default folder</option>

                {sortedFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {getFolderOptionLabel(folder)}
                  </option>
                ))}
              </select>

              <select
                value={approveForm.documentType}
                onChange={(event) =>
                  setApproveForm((current) => ({
                    ...current,
                    documentType: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {DOCUMENT_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <select
                value={approveForm.visibility}
                onChange={(event) =>
                  setApproveForm((current) => ({
                    ...current,
                    visibility: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {VISIBILITY_OPTIONS.map((visibility) => (
                  <option key={visibility} value={visibility}>
                    {visibility}
                  </option>
                ))}
              </select>

              <textarea
                value={approveForm.description}
                onChange={(event) =>
                  setApproveForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Official description"
                rows={3}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none md:col-span-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setApproveForm({
                    submissionId: null,
                    title: "",
                    description: "",
                    categoryId: "",
                    folderId: "",
                    visibility: "PRIVATE",
                    documentType: "PDF",
                  })
                }
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleApprove}
                disabled={workingSubmissionId === approveForm.submissionId}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {workingSubmissionId === approveForm.submissionId
                  ? "Approving..."
                  : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectForm.submissionId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
              Reject submission
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Rejecting this submission will not create a Document and will not
              trigger AI processing.
            </p>

            <label className="mt-5 block space-y-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Reject reason *
              </span>

              <textarea
                value={rejectForm.reason}
                onChange={(event) =>
                  setRejectForm((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
                rows={4}
                placeholder="Example: File is not relevant to the course."
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setRejectForm({
                    submissionId: null,
                    reason: "",
                  })
                }
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReject}
                disabled={workingSubmissionId === rejectForm.submissionId}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {workingSubmissionId === rejectForm.submissionId
                  ? "Rejecting..."
                  : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentSharesPage;