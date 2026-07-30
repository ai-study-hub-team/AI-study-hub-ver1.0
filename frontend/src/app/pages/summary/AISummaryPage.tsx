import {
  Sparkles,
  Download,
  FileText,
  ChevronRight,
  CheckCircle2,
  Brain,
  Tag,
  Copy,
  RefreshCw,
  History,
  Share2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { documentApi } from "../../services/documentApi";
import {
  generateSummaryApi,
  getSummaryByDocumentApi,
  getSummariesApi,
  type SummaryType,
} from "../../services/aiApi";

import { getCurrentUserId } from "../../services/apiClient";
import { useCreatePublicLink } from "../../hooks/useCreatePublicLink";

/* =========================================================
   CONSTANTS
========================================================= */

const DISPLAY_LIMIT = 6;

/* =========================================================
   TYPES
========================================================= */

type DocumentItem = {
  id: number;

  name?: string;
  title?: string;
  fileName?: string;

  processStatus?: string;
  aiStatus?: string;

  [key: string]: unknown;
};

type KeyConcept = {
  term: string;
  definition: string;
};

type SummaryData = {
  summaryId?: number;
  id?: number;

  documentId?: number;
  documentTitle?: string;

  title?: string;
  summaryType?: SummaryType;

  summaryText: string;

  keyTakeaways?: string[];
  keyConcepts?: KeyConcept[];
  insights?: string[];

  createdAt?: string;
};

/* =========================================================
   DEFAULT SUMMARY
========================================================= */

const defaultSummary: SummaryData = {
  title: "AI Summary",
  documentTitle: "",

  summaryText:
    "Click Generate Summary to create an AI summary for this document.",

  keyTakeaways: [],
  keyConcepts: [],
  insights: [],
};

/* =========================================================
   SUMMARY TYPE OPTIONS
========================================================= */

const summaryTypeOptions: {
  value: SummaryType;
  label: string;
  desc: string;
}[] = [
  {
    value: "SHORT",
    label: "Short",
    desc: "Quick and concise summary",
  },
  {
    value: "DETAILED",
    label: "Detailed",
    desc: "Longer summary with more explanation",
  },
  {
    value: "BULLET_POINTS",
    label: "Bullet Points",
    desc: "Main ideas in bullet format",
  },
];

/* =========================================================
   HELPERS
========================================================= */

const getDocumentName = (doc?: DocumentItem | null) => {
  if (!doc) {
    return "Untitled Document";
  }

  return (
    doc.name ||
    doc.title ||
    doc.fileName ||
    "Untitled Document"
  );
};

const getErrorMessage = (
  error: any,
  fallback: string,
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

/* =========================================================
   COMPONENT
========================================================= */

export function AISummaryPage() {
  /* ---------------------------------------------------------
     VIEW
  --------------------------------------------------------- */

  const [view, setView] =
    useState<"summary" | "history">("summary");

  /* ---------------------------------------------------------
     DOCUMENTS
  --------------------------------------------------------- */

  const [documents, setDocuments] =
    useState<DocumentItem[]>([]);

  const [selectedDoc, setSelectedDoc] =
    useState<DocumentItem | null>(null);

  const [showAllDocuments, setShowAllDocuments] =
    useState(false);

  /* ---------------------------------------------------------
     SUMMARY
  --------------------------------------------------------- */

  const [summaryType, setSummaryType] =
    useState<SummaryType>("SHORT");

  const [summaryData, setSummaryData] =
    useState<SummaryData>(defaultSummary);

  const [summaryHistory, setSummaryHistory] =
    useState<SummaryData[]>([]);

  const [showSummary, setShowSummary] =
    useState(false);

  const [isGenerating, setIsGenerating] =
    useState(false);

  const [isLoadingHistory, setIsLoadingHistory] =
    useState(false);

  const [isLoadingExistingSummary, setIsLoadingExistingSummary] =
    useState(false);

  /* ---------------------------------------------------------
     SHARE DOCUMENT
  --------------------------------------------------------- */

  const {
    createAndCopyPublicLink,
    loadingDocumentId,
  } = useCreatePublicLink();

  /* ---------------------------------------------------------
     VISIBLE DOCUMENTS
  --------------------------------------------------------- */

  const visibleDocuments = showAllDocuments
    ? documents
    : documents.slice(0, DISPLAY_LIMIT);

  /* =========================================================
     LOAD DOCUMENTS
  ========================================================= */

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        /*
         * Document API hiện tại vẫn đang yêu cầu userId.
         *
         * Chỉ Summary / Quiz đã chuyển ownership sang JWT.
         */
        const userId = getCurrentUserId();

        if (!userId) {
          toast.error("Please login again.");
          return;
        }

        const data =
          await documentApi.getAiReadyDocumentsForSelect(
            userId,
          );

        const documentList = Array.isArray(data)
          ? data
          : [];

        setDocuments(documentList);

        if (documentList.length > 0) {
          setSelectedDoc(documentList[0]);
        }
      } catch (error: any) {
        console.error(
          "Load documents failed:",
          error,
        );

        toast.error(
          getErrorMessage(
            error,
            "Cannot load uploaded documents",
          ),
        );
      }
    };

    void fetchDocuments();
  }, []);

  /* =========================================================
     SELECT DOCUMENT
  ========================================================= */

  const handleSelectDocument = async (
    doc: DocumentItem,
  ) => {
    setSelectedDoc(doc);

    setView("summary");

    setShowSummary(false);
    setSummaryData(defaultSummary);

    setIsLoadingExistingSummary(true);

    try {
      /*
       * JWT ownership:
       *
       * Không còn:
       * getSummaryByDocumentApi(doc.id, userId)
       *
       * Chỉ gửi documentId.
       */
      const response =
        await getSummaryByDocumentApi(doc.id);

      const data = response.data;

      /*
       * Backend có thể trả:
       *
       * Summary object
       *
       * hoặc
       *
       * Summary[]
       *
       * Xử lý cả hai để FE an toàn hơn.
       */
      const summaries: SummaryData[] =
        Array.isArray(data)
          ? data
          : data
            ? [data]
            : [];

      if (summaries.length === 0) {
        return;
      }

      const latestSummary = summaries[0];

      setSummaryData({
        ...defaultSummary,
        ...latestSummary,
      });

      if (latestSummary.summaryType) {
        setSummaryType(latestSummary.summaryType);
      }

      setShowSummary(true);
    } catch (error: any) {
      /*
       * 404 có thể đơn giản là document
       * chưa có summary.
       */
      if (error?.response?.status === 404) {
        console.log(
          "No summary found for document:",
          doc.id,
        );

        return;
      }

      console.error(
        "Load document summary failed:",
        error,
      );
    } finally {
      setIsLoadingExistingSummary(false);
    }
  };

  /* =========================================================
     SUMMARY HISTORY
  ========================================================= */

  const fetchSummaryHistory = async () => {
    setIsLoadingHistory(true);

    try {
      /*
       * JWT ownership.
       *
       * Không còn:
       * getSummariesApi(userId)
       */
      const response =
        await getSummariesApi();

      const history = Array.isArray(response.data)
        ? response.data
        : [];

      setSummaryHistory(history);
      setView("history");
    } catch (error: any) {
      console.error(
        "Load summary history failed:",
        error,
      );

      toast.error(
        getErrorMessage(
          error,
          "Cannot load summary history",
        ),
      );
    } finally {
      setIsLoadingHistory(false);
    }
  };

  /* =========================================================
     GENERATE SUMMARY
  ========================================================= */

  const handleGenerate = async () => {
    if (!selectedDoc) {
      toast.error(
        "Please select a document first",
      );

      return;
    }

    const processStatus =
      selectedDoc.processStatus ||
      selectedDoc.aiStatus;

    if (
      processStatus &&
      processStatus !== "PROCESSED"
    ) {
      toast.error(
        "This document is not processed yet. Please wait until AI Status is PROCESSED.",
      );

      return;
    }

    setIsGenerating(true);

    setShowSummary(false);
    setView("summary");

    try {
      /*
       * API MỚI:
       *
       * generateSummaryApi(
       *   documentId,
       *   summaryType,
       * )
       *
       * Không gửi userId.
       */
      const response =
        await generateSummaryApi(
          selectedDoc.id,
          summaryType,
        );

      const generatedSummary =
        response.data as SummaryData;

      setSummaryData({
        ...defaultSummary,
        ...generatedSummary,
      });

      setShowSummary(true);

      toast.success(
        "Summary generated successfully!",
      );
    } catch (error: any) {
      console.error(
        "Generate summary failed:",
        error,
      );

      toast.error(
        getErrorMessage(
          error,
          "Generate summary failed",
        ),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  /* =========================================================
     DOWNLOAD SUMMARY
  ========================================================= */

  const handleDownload = () => {
    const text =
      summaryData.summaryText || "";

    if (!text.trim()) {
      toast.error(
        "There is no summary to download.",
      );

      return;
    }

    const blob = new Blob(
      [text],
      {
        type: "text/plain;charset=utf-8",
      },
    );

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    anchor.href = url;

    anchor.download = `${
      summaryData.documentTitle ||
      getDocumentName(selectedDoc) ||
      "summary"
    }.txt`;

    document.body.appendChild(anchor);

    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);

    toast.success(
      "Summary downloaded!",
    );
  };

  /* =========================================================
     COPY SUMMARY
  ========================================================= */

  const handleCopy = async () => {
    const text =
      summaryData.summaryText || "";

    if (!text.trim()) {
      toast.error(
        "There is no summary to copy.",
      );

      return;
    }

    try {
      await navigator.clipboard.writeText(
        text,
      );

      toast.success(
        "Copied to clipboard!",
      );
    } catch (error) {
      console.error(
        "Copy failed:",
        error,
      );

      toast.error(
        "Cannot copy summary.",
      );
    }
  };

  /* =========================================================
     OPEN HISTORY ITEM
  ========================================================= */

  const openHistoryItem = (
    summary: SummaryData,
  ) => {
    setSummaryData({
      ...defaultSummary,
      ...summary,
    });

    if (summary.summaryType) {
      setSummaryType(
        summary.summaryType,
      );
    }

    /*
     * Nếu tìm thấy document tương ứng
     * thì cập nhật selectedDoc.
     */
    if (summary.documentId) {
      const matchedDocument =
        documents.find(
          (doc) =>
            doc.id ===
            summary.documentId,
        );

      if (matchedDocument) {
        setSelectedDoc(
          matchedDocument,
        );
      }
    }

    setShowSummary(true);
    setView("summary");
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="space-y-8">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            AI Summary
          </h1>

          <p className="text-slate-500 dark:text-slate-400">
            Generate intelligent summaries
            from your study materials
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void fetchSummaryHistory();
            }}
            disabled={isLoadingHistory}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            {isLoadingHistory ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <History className="h-4 w-4" />
            )}

            History
          </button>

          {showSummary && (
            <>
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <Download className="h-4 w-4" />

                Download
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleCopy();
                }}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white hover:bg-blue-700"
              >
                <Copy className="h-4 w-4" />

                Copy
              </button>
            </>
          )}
        </div>
      </div>

      {/* =====================================================
          MAIN GRID
      ===================================================== */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ===================================================
            LEFT
        =================================================== */}

        <div className="space-y-5">
          {/* DOCUMENT SELECT */}

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Select Document
            </h2>

            <div className="space-y-2">
              {documents.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No uploaded documents
                  found.
                </p>
              ) : (
                <>
                  {visibleDocuments.map(
                    (doc) => {
                      const docName =
                        getDocumentName(
                          doc,
                        );

                      const processStatus =
                        doc.processStatus ||
                        doc.aiStatus;

                      const isProcessed =
                        !processStatus ||
                        processStatus ===
                          "PROCESSED";

                      const isSelected =
                        selectedDoc?.id ===
                        doc.id;

                      return (
                        <div
                          key={doc.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            void handleSelectDocument(
                              doc,
                            );
                          }}
                          onKeyDown={(
                            event,
                          ) => {
                            if (
                              event.key ===
                                "Enter" ||
                              event.key ===
                                " "
                            ) {
                              event.preventDefault();

                              void handleSelectDocument(
                                doc,
                              );
                            }
                          }}
                          className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all ${
                            isSelected
                              ? "border-blue-500 bg-blue-50/30 dark:bg-blue-500/10"
                              : "border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                          }`}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800">
                            <FileText className="h-4 w-4 text-slate-500" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                              {
                                docName
                              }
                            </p>

                            {processStatus && (
                              <p
                                className={`text-[11px] font-semibold ${
                                  isProcessed
                                    ? "text-emerald-600"
                                    : "text-amber-600"
                                }`}
                              >
                                AI Status:{" "}
                                {
                                  processStatus
                                }
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(
                              event,
                            ) => {
                              event.stopPropagation();

                              createAndCopyPublicLink(
                                doc.id,
                              );
                            }}
                            disabled={
                              loadingDocumentId ===
                              doc.id
                            }
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                            title="Share document"
                            aria-label={`Share ${docName}`}
                          >
                            <Share2
                              className={`h-4 w-4 ${
                                loadingDocumentId ===
                                doc.id
                                  ? "animate-pulse"
                                  : ""
                              }`}
                            />
                          </button>
                        </div>
                      );
                    },
                  )}

                  {documents.length >
                    DISPLAY_LIMIT && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowAllDocuments(
                          (current) =>
                            !current,
                        )
                      }
                      className="mt-3 w-full rounded-2xl border border-dashed border-blue-300 py-3 font-semibold text-blue-600 transition hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    >
                      {showAllDocuments
                        ? "Thu gọn"
                        : `Xem thêm`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* SUMMARY TYPE */}

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Summary Type
            </h2>

            <div className="space-y-2">
              {summaryTypeOptions.map(
                (option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setSummaryType(
                        option.value,
                      )
                    }
                    disabled={
                      isGenerating
                    }
                    className={`w-full rounded-2xl border-2 p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                      summaryType ===
                      option.value
                        ? "border-blue-500 bg-blue-50/30 dark:bg-blue-500/10"
                        : "border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    }`}
                  >
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {
                        option.label
                      }
                    </p>

                    <p className="text-xs text-slate-500">
                      {
                        option.desc
                      }
                    </p>
                  </button>
                ),
              )}
            </div>
          </div>

          {/* GENERATE BUTTON */}

          <button
            type="button"
            onClick={() => {
              void handleGenerate();
            }}
            disabled={
              isGenerating ||
              isLoadingExistingSummary ||
              !selectedDoc
            }
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-extrabold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />

                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />

                Generate Summary
              </>
            )}
          </button>
        </div>

        {/* ===================================================
            RIGHT
        =================================================== */}

        <div className="lg:col-span-2">
          {/* =================================================
              HISTORY
          ================================================= */}

          {view === "history" ? (
            <div className="space-y-4">
              {summaryHistory.length ===
              0 ? (
                <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                  <History className="mx-auto mb-4 h-10 w-10 text-slate-400" />

                  <p className="text-slate-500">
                    No summary history
                    found.
                  </p>
                </div>
              ) : (
                summaryHistory.map(
                  (summary, index) => (
                    <button
                      type="button"
                      key={
                        summary.summaryId ||
                        summary.id ||
                        `${summary.documentId}-${summary.createdAt}-${index}`
                      }
                      onClick={() =>
                        openHistoryItem(
                          summary,
                        )
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-blue-500 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900 dark:text-white">
                            {summary.documentTitle ||
                              "Untitled Document"}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {summary.summaryType ||
                              "Summary"}

                            {summary.createdAt
                              ? ` · ${new Date(
                                  summary.createdAt,
                                ).toLocaleString()}`
                              : ""}
                          </p>
                        </div>

                        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                      </div>
                    </button>
                  ),
                )
              )}
            </div>
          ) : (
            /* ===============================================
               SUMMARY VIEW
            =============================================== */

            <AnimatePresence mode="wait">
              {/* LOADING GENERATION */}

              {isGenerating ? (
                <motion.div
                  key="generating"
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  className="flex min-h-[400px] flex-col items-center justify-center rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <RefreshCw className="mb-5 h-8 w-8 animate-spin text-blue-600" />

                  <h3 className="mb-2 text-xl font-extrabold text-slate-900 dark:text-white">
                    Analyzing
                    Document...
                  </h3>

                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    AI is reading and
                    summarizing{" "}
                    {getDocumentName(
                      selectedDoc,
                    )}
                  </p>
                </motion.div>
              ) : isLoadingExistingSummary ? (
                /* LOAD EXISTING SUMMARY */

                <motion.div
                  key="loading-existing"
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  className="flex min-h-[400px] flex-col items-center justify-center rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <RefreshCw className="mb-5 h-8 w-8 animate-spin text-blue-600" />

                  <p className="text-sm text-slate-500">
                    Loading existing
                    summary...
                  </p>
                </motion.div>
              ) : showSummary ? (
                /* ===========================================
                   SUMMARY RESULT
                =========================================== */

                <motion.div
                  key="summary"
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -10,
                  }}
                  className="space-y-5"
                >
                  {/* SUMMARY TEXT */}

                  <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-blue-600" />

                          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                            {summaryData.summaryType ||
                              "AI Summary"}
                          </span>
                        </div>

                        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                          {summaryData.documentTitle ||
                            getDocumentName(
                              selectedDoc,
                            )}
                        </h2>
                      </div>

                      <div className="shrink-0 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:bg-emerald-500/10">
                        AI Generated
                      </div>
                    </div>

                    <div className="leading-relaxed text-slate-700 dark:text-slate-300">
                      <ReactMarkdown
                        remarkPlugins={[
                          remarkGfm,
                        ]}
                        components={{
                          p: ({
                            children,
                          }) => (
                            <p className="mb-3 text-slate-700 dark:text-slate-300">
                              {children}
                            </p>
                          ),

                          strong: ({
                            children,
                          }) => (
                            <strong className="font-extrabold text-slate-900 dark:text-white">
                              {children}
                            </strong>
                          ),

                          ul: ({
                            children,
                          }) => (
                            <ul className="mb-4 list-disc space-y-2 pl-6">
                              {children}
                            </ul>
                          ),

                          ol: ({
                            children,
                          }) => (
                            <ol className="mb-4 list-decimal space-y-2 pl-6">
                              {children}
                            </ol>
                          ),

                          li: ({
                            children,
                          }) => (
                            <li className="text-slate-700 dark:text-slate-300">
                              {children}
                            </li>
                          ),

                          code: ({
                            children,
                          }) => (
                            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm text-blue-600 dark:bg-slate-800 dark:text-blue-400">
                              {children}
                            </code>
                          ),
                        }}
                      >
                        {summaryData.summaryText ||
                          ""}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* KEY TAKEAWAYS */}

                  {!!summaryData
                    .keyTakeaways
                    ?.length && (
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <h3 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />

                        Key Takeaways
                      </h3>

                      {summaryData.keyTakeaways.map(
                        (
                          point,
                          index,
                        ) => (
                          <div
                            key={`${index}-${point}`}
                            className="mb-3 flex items-start gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800"
                          >
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-extrabold text-emerald-600 dark:bg-emerald-500/20">
                              {index +
                                1}
                            </div>

                            <p className="text-sm text-slate-700 dark:text-slate-300">
                              {
                                point
                              }
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  )}

                  {/* KEY CONCEPTS */}

                  {!!summaryData
                    .keyConcepts
                    ?.length && (
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <h3 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
                        <Brain className="h-5 w-5 text-purple-500" />

                        Key Concepts &
                        Definitions
                      </h3>

                      {summaryData.keyConcepts.map(
                        (
                          concept,
                          index,
                        ) => (
                          <div
                            key={`${concept.term}-${index}`}
                            className="mb-3 flex gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700"
                          >
                            <Tag className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />

                            <div>
                              <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                                {
                                  concept.term
                                }
                              </p>

                              <p className="text-sm text-slate-500">
                                {
                                  concept.definition
                                }
                              </p>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}

                  {/* INSIGHTS */}

                  {!!summaryData.insights
                    ?.length && (
                    <div className="rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white">
                      <div className="mb-4 flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />

                        <h3 className="text-lg font-extrabold">
                          AI Study
                          Insights
                        </h3>
                      </div>

                      {summaryData.insights.map(
                        (
                          insight,
                          index,
                        ) => (
                          <div
                            key={`${index}-${insight}`}
                            className="mb-3 flex items-start gap-3 rounded-2xl bg-white/10 p-3"
                          >
                            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" />

                            <p className="text-sm">
                              {
                                insight
                              }
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </motion.div>
              ) : (
                /* ===========================================
                   EMPTY
                =========================================== */

                <motion.div
                  key="empty"
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  className="flex min-h-[400px] flex-col items-center justify-center rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <Sparkles className="mb-4 h-10 w-10 text-blue-600" />

                  <h3 className="mb-2 text-xl font-extrabold text-slate-900 dark:text-white">
                    Ready to generate
                    summary
                  </h3>

                  <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
                    Select a document,
                    choose summary type,
                    and click Generate
                    Summary.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}