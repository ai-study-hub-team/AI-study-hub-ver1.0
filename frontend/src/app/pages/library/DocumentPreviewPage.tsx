import * as XLSX from "xlsx";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PptxViewer, RECOMMENDED_ZIP_LIMITS } from "@aiden0z/pptx-renderer";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  Download,
  FileText,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
  Save,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mammoth from "mammoth";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { documentApi } from "../../services/documentApi";
import { apiClient, getCurrentUserId } from "../../services/apiClient";
import { isMyDocument } from "../../utils/documentOwnership";
import {
  documentNoteApi,
  type DocumentNoteResponse,
} from "../../services/documentNoteApi";
import { PaginationControls } from "../../components/ui/PaginationControls";

const SHARED_USERS_PAGE_SIZE = 5;
const NOTES_PAGE_SIZE = 3;

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const isPublicHttpUrl = (url: string | undefined) =>
  Boolean(url && /^https?:\/\//i.test(url));

const getSharedDocumentFileUrl = (documentData: any) => {
  const value =
    documentData?.fileUrl ||
    documentData?.url ||
    documentData?.path ||
    documentData?.filePath ||
    documentData?.storagePath;

  return typeof value === "string" && value.trim() ? value.trim() : "";
};

const getSharedDocumentContentType = (documentData: any) => {
  const value =
    documentData?.mimeType ||
    documentData?.contentType ||
    documentData?.fileType ||
    documentData?.type;

  return typeof value === "string" && value.trim() ? value.trim() : "";
};

const escapeRegExp = (value: string) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const isExcelDocument = (contentType: string, name: string) => {
  const lowerName = name.toLowerCase();

  return (
    contentType.includes("spreadsheet") ||
    contentType.includes("excel") ||
    contentType === "application/vnd.ms-excel" ||
    contentType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls") ||
    lowerName.endsWith(".csv")
  );
};

const isTextDocument = (contentType: string, name: string) =>
  contentType.startsWith("text/") || name.toLowerCase().endsWith(".txt");

const isPowerPointDocument = (contentType: string, name: string) => {
  const lowerName = name.toLowerCase();

  return (
    contentType.includes("presentation") ||
    contentType.includes("powerpoint") ||
    contentType === "application/vnd.ms-powerpoint" ||
    contentType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    lowerName.endsWith(".ppt") ||
    lowerName.endsWith(".pptx")
  );
};

const isPptxDocument = (contentType: string, name: string) => {
  const lowerName = name.toLowerCase();

  return (
    contentType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    lowerName.endsWith(".pptx")
  );
};

const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const highlightPdfText = (text: string, keyword: string) => {
  const cleanKeyword = keyword.trim();

  if (!cleanKeyword) return escapeHtml(text);

  const parts = text.split(new RegExp(`(${escapeRegExp(cleanKeyword)})`, "gi"));

  return parts
    .map((part) => {
      const escapedPart = escapeHtml(part);
      const isMatch = part.toLowerCase() === cleanKeyword.toLowerCase();

      if (isMatch) {
        return `<mark class="pdf-search-highlight">${escapedPart}</mark>`;
      }

      return escapedPart;
    })
    .join("");
};

const highlightHtml = (html: string, keyword: string) => {
  const cleanKeyword = keyword.trim();

  if (!cleanKeyword || !html) return html;

  const parser = new DOMParser();
  const parsedDocument = parser.parseFromString(
    `<div>${html}</div>`,
    "text/html",
  );
  const root = parsedDocument.body.firstElementChild;

  if (!root) return html;

  const textNodes: Text[] = [];
  const walker = parsedDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  let currentNode = walker.nextNode();

  while (currentNode) {
    const parentElement = currentNode.parentElement;
    const tagName = parentElement?.tagName.toLowerCase();

    if (
      currentNode.textContent?.trim() &&
      tagName !== "script" &&
      tagName !== "style" &&
      tagName !== "mark"
    ) {
      textNodes.push(currentNode as Text);
    }

    currentNode = walker.nextNode();
  }

  const regex = new RegExp(`(${escapeRegExp(cleanKeyword)})`, "gi");

  textNodes.forEach((textNode) => {
    const text = textNode.textContent || "";

    if (!regex.test(text)) return;

    regex.lastIndex = 0;

    const fragment = parsedDocument.createDocumentFragment();
    const parts = text.split(regex);

    parts.forEach((part) => {
      const isMatch = part.toLowerCase() === cleanKeyword.toLowerCase();

      if (isMatch) {
        const mark = parsedDocument.createElement("mark");
        mark.className =
          "docx-search-highlight rounded bg-yellow-200 px-1 font-bold text-yellow-900";
        mark.textContent = part;
        fragment.appendChild(mark);
      } else {
        fragment.appendChild(parsedDocument.createTextNode(part));
      }
    });

    textNode.parentNode?.replaceChild(fragment, textNode);
  });

  return root.innerHTML;
};

type ChatMode = "collapsed" | "floating" | "docked";
type StudyPanel = "document" | "notes" | "split";

type ChatMessage = {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
};

const buildChatTitle = (text: string) => {
  const cleaned = text.replace(/\s+/g, " ").trim();

  if (!cleaned) return "New Chat";

  return cleaned.length > 60
    ? `${cleaned.slice(0, 60)}...`
    : cleaned;
};

type QuickPrompt = {
  icon: ReactNode;
  label: string;
};


type SharePermission = "VIEW" | "DOWNLOAD";

type SharedDocumentUser = {
  shareId: number;
  userId: number;
  fullName?: string;
  email: string;
  permission: SharePermission | string;
  status: string;
  sharedAt?: string;
  createdAt?: string;
  expiresAt?: string | null;
};

type ShareDocumentResponse = {
  message?: string;
  sharedEmails?: string[];
  alreadySharedEmails?: string[];
  notFoundEmails?: string[];
  notRegisteredEmails?: string[];
};

type PreviewRouteState = {
  fromSharedFolder?: boolean;
  fromSharedDocument?: boolean;
  folderId?: number;
  permission?: string;
  ownerName?: string;
  ownerEmail?: string;
  sharedDocument?: any;
  returnTo?: string;
  returnLabel?: string;
};

const splitEmails = (value: string) => {
  return value
    .split(/[\s,;]+/)
    .map((email) => email.trim())
    .filter(Boolean);
};

const formatDateTimeForApi = (value: string) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T23:59:59`;
  }

  return value.length === 16 ? `${value}:00` : value;
};

const formatDateTimeLabel = (value?: string | null) => {
  if (!value) return "No expiration";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-US", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getShareResponseEmails = (data: ShareDocumentResponse) => {
  return {
    sharedEmails: data.sharedEmails ?? [],
    alreadySharedEmails: data.alreadySharedEmails ?? [],
    notFoundEmails: data.notFoundEmails ?? data.notRegisteredEmails ?? [],
  };
};

const getErrorMessage = (error: any, fallback: string) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

export function DocumentPreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const keyword = searchParams.get("keyword") || "";
  const routeState = (location.state ?? {}) as PreviewRouteState;
  const isSharedAccess =
    routeState.fromSharedFolder === true || routeState.fromSharedDocument === true;
  const canDownloadCurrentDocument =
    !isSharedAccess || routeState.permission === "DOWNLOAD";

  const pptxContainerRef = useRef<HTMLDivElement | null>(null);
  const [pptxBuffer, setPptxBuffer] = useState<ArrayBuffer | null>(null);
  const [pptxError, setPptxError] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [publicFileUrl, setPublicFileUrl] = useState("");
  const [fileType, setFileType] = useState("");
  const [fileName, setFileName] = useState("Document");
  const [excelHtml, setExcelHtml] = useState("");
  const [docxHtml, setDocxHtml] = useState("");
  const [textContent, setTextContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [canManageShare, setCanManageShare] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareEmails, setShareEmails] = useState("");
  const [sharePermission, setSharePermission] = useState<SharePermission>("VIEW");
  const [shareExpiresAt, setShareExpiresAt] = useState("");
  const [sharedUsers, setSharedUsers] = useState<SharedDocumentUser[]>([]);
  const [isSharedUsersLoading, setIsSharedUsersLoading] = useState(false);
  const [isShareSubmitting, setIsShareSubmitting] = useState(false);
  const [sharedUsersPage, setSharedUsersPage] = useState(1);

  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfScale, setPdfScale] = useState(1.15);

  const [notes, setNotes] = useState<DocumentNoteResponse[]>([]);
  const [isNotesLoading, setIsNotesLoading] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<number | null>(null);
  const [notesPage, setNotesPage] = useState(1);

  const [chatMode, setChatMode] = useState<ChatMode>("collapsed");
  const [activePanel, setActivePanel] = useState<StudyPanel>("split");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatSessionId, setChatSessionId] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isChatHistoryLoading, setIsChatHistoryLoading] = useState(false);

  const documentId = Number(id);
  const currentUserId = getCurrentUserId();
  const handleBack = () => {
    navigate(routeState.returnTo || "/app/library");
  };

  const highlightedDocxHtml = useMemo(() => {
    return highlightHtml(docxHtml, keyword);
  }, [docxHtml, keyword]);
  const sharedUsersTotalPages = Math.max(
    1,
    Math.ceil(sharedUsers.length / SHARED_USERS_PAGE_SIZE),
  );
  const paginatedSharedUsers = useMemo(() => {
    const startIndex = (sharedUsersPage - 1) * SHARED_USERS_PAGE_SIZE;
    return sharedUsers.slice(
      startIndex,
      startIndex + SHARED_USERS_PAGE_SIZE,
    );
  }, [sharedUsers, sharedUsersPage]);
  const notesTotalPages = Math.max(
    1,
    Math.ceil(notes.length / NOTES_PAGE_SIZE),
  );
  const paginatedNotes = useMemo(() => {
    const startIndex = (notesPage - 1) * NOTES_PAGE_SIZE;
    return notes.slice(startIndex, startIndex + NOTES_PAGE_SIZE);
  }, [notes, notesPage]);

  useEffect(() => {
    setSharedUsersPage((page) => Math.min(page, sharedUsersTotalPages));
  }, [sharedUsersTotalPages]);

  useEffect(() => {
    setNotesPage((page) => Math.min(page, notesTotalPages));
  }, [notesTotalPages]);

  const loadSharedUsers = async () => {
    if (!documentId) return;

    try {
      setIsSharedUsersLoading(true);
      const response = await apiClient.get<SharedDocumentUser[]>(
        `/api/documents/${documentId}/shares`,
      );
      setSharedUsers(response.data ?? []);
    } catch (error) {
      console.error("Cannot load shared users:", error);
      toast.error("Cannot load shared users.");
    } finally {
      setIsSharedUsersLoading(false);
    }
  };

  const handleSubmitDocumentShare = async () => {
    const emails = splitEmails(shareEmails);

    if (emails.length === 0) {
      toast.error("Please enter at least one email.");
      return;
    }

    try {
      setIsShareSubmitting(true);
      const response = await apiClient.post<ShareDocumentResponse>(
        `/api/documents/${documentId}/shares`,
        {
          emails,
          permission: sharePermission,
          expiresAt: formatDateTimeForApi(shareExpiresAt),
        },
      );

      const { sharedEmails, alreadySharedEmails, notFoundEmails } =
        getShareResponseEmails(response.data ?? {});

      if (sharedEmails.length > 0) {
        toast.success(`Shared successfully: ${sharedEmails.join(", ")}`);
      }

      if (alreadySharedEmails.length > 0) {
        toast.info(`Already shared: ${alreadySharedEmails.join(", ")}`);
      }

      if (notFoundEmails.length > 0) {
        toast.warning(`Email not registered: ${notFoundEmails.join(", ")}`);
      }

      if (sharedEmails.length === 0 && alreadySharedEmails.length === 0) {
        toast.success(response.data?.message || "Share request completed.");
      }

      setShareEmails("");
      setSharePermission("VIEW");
      setShareExpiresAt("");
      await loadSharedUsers();
    } catch (error: any) {
      console.error("Cannot share document:", error);
      toast.error(getErrorMessage(error, "Cannot share document."));
    } finally {
      setIsShareSubmitting(false);
    }
  };

  const handleRevokeDocumentShare = async (targetUserId: number) => {
    try {
      await apiClient.delete(`/api/documents/${documentId}/shares/${targetUserId}`);
      toast.success("Share revoked.");
      await loadSharedUsers();
    } catch (error) {
      console.error("Cannot revoke document share:", error);
      toast.error("Cannot revoke share.");
    }
  };

  const loadNotes = async () => {
    if (!documentId) return;

    if (!currentUserId) {
      toast.error("Cannot identify current user.");
      return;
    }

    try {
      setIsNotesLoading(true);
      const response = await documentNoteApi.getNotesByDocumentId(
        documentId,
        currentUserId,
      );
      setNotes(response.data ?? []);
    } catch (error) {
      console.error("Cannot load notes:", error);
      toast.error("Cannot load document notes.");
    } finally {
      setIsNotesLoading(false);
    }
  };

  useEffect(() => {
    if (!pptxBuffer || !pptxContainerRef.current) return;

    const container = pptxContainerRef.current;
    container.innerHTML = "";

    let isCancelled = false;

    const renderPptx = async () => {
      try {
        await PptxViewer.open(pptxBuffer, container, {
          zipLimits: RECOMMENDED_ZIP_LIMITS,
          listOptions: {
            windowed: true,
            initialSlides: 4,
            batchSize: 4,
          },
        });

        if (!isCancelled) {
          setPptxError("");
        }
      } catch (error) {
        console.error("Cannot render PPTX:", error);

        if (!isCancelled) {
          setPptxError("Cannot preview this PowerPoint file.");
        }
      }
    };

    renderPptx();

    return () => {
      isCancelled = true;
      container.innerHTML = "";
    };
  }, [pptxBuffer]);

  useEffect(() => {
    if (!documentId) {
      toast.error("Invalid document id.");
      navigate("/app/library");
      return;
    }

    if (!currentUserId) {
      toast.error("Please log in again to view this document.");
      navigate("/login");
      return;
    }

    let currentBlobUrl = "";

    const loadDocument = async () => {
      try {
        setIsLoading(true);

        let documentData: any = routeState.sharedDocument ?? {};

        if (!isSharedAccess) {
          const detailResponse = await documentApi.getDocumentById(documentId);
          documentData = detailResponse.data ?? {};
        } else if (!documentData || Object.keys(documentData).length === 0) {
          try {
            const detailResponse = await documentApi.getDocumentById(documentId);
            documentData = detailResponse.data ?? {};
          } catch (detailError: any) {
            console.warn("Cannot load shared document detail, using shared metadata:", detailError);
            documentData = routeState.sharedDocument ?? {};
          }
        }

        const isOwner = !isSharedAccess && isMyDocument(documentData, currentUserId);
        setCanManageShare(isOwner);

        if (isOwner) {
          await loadSharedUsers();
          await loadNotes();
        } else {
          setSharedUsers([]);
          setNotes([]);
        }

        const sharedFileUrl = getSharedDocumentFileUrl(documentData);
        const fileResponse = await documentApi.getDocumentFile(documentId);

        const contentTypeHeader = fileResponse.headers["content-type"];
        const contentType =
          typeof contentTypeHeader === "string"
            ? contentTypeHeader
            : getSharedDocumentContentType(documentData) || "application/octet-stream";

        const blob = new Blob([fileResponse.data], {
          type: contentType,
        });

        const previewFileName =
          documentData.title ||
          documentData.name ||
          documentData.originalName ||
          documentData.fileName ||
          `Document-${documentId}`;

        const isDocx =
          contentType ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          previewFileName.toLowerCase().endsWith(".docx");

        const isExcel = isExcelDocument(contentType, previewFileName);
        const isPptx = isPptxDocument(contentType, previewFileName);
        const isText = isTextDocument(contentType, previewFileName);
        const publicUrl = isPublicHttpUrl(documentData.fileUrl)
          ? documentData.fileUrl
          : "";

        if (isDocx && !publicUrl) {
          const arrayBuffer = await blob.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setDocxHtml(result.value);
          setExcelHtml("");
          setTextContent("");
          setPptxBuffer(null);
          setPptxError("");
        } else if (isExcel) {
          const arrayBuffer = await blob.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const html = XLSX.utils.sheet_to_html(worksheet);
          setExcelHtml(html);
          setDocxHtml("");
          setTextContent("");
          setPptxBuffer(null);
          setPptxError("");
        } else if (isPptx) {
          const arrayBuffer = await blob.arrayBuffer();
          setPptxBuffer(arrayBuffer);
          setDocxHtml("");
          setExcelHtml("");
          setTextContent("");
          setPptxError("");
        } else if (isText) {
          setTextContent(await blob.text());
          setDocxHtml("");
          setExcelHtml("");
          setPptxBuffer(null);
          setPptxError("");
        } else {
          setDocxHtml("");
          setExcelHtml("");
          setTextContent("");
          setPptxBuffer(null);
          setPptxError("");
        }

        currentBlobUrl = window.URL.createObjectURL(blob);

        setFileUrl(currentBlobUrl);
        setPublicFileUrl(publicUrl);
        setFileType(contentType);
        setPdfPageCount(0);
        setFileName(previewFileName);
      } catch (error: any) {
        console.error("Cannot preview document:", error);

        if (error?.response?.status === 403) {
          toast.error(
            isSharedAccess
              ? "You no longer have access to this shared document."
              : "You do not have permission to view this document.",
          );
          navigate(isSharedAccess ? "/app/shared-with-me" : "/app/library");
          return;
        }

        if (error?.response?.status === 404) {
          toast.error("Document not found.");
          navigate(isSharedAccess ? "/app/shared-with-me" : "/app/library");
          return;
        }

        toast.error(getErrorMessage(error, "Cannot preview document."));
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();

    return () => {
      if (currentBlobUrl) {
        window.URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [currentUserId, documentId, isSharedAccess, navigate]);

  const resetNoteForm = () => {
    setNoteTitle("");
    setNoteContent("");
    setEditingNoteId(null);
  };

  const handleSaveNote = async () => {
    if (!currentUserId) {
      toast.error("Cannot identify current user.");
      return;
    }

    if (!noteTitle.trim()) {
      toast.error("Please enter note title.");
      return;
    }

    if (!noteContent.trim()) {
      toast.error("Please enter note content.");
      return;
    }

    try {
      if (editingNoteId) {
        await documentNoteApi.updateNote(editingNoteId, {
          userId: currentUserId,
          title: noteTitle.trim(),
          content: noteContent.trim(),
        });

        toast.success("Note updated.");
      } else {
        await documentNoteApi.createNote({
          userId: currentUserId,
          documentId,
          title: noteTitle.trim(),
          content: noteContent.trim(),
        });

        toast.success("Note created.");
      }

      resetNoteForm();
      if (!editingNoteId) {
        setNotesPage(1);
      }
      await loadNotes();
    } catch (error) {
      console.error("Cannot save note:", error);
      toast.error("Cannot save note.");
    }
  };

  const handleEditNote = (note: DocumentNoteResponse) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
  };

  const handleDeleteNote = async () => {
    if (deleteNoteId === null) return;

    if (!currentUserId) {
      toast.error("Cannot identify current user.");
      return;
    }

    try {
      await documentNoteApi.deleteNote(deleteNoteId, currentUserId);
      toast.success("Note deleted.");

      if (editingNoteId === deleteNoteId) {
        resetNoteForm();
      }

      setDeleteNoteId(null);
      await loadNotes();
    } catch (error) {
      console.error("Cannot delete note:", error);
      toast.error("Cannot delete note.");
    }
  };

  const handleDownload = async () => {
    if (!canDownloadCurrentDocument) {
      toast.error("You only have view permission for this shared document.");
      return;
    }

    try {
      const response = await documentApi.downloadDocument(documentId);
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");

      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (error: any) {
      console.error("Cannot download document:", error);

      if (error?.response?.status === 403) {
        toast.error("You do not have permission to download this document.");
        return;
      }

      toast.error(getErrorMessage(error, "Cannot download document."));
    }
  };

  useEffect(() => {
    if (
      !documentId ||
      !currentUserId ||
      !fileName ||
      fileName === "Document"
    ) {
      return;
    }

    let cancelled = false;

    const storageKey = `document-preview-chat:${currentUserId}:${documentId}`;

    const initialMessage: ChatMessage = {
      id: Date.now(),
      role: "system",
      content: `AI is ready for this document: ${fileName}.`,
    };

    const restoreChatHistory = async () => {
      setChatInput("");

      const savedSessionId = localStorage.getItem(storageKey) || "";

      if (!savedSessionId) {
        setChatSessionId("");
        setChatMessages([initialMessage]);
        return;
      }

      try {
        setIsChatHistoryLoading(true);

        const response = await apiClient.get(
          `/api/chat/sessions/${savedSessionId}/messages`,
          {
            params: {
              userId: currentUserId,
            },
          },
        );

        const rawMessages =
          response.data?.content ??
          response.data?.messages ??
          response.data?.data ??
          response.data ??
          [];

        const restoredMessages: ChatMessage[] = Array.isArray(rawMessages)
          ? rawMessages
              .map((message: any, index: number): ChatMessage | null => {
                const role = String(message?.role ?? "").toUpperCase();
                const content =
                  typeof message?.content === "string"
                    ? message.content.trim()
                    : "";

                if (!content) return null;

                return {
                  id: Date.now() + index + 1,
                  role: role === "USER" ? "user" : "assistant",
                  content,
                };
              })
              .filter((message): message is ChatMessage => message !== null)
          : [];

        if (cancelled) return;

        setChatSessionId(savedSessionId);
        setChatMessages([initialMessage, ...restoredMessages]);
      } catch (error) {
        console.error("Cannot restore document chat history:", error);

        localStorage.removeItem(storageKey);

        if (!cancelled) {
          setChatSessionId("");
          setChatMessages([initialMessage]);
        }
      } finally {
        if (!cancelled) {
          setIsChatHistoryLoading(false);
        }
      }
    };

    void restoreChatHistory();

    return () => {
      cancelled = true;
    };
  }, [documentId, fileName, currentUserId]);

  const handleStartNewDocumentChat = () => {
    if (!currentUserId || !documentId) return;

    localStorage.removeItem(
      `document-preview-chat:${currentUserId}:${documentId}`,
    );

    setChatSessionId("");
    setChatInput("");
    setChatMessages([
      {
        id: Date.now(),
        role: "system",
        content: `AI is ready for this document: ${fileName}.`,
      },
    ]);

    toast.success("New document chat started.");
  };

  const addChatMessage = (message: Omit<ChatMessage, "id">) => {
    setChatMessages((currentMessages) => [
      ...currentMessages,
      {
        ...message,
        id: Date.now() + Math.random(),
      },
    ]);
  };

  const runAiAction = async (prompt: string) => {
    if (!currentUserId) {
      toast.error("Cannot identify current user.");
      return;
    }

    if (!documentId || Number.isNaN(documentId)) {
      toast.error("Invalid document id.");
      return;
    }

    const cleanPrompt = prompt.trim();

    if (!cleanPrompt || isAiLoading) return;

    addChatMessage({
      role: "user",
      content: cleanPrompt,
    });

    setChatInput("");
    setIsAiLoading(true);

    try {
      let sessionId = chatSessionId;

      // Use the same Chat Session API as AIChatPage.
      if (!sessionId) {
        const sessionResponse = await apiClient.post(
          "/api/chat/sessions",
          {
            userId: currentUserId,
            title: buildChatTitle(cleanPrompt),
          },
        );

        const createdSessionId =
          sessionResponse.data?.sessionId ??
          sessionResponse.data?.id ??
          "";

        sessionId = createdSessionId
          ? String(createdSessionId)
          : "";

        if (!sessionId) {
          throw new Error("Backend did not return a session ID.");
        }

        setChatSessionId(sessionId);

        localStorage.setItem(
          `document-preview-chat:${currentUserId}:${documentId}`,
          sessionId,
        );
      }

      // Send the actual user question to the same AI Chat API as AIChatPage.
      const response = await apiClient.post(
        "/api/chat/ask",
        {
          sessionId,
          userId: currentUserId,
          documentIds: [documentId],
          question: cleanPrompt,
        },
      );

      const answer =
        response.data?.answer ??
        response.data?.response ??
        response.data?.message ??
        "AI không có câu trả lời.";

      addChatMessage({
        role: "assistant",
        content: String(answer),
      });
    } catch (error) {
      console.error("Cannot send AI chat message:", error);

      addChatMessage({
        role: "assistant",
        content: getErrorMessage(
          error,
          "Cannot connect to AI. Please check whether the backend and AI service are running, and whether this document has finished AI processing.",
        ),
      });

      toast.error(
        getErrorMessage(error, "Cannot connect to AI."),
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  const renderPdfWithHighlight = () => {
    return (
      <div className="h-full overflow-auto bg-slate-50 p-4">
        <Document
          file={fileUrl}
          loading={
            <div className="flex h-80 items-center justify-center text-sm font-semibold text-slate-500">
              Loading PDF...
            </div>
          }
          error={
            <div className="flex h-80 items-center justify-center text-sm font-semibold text-red-500">
              Cannot load PDF.
            </div>
          }
          onLoadSuccess={({ numPages }) => setPdfPageCount(numPages)}
        >
          <div className="flex flex-col items-center gap-5">
            {Array.from(new Array(pdfPageCount), (_, index) => {
              const pageNumber = index + 1;

              return (
                <div
                  key={`pdf-page-${pageNumber}`}
                  className="overflow-hidden bg-white shadow-sm"
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={pdfScale}
                    renderAnnotationLayer
                    renderTextLayer
                    customTextRenderer={
                      keyword
                        ? ({ str }) => highlightPdfText(str, keyword)
                        : undefined
                    }
                  />
                </div>
              );
            })}
          </div>
        </Document>
      </div>
    );
  };

  const renderPreview = () => {
    if (!fileUrl) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-slate-500">
          <FileText className="mb-4 h-12 w-12" />
          <p className="text-sm font-semibold">No preview available.</p>
        </div>
      );
    }

    const isPowerPoint = isPowerPointDocument(fileType, fileName);
    const isPptx = isPptxDocument(fileType, fileName);

    if (isPowerPoint) {
      if (!isPptx) {
        return (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center text-slate-500">
            <FileText className="mb-4 h-14 w-14" />
            <h2 className="text-lg font-extrabold text-slate-900">
              PPT preview is not supported
            </h2>
            <p className="mt-2 max-w-md text-sm">
              Old .ppt files cannot be previewed in the browser. Please download
              the file or upload it as .pptx.
            </p>
            <button
              onClick={handleDownload}
              className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              Download file
            </button>
          </div>
        );
      }

      return (
        <div className="h-full overflow-auto bg-slate-50 p-3">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 border-b border-slate-200 pb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                PowerPoint Preview
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-slate-950">
                {fileName}
              </h2>
            </div>

            {pptxError ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center text-slate-500">
                <FileText className="mb-4 h-12 w-12" />
                <p className="text-sm font-bold">{pptxError}</p>
                <button
                  onClick={handleDownload}
                  className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                >
                  Download file
                </button>
              </div>
            ) : (
              <div
                ref={pptxContainerRef}
                className="pptx-preview min-h-[420px] overflow-auto"
              />
            )}
          </div>
        </div>
      );
    }

    if (fileType.startsWith("image/")) {
      return (
        <div className="flex h-full items-center justify-center overflow-auto bg-slate-50 p-6">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-h-full max-w-full rounded-xl object-contain shadow"
          />
        </div>
      );
    }

    if (fileType.startsWith("video/")) {
      return (
        <div className="flex h-full items-center justify-center bg-black">
          <video src={fileUrl} controls className="max-h-full max-w-full" />
        </div>
      );
    }

    if (fileType.startsWith("audio/")) {
      return (
        <div className="flex h-full items-center justify-center bg-slate-50">
          <audio src={fileUrl} controls className="w-full max-w-2xl" />
        </div>
      );
    }

    if (fileType === "application/pdf") {
      if (keyword) return renderPdfWithHighlight();

      return (
        <iframe
          src={fileUrl}
          title={fileName}
          className="h-full w-full border-0 bg-white"
        />
      );
    }

    if (excelHtml) {
      return (
        <div className="h-full overflow-auto bg-slate-50 p-3">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                  Spreadsheet Preview
                </p>
                <h2 className="mt-1 text-lg font-extrabold text-slate-950">
                  {fileName}
                </h2>
              </div>
            </div>

            <div
              className="excel-preview rounded-xl border border-slate-200 bg-white"
              dangerouslySetInnerHTML={{ __html: excelHtml }}
            />
          </div>
        </div>
      );
    }

    const isDocx =
      fileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.toLowerCase().endsWith(".docx");

    const officeViewerUrl =
      isDocx && publicFileUrl
        ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(
            publicFileUrl,
          )}`
        : "";

    if (isDocx && officeViewerUrl) {
      return (
        <iframe
          src={officeViewerUrl}
          title={fileName}
          className="h-full w-full border-0 bg-white"
        />
      );
    }

    if (docxHtml) {
      return (
        <div className="h-full overflow-auto bg-white p-3">
          <div
            className="docx-preview min-h-full w-full max-w-none bg-white px-6 py-8 text-slate-950"
            dangerouslySetInnerHTML={{ __html: highlightedDocxHtml }}
          />
        </div>
      );
    }

    if (isTextDocument(fileType, fileName)) {
      return (
        <div className="h-full overflow-auto bg-slate-50 p-4">
          <pre className="min-h-full whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-white p-6 font-mono text-sm leading-6 text-slate-800 shadow-sm">
            {textContent}
          </pre>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center text-slate-500">
        <FileText className="mb-4 h-14 w-14" />
        <h2 className="text-lg font-extrabold text-slate-900">
          Preview is not supported for this file type
        </h2>
        <p className="mt-2 max-w-md text-sm">
          This file type may not be viewable directly in the browser. You can
          download it instead.
        </p>
        <button
          onClick={handleDownload}
          className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          Download file
        </button>
      </div>
    );
  };

  const renderShareModal = () => {
    if (!isShareModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
        <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                Share Document
              </p>
              <h2 className="mt-1 text-xl font-extrabold text-slate-950 dark:text-white">
                {fileName}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setIsShareModalOpen(false)}
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
                value={shareEmails}
                onChange={(event) => setShareEmails(event.target.value)}
                placeholder="receiver@example.com, student@example.com"
                rows={5}
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <p className="mt-1 text-xs text-slate-500">
                Separate emails with commas, semicolons, or new lines.
              </p>
              </div>

              <div>
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Permission
                  </label>
                  <select
                    value={sharePermission}
                    onChange={(event) =>
                      setSharePermission(event.target.value as SharePermission)
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="VIEW">View only</option>
                    <option value="DOWNLOAD">Allow download</option>
                  </select>
                </div>
              </div>

              <div>
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Expiration date
                  </label>
                  <input
                    type="date"
                    value={shareExpiresAt}
                    onChange={(event) => setShareExpiresAt(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Leave empty for no expiration.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isShareSubmitting}
                onClick={handleSubmitDocumentShare}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Share2 className="h-4 w-4" />
                {isShareSubmitting ? "Sharing..." : "Share document"}
              </button>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <div>
                  <h3 className="font-extrabold text-slate-950 dark:text-white">
                    Shared users
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={loadSharedUsers}
                  disabled={isSharedUsersLoading}
                  className="text-xs font-bold text-blue-600 disabled:opacity-60"
                >
                  Refresh
                </button>
              </div>

              {isSharedUsersLoading ? (
                <p className="p-6 text-sm font-semibold text-slate-500">
                  Loading shared users...
                </p>
              ) : sharedUsers.length === 0 ? (
                <div className="m-4 rounded-2xl border border-dashed border-slate-300 p-6 text-center">
                  <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                  <p className="text-sm font-bold text-slate-700">
                    This document has not been shared yet.
                  </p>
                </div>
              ) : (
                <div className="flex h-[calc(100%-53px)] flex-col">
                  <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedSharedUsers.map((user) => (
                    <div
                      key={`${user.shareId}-${user.userId}`}
                      className="bg-white p-4 dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-slate-950">
                            {user.fullName || user.email}
                          </p>
                          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                            {user.email}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRevokeDocumentShare(user.userId)}
                          className="rounded-xl bg-red-50 px-3 py-2 text-xs font-extrabold text-red-600 hover:bg-red-100"
                        >
                          Revoke
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                          {user.permission === "DOWNLOAD"
                            ? "Allow download"
                            : "View only"}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                          {user.status || "ACTIVE"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                          {formatDateTimeLabel(user.expiresAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                  </div>

                  <div className="border-t border-slate-100 px-4 pb-4 dark:border-slate-800">
                    <PaginationControls
                      currentPage={sharedUsersPage}
                      totalItems={sharedUsers.length}
                      pageSize={SHARED_USERS_PAGE_SIZE}
                      onPageChange={setSharedUsersPage}
                    />
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    );
  };

  const quickPrompts: QuickPrompt[] = [
    {
      icon: <Sparkles className="h-4 w-4 text-blue-500" />,
      label: "Explain the difficult parts",
    },
    {
      icon: <Pencil className="h-4 w-4 text-orange-500" />,
      label: "Generate short summary",
    },
  ];

  const renderChatContent = (isDocked = false) => {
    return (
      <div className="flex h-full min-h-0 flex-col bg-slate-50">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
          <button className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
            <Bot className="h-5 w-5 text-slate-500" />
            Chat
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleStartNewDocumentChat}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-blue-700"
              title="Start a new chat for this document"
            >
              <Plus className="h-4 w-4" />
              New
            </button>

            {!isDocked && (
              <button
                onClick={() => setChatMode("docked")}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                title="Dock chat"
              >
                <PanelRightOpen className="h-4 w-4" />
              </button>
            )}
            {isDocked && (
              <button
                onClick={() => setChatMode("floating")}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                title="Float chat"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setChatMode(isDocked ? "floating" : "docked")}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              title="Resize chat"
            >
              {isDocked ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => setChatMode("collapsed")}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              title="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4 py-5 sm:px-5 sm:py-6">
          <div className="mx-auto flex w-full max-w-[420px] flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200">
              <Bot className="h-9 w-9" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
              Hello, I'm AI Study Hub
            </h2>

            <div className="mt-4 flex flex-col items-center gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt.label}
                  type="button"
                  onClick={() => runAiAction(prompt.label)}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  {prompt.icon}
                  {prompt.label}
                </button>
              ))}
            </div>

            <div className="mt-4 w-full space-y-3 text-left">
              {isChatHistoryLoading && (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                  Loading previous chat history...
                </div>
              )}

              {chatMessages.map((message) => {
                const isUserMessage = message.role === "user";
                const isSystemMessage = message.role === "system";

                return (
                  <div
                    key={message.id}
                    className={`overflow-hidden rounded-2xl px-4 py-3 text-sm ${
                      isUserMessage
                        ? "ml-8 bg-blue-600 text-white"
                        : isSystemMessage
                          ? "border border-slate-200 bg-slate-100 text-slate-500"
                          : "mr-8 border border-slate-200 bg-white text-slate-700 shadow-sm"
                    }`}
                  >
                    {isUserMessage || isSystemMessage ? (
                      <p className="whitespace-pre-wrap break-words leading-6">
                        {message.content}
                      </p>
                    ) : (
                      <div className="min-w-0 break-words leading-6">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => (
                              <p className="mb-2 whitespace-pre-wrap leading-6 last:mb-0">
                                {children}
                              </p>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-extrabold text-slate-900">
                                {children}
                              </strong>
                            ),
                            em: ({ children }) => (
                              <em className="italic text-slate-700">
                                {children}
                              </em>
                            ),
                            ul: ({ children }) => (
                              <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="leading-6">{children}</li>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote className="my-2 border-l-4 border-blue-200 bg-blue-50 px-3 py-2 text-slate-600">
                                {children}
                              </blockquote>
                            ),
                            h1: ({ children }) => (
                              <h1 className="mb-2 mt-3 text-lg font-extrabold text-slate-950 first:mt-0">
                                {children}
                              </h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="mb-2 mt-3 text-base font-extrabold text-slate-950 first:mt-0">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="mb-1.5 mt-3 text-sm font-extrabold text-slate-900 first:mt-0">
                                {children}
                              </h3>
                            ),
                            code: ({ children, className }) => {
                              const isBlock = Boolean(className);

                              return isBlock ? (
                                <code className="block overflow-x-auto whitespace-pre rounded-xl bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100">
                                  {children}
                                </code>
                              ) : (
                                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.92em] text-slate-800">
                                  {children}
                                </code>
                              );
                            },
                            pre: ({ children }) => (
                              <pre className="my-2 overflow-x-auto rounded-xl bg-slate-950 p-0">
                                {children}
                              </pre>
                            ),
                            a: ({ children, href }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="font-bold text-blue-600 underline underline-offset-2 hover:text-blue-700"
                              >
                                {children}
                              </a>
                            ),
                            table: ({ children }) => (
                              <div className="my-3 overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full border-collapse text-left text-xs">
                                  {children}
                                </table>
                              </div>
                            ),
                            th: ({ children }) => (
                              <th className="border-b border-r border-slate-200 bg-slate-50 px-3 py-2 font-extrabold text-slate-800 last:border-r-0">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="border-b border-r border-slate-100 px-3 py-2 align-top last:border-r-0">
                                {children}
                              </td>
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                );
              })}

              {isAiLoading && (
                <div className="mr-8 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200">
                  AI is working with this document...
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-slate-50 p-4">
          <div className="rounded-2xl border-2 border-blue-300 bg-white p-3 shadow-lg shadow-blue-100">
            <div className="flex items-center gap-2">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    runAiAction(chatInput);
                  }
                }}
                placeholder="Ask about this document..."
                className="h-10 min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                disabled={isAiLoading || !chatInput.trim()}
                onClick={() => runAiAction(chatInput)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNotesPanel = () => {
    return (
      <div className="flex h-full min-h-0 flex-col bg-white">
        <div className="min-h-0 flex-1 overflow-auto px-8 py-6">
          <p className="text-sm font-semibold text-slate-400">
            Take your own notes here
          </p>

          <div className="mt-6 max-w-2xl">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-blue-600" />
                <h2 className="text-sm font-extrabold text-slate-950">
                  Document Notes
                </h2>
              </div>

              <input
                value={noteTitle}
                onChange={(event) => setNoteTitle(event.target.value)}
                placeholder="Note title"
                className="mb-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500"
              />

              <textarea
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
                placeholder="Write your note..."
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500"
              />

              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleSaveNote}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700"
                >
                  {editingNoteId ? (
                    <>
                      <Save className="h-4 w-4" />
                      Save
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Note
                    </>
                  )}
                </button>

                {editingNoteId && (
                  <button
                    onClick={resetNoteForm}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {isNotesLoading ? (
                <p className="text-sm font-semibold text-slate-500">
                  Loading notes...
                </p>
              ) : notes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
                  <StickyNote className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                  <p className="text-sm font-bold text-slate-700">
                    No notes yet
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Add your first note for this document.
                  </p>
                </div>
              ) : (
                <>
                {paginatedNotes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-extrabold text-slate-950">
                          {note.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(
                            note.updatedAt || note.createdAt,
                          ).toLocaleString("en-US", {
                            hour12: false,
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => handleEditNote(note)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteNoteId(note.id)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {note.content}
                    </p>
                  </div>
                ))}

                <PaginationControls
                  currentPage={notesPage}
                  totalItems={notes.length}
                  pageSize={NOTES_PAGE_SIZE}
                  onPageChange={setNotesPage}
                />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStudyPanel = () => {
    return renderNotesPanel();
  };

  const notesPanelWidth = "minmax(280px, 0.8fr)";
  const previewPanelWidth = "minmax(0, 1.55fr)";
  const chatPanelWidth = "minmax(300px, 0.9fr)";
  const pageGridColumns = (() => {
    if (activePanel === "document") {
      return chatMode === "docked"
        ? `${previewPanelWidth} ${chatPanelWidth}`
        : previewPanelWidth;
    }

    if (activePanel === "notes") {
      return chatMode === "docked"
        ? `minmax(0, 1fr) ${chatPanelWidth}`
        : "minmax(0, 1fr)";
    }

    return chatMode === "docked"
      ? `${previewPanelWidth} ${notesPanelWidth} ${chatPanelWidth}`
      : `${previewPanelWidth} ${notesPanelWidth}`;
  })();

  return (
    <div className="-mt-6 flex h-[calc(100vh-5.5rem)] flex-col overflow-hidden bg-white text-slate-900 md:-mt-8 md:h-[calc(100vh-6rem)]">
      <style>{`
        .docx-preview {
          font-family: "Times New Roman", Times, serif;
          font-size: 16px;
          line-height: 1.45;
        }

        .docx-preview p { margin: 0 0 8px; }
        .docx-preview h1 { font-size: 28px; font-weight: 700; margin: 18px 0 10px; }
        .docx-preview h2 { font-size: 22px; font-weight: 700; margin: 16px 0 8px; }
        .docx-preview h3 { font-size: 18px; font-weight: 700; margin: 14px 0 6px; }
        .docx-preview table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        .docx-preview th, .docx-preview td { border: 1px solid #d1d5db; padding: 6px 8px; vertical-align: top; }
        .docx-preview ul, .docx-preview ol { margin: 8px 0 8px 24px; }

        .docx-search-highlight,
        .pdf-search-highlight {
          background: #fde047;
          color: #713f12;
          border-radius: 3px;
          padding: 0 2px;
          font-weight: 700;
        }

        .react-pdf__Page { position: relative; }
        .react-pdf__Page__textContent { pointer-events: auto; }
        .react-pdf__Page__textContent mark {
          background: #fde047;
          color: #713f12;
          border-radius: 3px;
          padding: 0 2px;
          font-weight: 700;
        }

        .pptx-preview section,
        .pptx-preview .slide {
          margin: 0 auto 24px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18);
        }
      `}</style>

      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-extrabold text-slate-700 shadow-sm hover:bg-slate-50"
          title={`Back to ${routeState.returnLabel || "Library"}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {canManageShare && (
          <button
            type="button"
            onClick={() => {
              setIsShareModalOpen(true);
              loadSharedUsers();
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-blue-200/70 hover:bg-blue-700"
            title="Share document"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        )}
      </div>

      <main
        className="min-h-0 flex-1 overflow-hidden"
        style={{
          display: "grid",
          gridTemplateColumns: pageGridColumns,
        }}
      >
        {activePanel !== "notes" && (
          <section className="relative min-w-0 min-h-0 overflow-hidden border-r border-slate-100 bg-white">
            <div className="h-full min-h-0">
              {isLoading ? (
                <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
                  Loading preview...
                </div>
              ) : (
                renderPreview()
              )}
            </div>
          </section>
        )}

        {activePanel !== "document" && (
          <section className="relative min-w-0 min-h-0 overflow-hidden border-r border-slate-100 bg-white">
            {renderStudyPanel()}
          </section>
        )}

        {chatMode === "docked" && (
          <aside className="min-w-0 min-h-0 overflow-hidden bg-slate-50">
            {renderChatContent(true)}
          </aside>
        )}
      </main>

      <div className="pointer-events-none fixed bottom-8 left-1/2 z-30 -translate-x-1/2">
        <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-200/80">
          {(
            [
              ["document", "Document"],
              ["notes", "Notes"],
              ["split", "Split Screen"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setActivePanel(value)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                activePanel === value
                  ? "bg-violet-50 text-violet-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {renderShareModal()}

      {chatMode === "collapsed" && (
        <button
          onClick={() => setChatMode("floating")}
          className="fixed right-5 top-1/2 z-40 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-700 shadow-xl ring-1 ring-slate-200 hover:scale-105 hover:text-blue-600"
          title="Open chat"
        >
          <Bot className="h-7 w-7" />
        </button>
      )}

      {chatMode === "floating" && (
        <div className="fixed bottom-20 right-6 top-24 z-40 w-[min(440px,calc(100vw-3rem))] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/70">
          {renderChatContent(false)}
        </div>
      )}

      {deleteNoteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <Trash2 className="h-6 w-6" />
            </div>

            <h2 className="text-lg font-extrabold text-slate-950">
              Delete note?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              This note will be permanently deleted. This action cannot be
              undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteNoteId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteNote}
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