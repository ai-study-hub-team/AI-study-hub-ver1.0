import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  Eye,
  Download,
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
import { subscriptionApi } from "../../services/subscriptionApi";
import { getStoredUser } from "../../utils/authStorage";
import { PaginationControls } from "../../components/ui/PaginationControls";

type ListResponse<T> = T[] | { content?: T[] };

type ActiveTab = "links" | "submissions";

type SubmissionStatusFilter =
  | "ALL"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED";

const MIME_OPTIONS = [
  { label: "PDF", mimeTypes: ["application/pdf"] },
  { label: "TXT", mimeTypes: ["text/plain"] },
  {
    label: "DOCX",
    mimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  },
  {
    label: "PPTX",
    mimeTypes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  },
  {
    label: "XLSX",
    mimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  },
] as const;

const PRO_MIME_OPTIONS = [
  {
    label: "IMAGE",
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
  {
    label: "VIDEO",
    mimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
  },
  {
    label: "AUDIO",
    mimeTypes: ["audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"],
  },
] as const;

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

  return date.toLocaleString("en-US", {
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

const getFileTypeLabel = (
  fileType?: string | null,
  fileName?: string | null,
) => {
  const value = `${fileType ?? ""} ${fileName ?? ""}`.toLowerCase().trim();

  if (!value) return "UNKNOWN";
  if (value.includes("pdf")) return "PDF";

  if (
    value.includes("wordprocessingml") ||
    value.includes("msword") ||
    value.includes("word") ||
    value.includes(".docx") ||
    value.includes(".doc")
  ) {
    return "DOCX";
  }

  if (
    value.includes("presentationml") ||
    value.includes("powerpoint") ||
    value.includes("presentation") ||
    value.includes(".pptx") ||
    value.includes(".ppt")
  ) {
    return "PPTX";
  }

  if (
    value.includes("spreadsheetml") ||
    value.includes("excel") ||
    value.includes("spreadsheet") ||
    value.includes(".xlsx") ||
    value.includes(".xls") ||
    value.includes(".csv")
  ) {
    return "EXCEL";
  }

  if (value.includes("image")) return "IMAGE";
  if (value.includes("audio")) return "AUDIO";
  if (value.includes("video")) return "VIDEO";
  if (value.includes("text/plain") || value.includes(".txt")) return "TXT";

  const extension = value.match(/\.([a-z0-9]+)(?:\s|$)/)?.[1];
  if (extension) return extension.toUpperCase();

  return value.toUpperCase();
};

const getSubmissionDocumentId = (submission: SharedDocumentSubmissionResponse) => {
  const value =
    (submission as any).approvedDocumentId ??
    (submission as any).documentId ??
    (submission as any).uploadedDocumentId ??
    (submission as any).fileId;

  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const getFolderOptionLabel = (folder: FolderResponse) => {
  if (folder.parentFolderName) {
    return `${folder.parentFolderName} / ${folder.name}`;
  }

  return folder.name;
};

const statusLabel: Record<string, string> = {
  ACTIVE: "Active",
  DISABLED: "Disabled",
  EXPIRED: "Expired",
  PENDING_REVIEW: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const getShareLinkStatus = (status?: string | null) =>
  String(status ?? "").trim().toUpperCase();

const isActiveShareLink = (status?: string | null) =>
  getShareLinkStatus(status) === "ACTIVE";

const getUsableShareUrl = (link: DocumentShareLinkResponse) => {
  const rawUrl = link.shareUrl?.trim();
  let shareUrl = "";

  if (rawUrl) {
    try {
      shareUrl = new URL(rawUrl, window.location.origin).toString();
    } catch {
      // Fall back to the public route generated from the token below.
    }
  }

  if (!shareUrl) {
    const token = link.token?.trim();
    shareUrl = token
      ? new URL(`/shared-upload/${encodeURIComponent(token)}`, window.location.origin).toString()
      : "";
  }

  if (shareUrl && link.allowedFileTypes?.trim()) {
    const url = new URL(shareUrl);
    url.searchParams.set("types", link.allowedFileTypes.trim());
    return url.toString();
  }

  return shareUrl;
};

const getShareLinkId = (link: DocumentShareLinkResponse) => {
  const value =
    (link as any).id ??
    (link as any).linkId ??
    (link as any).shareLinkId ??
    (link as any).documentShareLinkId;

  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
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
  if (
    value.includes("XLS") ||
    value.includes("EXCEL") ||
    value.includes("SPREADSHEET")
  ) {
    return "XLSX";
  }
  if (value.includes("TXT") || value.includes("TEXT")) return "TXT";
  if (value.includes("PDF")) return "PDF";

  const extension = fileName?.split(".").pop()?.trim().toUpperCase();
  return extension || "OTHER";
};

const getSubmittedDate = (submission: SharedDocumentSubmissionResponse) => {
  return submission.submittedAt || submission.createdAt || null;
};

export function DocumentSharesPage() {
  const navigate = useNavigate();
  const storedRole = (
    localStorage.getItem("role") ||
    getStoredUser()?.role ||
    ""
  )
    .trim()
    .toUpperCase()
    .replace(/^ROLE_/, "");
  const isAdmin = storedRole === "ADMIN" || storedRole === "ADMINISTRATOR";

  const [activeTab, setActiveTab] = useState<ActiveTab>("links");
  const [linksPage, setLinksPage] = useState(1);
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const pageSize = 10;

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
  const [isPro, setIsPro] = useState(isAdmin);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [disablingLinkId, setDisablingLinkId] = useState<number | null>(null);

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
    maxUploadsPerUser: "3",
    maxFileSizeMb: "10",
    maxTotalSizeMb: "100",
    accessPolicy: "PRIVATE_ALLOWLIST" as
      | "PRIVATE_ALLOWLIST"
      | "ANY_AUTHENTICATED_USER",
    allowedUserEmails: "",
    allowedFileTypes: ["application/pdf", "text/plain"] as string[],
    defaultFolderId: "",
  });
  const [recipientEmailInput, setRecipientEmailInput] = useState("");

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
          documentShareLinkApi.getDocumentShareLinks(),
          sharedDocumentSubmissionApi.getSubmissions({
            ...(submissionStatusFilter !== "ALL"
              ? { status: submissionStatusFilter }
              : {}),
          }),
          folderApi.getFolders(userId),
          categoryApi.getCategories(),
        ]);

      setLinks(
        normalizeList(
          linksRes.data as ListResponse<DocumentShareLinkResponse>,
        ).filter((link) => isActiveShareLink(link.status)),
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

  useEffect(() => {
    let isMounted = true;

    subscriptionApi
      .getCurrentSubscription()
      .then(({ data }) => {
        const planCode = data.plan?.code?.trim().toUpperCase();
        const status = data.status?.trim().toUpperCase();
        const hasActiveProPlan =
          planCode === "PRO" &&
          (!status || status === "ACTIVE" || status === "VALID");

        if (isMounted) {
          setIsPro(isAdmin || data.adminAccess === true || hasActiveProPlan);
        }
      })
      .catch((error) => {
        console.warn("Cannot load the current subscription.", error);
        if (isMounted) setIsPro(isAdmin);
      });

    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  const addRecipientEmails = (rawValue: string) => {
    const newEmails = rawValue
      .split(/[\s,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    if (!newEmails.length) return;

    const invalidEmail = newEmails.find(
      (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    );
    if (invalidEmail) {
      toast.error(`Invalid email: ${invalidEmail}`);
      return;
    }

    setLinkForm((current) => {
      const currentEmails = current.allowedUserEmails
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);

      return {
        ...current,
        allowedUserEmails: Array.from(
          new Set([...currentEmails, ...newEmails]),
        ).join(","),
      };
    });
    setRecipientEmailInput("");
  };

  const removeRecipientEmail = (emailToRemove: string) => {
    setLinkForm((current) => ({
      ...current,
      allowedUserEmails: current.allowedUserEmails
        .split(",")
        .map((email) => email.trim())
        .filter((email) => email && email !== emailToRemove)
        .join(","),
    }));
  };

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
    const maxUploadsPerUser = Number(linkForm.maxUploadsPerUser);
    const maxFileSizeBytes = Number(linkForm.maxFileSizeMb) * 1024 * 1024;
    const maxTotalBytes = Number(linkForm.maxTotalSizeMb) * 1024 * 1024;
    const allowedUserEmails = `${linkForm.allowedUserEmails},${recipientEmailInput}`
      .split(/[\n,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter((email, index, emails) => email && emails.indexOf(email) === index);

    const invalidEmail = allowedUserEmails.find(
      (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    );
    if (invalidEmail) {
      toast.error(`Invalid email: ${invalidEmail}`);
      return;
    }

    if (
      !Number.isInteger(maxUploads) ||
      maxUploads <= 0 ||
      !Number.isInteger(maxUploadsPerUser) ||
      maxUploadsPerUser <= 0 ||
      maxUploadsPerUser > maxUploads
    ) {
      toast.error("Upload limits must be positive and the per-user limit cannot exceed the total.");
      return;
    }

    if (maxFileSizeBytes <= 0 || maxTotalBytes <= 0 || maxFileSizeBytes > maxTotalBytes) {
      toast.error("File size limits are invalid.");
      return;
    }

    if (!linkForm.allowedFileTypes.length) {
      toast.error("Choose at least one accepted file type.");
      return;
    }

    if (linkForm.accessPolicy === "PRIVATE_ALLOWLIST" && !allowedUserEmails.length) {
      toast.error("Add at least one registered email for a private link.");
      return;
    }

    try {
      setIsCreating(true);

      const response = await documentShareLinkApi.createDocumentShareLink({
        title: linkForm.title.trim(),
        description: linkForm.description.trim(),
        expiresAt: toApiDatetime(linkForm.expiresAt),
        maxUploads,
        maxUploadsPerUser,
        maxFileSizeBytes,
        maxTotalBytes,
        allowedFileTypes: linkForm.allowedFileTypes.join(","),
        accessPolicy: linkForm.accessPolicy,
        allowedUserEmails:
          linkForm.accessPolicy === "PRIVATE_ALLOWLIST" ? allowedUserEmails : [],
        ...(linkForm.defaultFolderId
          ? { defaultFolderId: Number(linkForm.defaultFolderId) }
          : {}),
      });

      setCreatedShareUrl(
        getUsableShareUrl({
          ...response.data,
          allowedFileTypes:
            response.data.allowedFileTypes ||
            linkForm.allowedFileTypes.join(","),
        }),
      );

      toast.success("Shared upload link created. Copy it now.");

      setLinkForm({
        title: "",
        description: "",
        expiresAt: defaultExpiry,
        maxUploads: "10",
        maxUploadsPerUser: "3",
        maxFileSizeMb: "10",
        maxTotalSizeMb: "100",
        accessPolicy: "PRIVATE_ALLOWLIST",
        allowedUserEmails: "",
        allowedFileTypes: ["application/pdf", "text/plain"],
        defaultFolderId: "",
      });
      setRecipientEmailInput("");

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
    const text = value?.trim();

    if (!text) {
      toast.error("No link available to copy.");
      return;
    }

    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        textarea.style.pointerEvents = "none";
        document.body.appendChild(textarea);
        textarea.select();

        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);

        if (!copied) {
          throw new Error("Clipboard copy failed");
        }
      }

      toast.success("Upload link copied.");
    } catch (error) {
      console.error("Cannot copy upload link:", error);
      toast.error("Cannot copy link. Please copy it manually.");
    }
  };

  const handleDisable = async (link: DocumentShareLinkResponse) => {
    const userId = getSafeUserId();
    const linkId = getShareLinkId(link);

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    if (!linkId) {
      toast.error("Cannot identify this shared upload link.");
      return;
    }

    try {
      setDisablingLinkId(linkId);

      await documentShareLinkApi.disableDocumentShareLink(linkId);
      setLinks((current) =>
        current.filter((item) => getShareLinkId(item) !== linkId),
      );
      toast.success("Shared upload link disabled and removed from the list.");
    } catch (error: any) {
      console.error(error);

      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot disable link.",
      );
    } finally {
      setDisablingLinkId(null);
    }
  };



  const handlePreviewSubmissionFile = async (submission: SharedDocumentSubmissionResponse) => {
    const userId = getSafeUserId();
    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    try {
      const blob = await sharedDocumentSubmissionApi.viewSubmissionFile(submission.id);
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Cannot preview submission file.");
    }
  };

  const handleDownloadSubmissionFile = async (submission: SharedDocumentSubmissionResponse) => {
    const userId = getSafeUserId();
    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    try {
      const blob = await sharedDocumentSubmissionApi.downloadSubmissionFile(submission.id);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = submission.originalFileName || `submission-${submission.id}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Cannot download submission file.");
    }
  };

  const handleViewSubmission = async (submission: SharedDocumentSubmissionResponse) => {
    const documentId = getSubmissionDocumentId(submission);

    if (!documentId) {
      await handleViewSubmissionDetail(submission);
      toast.info("This submission has no approved document yet. Opened detail instead.");
      return;
    }

    navigate(`/app/library/${documentId}/preview`, {
      state: {
        fromSharedUpload: true,
        submissionId: submission.id,
        documentId,
      },
    });
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
              <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                Link title
                <input
                  value={linkForm.title}
                  onChange={(event) =>
                    setLinkForm((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Enter link title"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                Maximum uploads
                <input
                  value={linkForm.maxUploads}
                  onChange={(event) =>
                    setLinkForm((current) => ({ ...current, maxUploads: event.target.value }))
                  }
                  type="number"
                  min={1}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                Maximum uploads per user
                <input
                  value={linkForm.maxUploadsPerUser}
                  onChange={(event) =>
                    setLinkForm((current) => ({ ...current, maxUploadsPerUser: event.target.value }))
                  }
                  type="number"
                  min={1}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                Maximum file size (MB)
                <input
                  value={linkForm.maxFileSizeMb}
                  onChange={(event) =>
                    setLinkForm((current) => ({ ...current, maxFileSizeMb: event.target.value }))
                  }
                  type="number"
                  min={1}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                Maximum total size (MB)
                <input
                  value={linkForm.maxTotalSizeMb}
                  onChange={(event) =>
                    setLinkForm((current) => ({ ...current, maxTotalSizeMb: event.target.value }))
                  }
                  type="number"
                  min={1}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                Expiration date
                <input
                  value={linkForm.expiresAt}
                  onChange={(event) =>
                    setLinkForm((current) => ({ ...current, expiresAt: event.target.value }))
                  }
                  type="datetime-local"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>

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

              {linkForm.accessPolicy === "PRIVATE_ALLOWLIST" && (
                <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2 dark:text-slate-200">
                  Recipient emails
                  <div
                    className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {linkForm.allowedUserEmails
                      .split(",")
                      .map((email) => email.trim())
                      .filter(Boolean)
                      .map((email) => (
                        <span
                          key={email}
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-200"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => removeRecipientEmail(email)}
                            aria-label={`Remove ${email}`}
                            className="text-base leading-none text-blue-500 hover:text-red-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    <input
                      type="email"
                      value={recipientEmailInput}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (/[,;\s]$/.test(value)) {
                          addRecipientEmails(value);
                        } else {
                          setRecipientEmailInput(value);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === "," || event.key === ";") {
                          event.preventDefault();
                          addRecipientEmails(recipientEmailInput);
                        }
                        if (
                          event.key === "Backspace" &&
                          !recipientEmailInput &&
                          linkForm.allowedUserEmails
                        ) {
                          const emails = linkForm.allowedUserEmails.split(",");
                          removeRecipientEmail(emails[emails.length - 1]);
                        }
                      }}
                      onBlur={() => {
                        if (recipientEmailInput.trim()) {
                          addRecipientEmails(recipientEmailInput);
                        }
                      }}
                      placeholder={
                        linkForm.allowedUserEmails
                          ? "Add another email"
                          : "Enter an email and press Enter"
                      }
                      className="min-w-56 flex-1 bg-transparent px-1 py-1.5 font-normal outline-none dark:text-white"
                    />
                  </div>
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    Press Enter, comma, or semicolon after each email.
                  </span>
                </label>
              )}

              <fieldset className="md:col-span-2">
                <legend className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                  Accepted file types
                </legend>
                <div className="flex flex-wrap gap-2">
                  {[...MIME_OPTIONS, ...(isPro ? PRO_MIME_OPTIONS : [])].map((option) => {
                    const selected = option.mimeTypes.every((mime) =>
                      linkForm.allowedFileTypes.includes(mime),
                    );
                    return (
                      <label
                        key={option.label}
                        className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-bold ${
                          selected
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            setLinkForm((current) => ({
                              ...current,
                              allowedFileTypes: selected
                                ? current.allowedFileTypes.filter(
                                    (value) => !option.mimeTypes.includes(value as never),
                                  )
                                : Array.from(
                                    new Set([...current.allowedFileTypes, ...option.mimeTypes]),
                                  ),
                            }))
                          }
                          className="sr-only"
                        />
                        {option.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
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
                links.slice((linksPage - 1) * pageSize, linksPage * pageSize).map((link) => (
                  <div key={getShareLinkId(link) ?? link.shareUrl ?? link.token ?? link.title} className="p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-extrabold text-slate-950 dark:text-white">
                            {link.title}
                          </h3>

                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {statusLabel[getShareLinkStatus(link.status)] || link.status}
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
                        {getUsableShareUrl(link) && (
                          <button
                            type="button"
                            onClick={() => window.open(getUsableShareUrl(link), "_blank", "noopener,noreferrer")}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCopy(getUsableShareUrl(link))}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <ClipboardCopy className="h-4 w-4" />
                          Copy
                        </button>

                        {isActiveShareLink(link.status) && (
                          <button
                            type="button"
                            onClick={() => handleDisable(link)}
                            disabled={disablingLinkId === getShareLinkId(link)}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {disablingLinkId === getShareLinkId(link) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ShieldOff className="h-4 w-4" />
                            )}
                            {disablingLinkId === getShareLinkId(link)
                              ? "Disabling..."
                              : "Disable"}
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
            <div className="px-5 pb-5"><PaginationControls currentPage={linksPage} totalItems={links.length} pageSize={pageSize} onPageChange={setLinksPage} /></div>
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
                <option value="EXPIRED">EXPIRED</option>
                <option value="ALL">ALL</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {submissions.length > 0 ? (
              submissions.slice((submissionsPage - 1) * pageSize, submissionsPage * pageSize).map((submission) => (
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
                          <span className="font-bold text-slate-600 dark:text-slate-300">
                            {getFileTypeLabel(
                              submission.fileType,
                              submission.originalFileName,
                            )}
                          </span>
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
                        onClick={() => void handlePreviewSubmissionFile(submission)}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700"
                      >
                        <Eye className="h-4 w-4" />
                        View file
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDownloadSubmissionFile(submission)}
                        className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </button>

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
          <div className="px-5 pb-5"><PaginationControls currentPage={submissionsPage} totalItems={submissions.length} pageSize={pageSize} onPageChange={setSubmissionsPage} /></div>
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
                    {getFileTypeLabel(
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

              <div
                aria-label="File type detected automatically"
                className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <span className="font-semibold">{approveForm.documentType}</span>
                <span className="ml-2 text-xs text-slate-500">
                  (detected from uploaded file)
                </span>
              </div>

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
